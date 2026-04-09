/**
 * M11b — Download dossier cover images → Supabase Storage
 * Then update article_series.cover_image with new Supabase URLs
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const BUCKET = 'articles';

const { data: series, error } = await supabase
  .from('article_series')
  .select('id, slug, cover_image')
  .like('cover_image', '%api.awalan.com%');

if (error) { console.error('Fetch error:', error.message); process.exit(1); }
console.log(`Found ${series.length} series with external cover images`);

let ok = 0, fail = 0;

for (const s of series) {
  const url = s.cover_image;
  const filename = url.split('/').pop();
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storagePath = `reports/${safeFilename}`;

  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  const contentType = mimeMap[ext] || 'image/jpeg';

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const buffer = Buffer.from(await resp.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (upErr && !upErr.message.includes('already exists')) throw upErr;

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    await supabase.from('article_series').update({ cover_image: urlData.publicUrl }).eq('id', s.id);

    console.log(`✓ ${s.slug}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${s.slug} — ${e.message}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
