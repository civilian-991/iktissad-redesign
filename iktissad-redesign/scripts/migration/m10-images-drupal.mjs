/**
 * M10 — Upload Drupal images from server filesystem → Supabase Storage
 * Then update articles.featured_image with the new Supabase URLs
 * - Reads image files directly from the Windows server via SSH (SFTP)
 * - Uploads to Supabase Storage bucket 'articles'
 * - Tracks progress in scripts/migration/progress-images-drupal.json
 * - Can be interrupted and resumed safely
 *
 * Usage:
 *   node scripts/migration/m10-images-drupal.mjs
 *   node scripts/migration/m10-images-drupal.mjs --limit 100
 */
import { createRequire } from 'module';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });

const require = createRequire(import.meta.url);
const { Client: SSH2Client } = require('ssh2');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PROGRESS_FILE = resolve(__dirname, 'progress-images-drupal.json');
const DRUPAL_FILES_PATH = 'C:\\Inetpub\\vhosts\\iktissadonline.com\\httpdocs\\sites\\default\\files';
const BUCKET = 'articles';

const args = process.argv.slice(2);
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1]) : null; })();

let done = new Set();
if (existsSync(PROGRESS_FILE)) {
  done = new Set(JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')));
  console.log(`Resuming: ${done.size} images already uploaded`);
}

// ── SSH + SFTP connection ─────────────────────────────────────────────────────
const sshConn = new SSH2Client();
const { sftp, ssh } = await new Promise((res, rej) => {
  sshConn.on('ready', () => {
    sshConn.sftp((err, sftp) => {
      if (err) return rej(err);
      res({ sftp, ssh: sshConn });
    });
  });
  sshConn.on('error', rej);
  sshConn.connect({
    host: process.env.SSH_HOST,
    port: 22,
    username: process.env.SSH_USER,
    password: process.env.SSH_PASSWORD,
    readyTimeout: 30000,
  });
});

function readRemoteFile(remotePath) {
  return new Promise((res, rej) => {
    const chunks = [];
    sftp.createReadStream(remotePath, { flags: 'r' })
      .on('data', d => chunks.push(d))
      .on('end', () => res(Buffer.concat(chunks)))
      .on('error', rej);
  });
}

// ── Process all articles in paginated batches ─────────────────────────────────
let ok = 0, fail = 0, skip = 0;
let totalProcessed = 0;

// Loop until no more articles with old URLs remain
while (true) {
  const { data: articles, error: fetchErr } = await supabase
    .from('articles')
    .select('id, featured_image, source_id')
    .like('featured_image', '%iktissadonline.com/sites/default/files/%')
    .eq('source_site', 'iktissad')
    .order('source_id')
    .limit(1000);

  if (fetchErr) { console.error('Failed to fetch articles:', fetchErr); break; }
  if (!articles || articles.length === 0) break;

  const toProcess = (LIMIT ? articles.slice(0, Math.max(0, LIMIT - totalProcessed)) : articles);
  if (toProcess.length === 0) break;

  console.log(`Fetched ${articles.length} articles with old URLs. Processing ${toProcess.length}...`);
  const batchOk = ok, batchFail = fail, batchSkip = skip;

for (const article of toProcess) {
  const oldUrl = article.featured_image;
  const key = article.id;

  if (done.has(key)) { skip++; continue; }

  // Extract the file path from the URL
  const urlPath = oldUrl.replace('https://www.iktissadonline.com/sites/default/files/', '');
  const remotePath = DRUPAL_FILES_PATH + '\\' + urlPath.replace(/\//g, '\\');

  // Determine content type from extension
  const ext = urlPath.split('.').pop()?.toLowerCase();
  const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
  const contentType = mimeTypes[ext] || 'image/jpeg';

  // Storage path — sanitize to ASCII-safe chars only (Supabase rejects non-ASCII and spaces)
  const safePath = urlPath
    .split('/')
    .map(segment => segment.replace(/[^a-zA-Z0-9._-]/g, (c) => {
      // Replace spaces and non-ASCII with dash
      return '-';
    }))
    .join('/');
  const storagePath = `iktissad/${safePath}`;

  try {
    // Read file from server
    const buffer = await readRemoteFile(remotePath);

    // Upload to Supabase Storage
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (upErr && !upErr.message.includes('already exists')) {
      throw upErr;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const newUrl = urlData.publicUrl;

    // Update article
    const { error: updErr } = await supabase
      .from('articles')
      .update({ featured_image: newUrl })
      .eq('id', key);

    if (updErr) throw updErr;

    done.add(key);
    ok++;

    if (ok % 50 === 0) {
      writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
      console.log(`Uploaded: ${ok} (${fail} failed, ${skip} skipped)`);
    }
  } catch (e) {
    console.error(`  Failed: ${urlPath} — ${e.message}`);
    fail++;
  }
}

  // End of for loop for this batch
  totalProcessed += toProcess.length;
  writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
  const batchUploaded = ok - batchOk;
  console.log(`Batch done: +${batchUploaded} uploaded. Total: ${ok} ok, ${fail} failed, ${skip} skipped`);

  if (LIMIT && totalProcessed >= LIMIT) break;
  // If we processed fewer than 1000, we've hit the end
  if (articles.length < 1000) break;
} // end while

writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
console.log(`✅ Image upload done: ${ok} ok, ${fail} failed, ${skip} skipped`);
sshConn.end();
