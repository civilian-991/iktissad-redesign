/**
 * M11 — Download awalan images from api.awalan.com → Supabase Storage
 * Then update articles.featured_image with new Supabase URLs
 * - Downloads via HTTP (api.awalan.com is publicly accessible)
 * - No SSH needed for this one
 * - Tracks progress in scripts/migration/progress-images-awalan.json
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PROGRESS_FILE = resolve(__dirname, 'progress-images-awalan.json');
const BUCKET = 'articles';
const AWALAN_CDN = 'https://api.awalan.com/Content/uploads/articles/';

const args = process.argv.slice(2);
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1]) : null; })();

let done = new Set();
if (existsSync(PROGRESS_FILE)) {
  done = new Set(JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')));
  console.log(`Resuming: ${done.size} awalan images already uploaded`);
}

let ok = 0, fail = 0, skip = 0, totalProcessed = 0;
const CONCURRENCY = 5;

async function processOne(article) {
  if (done.has(article.id)) { skip++; return; }

  const oldUrl = article.featured_image;
  const filename = oldUrl.split('/').pop();
  // Sanitize filename for Supabase storage (no ~, spaces, etc.)
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storagePath = `awalan/${safeFilename}`;

  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  const contentType = mimeMap[ext] || 'image/jpeg';

  try {
    const resp = await fetch(oldUrl, { signal: AbortSignal.timeout(15000) });
    if (resp.status === 404) {
      // Clear URL (empty string) so it stops appearing in future queries
      await supabase.from('articles').update({ featured_image: '' }).eq('id', article.id);
      done.add(article.id);
      skip++;
      return;
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const buffer = Buffer.from(await resp.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (upErr && !upErr.message.includes('already exists')) throw upErr;

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    await supabase.from('articles').update({ featured_image: urlData.publicUrl }).eq('id', article.id);

    done.add(article.id);
    ok++;
  } catch (e) {
    console.error(`  Failed: ${filename} — ${e.message}`);
    fail++;
  }
}

// Process all articles in paginated batches (Supabase returns max 1000 per query)
while (true) {
  const { data: articles } = await supabase
    .from('articles')
    .select('id, featured_image')
    .like('featured_image', '%api.awalan.com%')
    .order('id')
    .limit(1000);

  if (!articles || articles.length === 0) break;

  const toProcess = LIMIT ? articles.slice(0, Math.max(0, LIMIT - totalProcessed)) : articles;
  if (toProcess.length === 0) break;

  console.log(`Fetched ${articles.length} articles with awalan URLs...`);

  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const batch = toProcess.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processOne));

    if ((i + CONCURRENCY) % 100 === 0) {
      writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
      console.log(`Uploaded: ${ok} (${fail} failed, ${skip} skipped)`);
    }
  }

  totalProcessed += toProcess.length;
  writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
  console.log(`Batch done. Total: ${ok} ok, ${fail} failed, ${skip} skipped`);

  if (LIMIT && totalProcessed >= LIMIT) break;
  if (articles.length < 1000) break;
}

writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
console.log(`✅ awalan images done: ${ok} ok, ${fail} failed, ${skip} skipped`);
