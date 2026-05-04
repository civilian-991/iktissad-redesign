/**
 * M21 — Backfill missing featured_image for awalan articles
 *
 * Finds all awalan articles where featured_image is empty/null,
 * pulls imgSrc from the source MSSQL, builds the api.awalan.com URL,
 * and updates the row.
 *
 * Usage:
 *   node scripts/migration/m21-backfill-awalan-images.mjs --dry-run
 *   node scripts/migration/m21-backfill-awalan-images.mjs
 */
import { sshConnect, awQueryRaw, parsePSV, supabase, log, logErr } from './lib.mjs';

const DRY_RUN = process.argv.includes('--dry-run');

// Pull all awalan source_ids with empty featured_image
const ids = [];
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from('articles')
    .select('source_id, id')
    .eq('source_site', 'awalan')
    .or('featured_image.is.null,featured_image.eq.')
    .range(from, from + 999);
  if (error) { logErr('paging', error); break; }
  if (!data || !data.length) break;
  data.forEach(r => r.source_id && ids.push({ source_id: r.source_id, db_id: r.id }));
  if (data.length < 1000) break;
  from += 1000;
}
log(`Found ${ids.length} awalan rows with empty featured_image`);
if (ids.length === 0) process.exit(0);

const conn = await sshConnect();
log('SSH connected');

const BATCH = 200;
let updated = 0, stillEmpty = 0, fail = 0;

for (let i = 0; i < ids.length; i += BATCH) {
  const slice = ids.slice(i, i + BATCH);
  const idList = slice.map(s => s.source_id).join(',');

  const raw = await awQueryRaw(conn, `SELECT id, imgSrc FROM Article WHERE id IN (${idList});`);
  const rows = parsePSV(raw);
  const imgById = new Map(rows.map(r => [parseInt(r.id), r.imgSrc]));

  for (const item of slice) {
    const imgSrc = imgById.get(item.source_id);
    if (!imgSrc || imgSrc === 'NULL' || !imgSrc.trim()) { stillEmpty++; continue; }

    const url = `https://api.awalan.com/Content/uploads/articles/${imgSrc.trim()}`;

    if (DRY_RUN) { updated++; continue; }

    const { error } = await supabase
      .from('articles')
      .update({ featured_image: url })
      .eq('id', item.db_id);
    if (error) { logErr(`id=${item.source_id}`, error); fail++; }
    else updated++;
  }
  log(`  processed ${Math.min(i + BATCH, ids.length)}/${ids.length} — updated=${updated} stillEmpty=${stillEmpty} fail=${fail}`);
}

log(`✅ Done. updated=${updated}, source-has-no-image=${stillEmpty}, failed=${fail}${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);
conn.end();
