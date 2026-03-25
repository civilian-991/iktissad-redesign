/**
 * M13 — Download iktissadonline.com images for articles with source_site=null
 * These are awalan articles that cross-referenced iktissad images.
 * No SSH needed — fetches directly via HTTP.
 * Tracks progress in scripts/migration/progress-images-cross.json
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

const PROGRESS_FILE = resolve(__dirname, 'progress-images-cross.json');
const BUCKET = 'articles';
const CONCURRENCY = 8;

let done = new Set();
if (existsSync(PROGRESS_FILE)) {
  done = new Set(JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')));
  console.log(`Resuming: ${done.size} cross-ref images already processed`);
}

let ok = 0, fail = 0, skip = 0;

async function processOne(article) {
  if (done.has(article.id)) { skip++; return; }

  const oldUrl = article.featured_image;
  // Extract path after /sites/default/files/
  const match = oldUrl.match(/\/sites\/default\/files\/(.+)$/);
  if (!match) {
    // Malformed URL — null it out
    await supabase.from('articles').update({ featured_image: '' }).eq('id', article.id);
    done.add(article.id);
    skip++;
    return;
  }

  const urlPath = match[1];
  const safePath = urlPath
    .split('/')
    .map(segment => segment.replace(/[^a-zA-Z0-9._-]/g, '-'))
    .join('/');
  const storagePath = `iktissad/${safePath}`;

  const ext = urlPath.split('.').pop()?.toLowerCase();
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
  const contentType = mimeMap[ext] || 'image/jpeg';

  try {
    const resp = await fetch(oldUrl, { signal: AbortSignal.timeout(15000) });
    if (resp.status === 404 || resp.status === 403) {
      // Image gone or access denied — null out so article stops appearing in queries
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
    console.error(`  Failed: ${urlPath.slice(-60)} — ${e.message}`);
    fail++;
  }
}

while (true) {
  const { data: articles } = await supabase
    .from('articles')
    .select('id, featured_image')
    .like('featured_image', '%iktissadonline.com%')
    .is('source_site', null)
    .order('id')
    .limit(1000);

  if (!articles || articles.length === 0) break;

  const toProcess = articles.filter(a => !done.has(a.id));
  if (toProcess.length === 0) {
    // All in done set but DB not updated — shouldn't happen with null-out logic but break just in case
    console.log('All remaining articles already in done set but still match query — breaking');
    break;
  }

  console.log(`Fetched ${articles.length} articles with cross-ref URLs. Processing ${toProcess.length}...`);

  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const batch = toProcess.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processOne));

    if ((i + CONCURRENCY) % 200 === 0) {
      writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
      console.log(`Processed: ${ok} ok, ${fail} failed, ${skip} skipped`);
    }
  }

  writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
  console.log(`Batch done. Total: ${ok} ok, ${fail} failed, ${skip} skipped`);

  if (articles.length < 1000) break;
}

writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
console.log(`✅ Cross-ref images done: ${ok} ok, ${fail} failed, ${skip} skipped`);
