/**
 * 61 — Rebuild the magazine archive from the extract in 60.
 *
 * What this repairs, all of it caused by one line in the old loader:
 *
 *     pageUrls[u.n - 1] = url;      // u.n = Number(page_number)
 *
 * `page_number` is the label PRINTED on the page, not a sequence. Covers and
 * inserts carry 'FC', 'IFC', 'G.F 1', 'OBC', 'AD 1', 'IV' — so Number() gave
 * NaN, `pageUrls[NaN]` set a string property instead of an array slot, and the
 * subsequent .filter(Boolean) dropped the page. 475 pages across 84 issues
 * disappeared that way, including 82 front covers. They were downloaded fine
 * and are still sitting in the bucket; only the DB array forgot them.
 *
 * Ordering here comes from `fid`, the flipbook's own insertion order, which is
 * validated in 60: across all 205 issues the numeric labels ascend when sorted
 * by fid, with zero violations.
 *
 * Also fixes, in the same pass:
 *   - the 4 issues that exist at source but have no row at all (545–548),
 *     lost because the old loader used .update().eq('issue_number') and a
 *     zero-row update is not an error in PostgREST;
 *   - cover_image, which pointed at interior page 1 on the 82 issues whose
 *     real front cover had been dropped;
 *   - publication / issue_type, so اللبنانية stops being filed as الاقتصاد والأعمال;
 *   - `pages`, which advertised the source page count the reader could not show;
 *   - pages_ready, previously true at a 90% threshold that hid the damage.
 *
 * Idempotent: upserts on rkvid, and re-downloads only what the bucket lacks.
 *
 * Usage:
 *   node scripts/rebuild/61-load-magazines.mjs --dry-run
 *   node scripts/rebuild/61-load-magazines.mjs --limit 3
 *   node scripts/rebuild/61-load-magazines.mjs
 */
import { DATA_DIR, log, warn } from './lib.mjs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PUBLIC = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;
const LEGACY = 'https://www.iktissadonline.com/';
const BUCKET = 'magazines';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1], 10) : null; })();
const CONCURRENCY = 8;

const PUBLICATION = { '2': 'aiwa', '3': 'lubnaniya' };
const ISSUE_TYPE = { r: 'regular', s: 'special' };

const issues = readFileSync(resolve(DATA_DIR, 'drupal_magazines.ndjson'), 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l));
log(`issues in extract: ${issues.length}`);

/** Every object under a prefix; the storage list API caps each call at 1000. */
async function listAll(prefix) {
  const names = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error || !data) break;
    for (const f of data) names.add(f.name);
    if (data.length < 1000) break;
  }
  return names;
}

async function grab(url) {
  for (let a = 1; a <= 3; a++) {
    try {
      const r = await fetch(encodeURI(url), { signal: AbortSignal.timeout(45000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      return b.length ? b : null;
    } catch { if (a === 3) return null; await new Promise((x) => setTimeout(x, 600 * a)); }
  }
  return null;
}

const work = LIMIT ? issues.slice(0, LIMIT) : issues;
const report = [];
let inserted = 0, updated = 0, fetched = 0, absent = 0, failed = 0;

for (const iss of work) {
  const have = await listAll(`magazines/${iss.rkvid}/low`);

  // Fill any gap in the bucket before building the array, so a page that was
  // never downloaded (a brand-new issue) is not silently skipped again.
  const need = iss.pages.filter((p) => !have.has(p.image));
  if (need.length && !DRY) {
    let cursor = 0;
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const i = cursor++;
        if (i >= need.length) return;
        const p = need[i];
        const buf = await grab(`${LEGACY}${iss.dirs.low}/${p.image}`);
        if (!buf) continue;
        const { error } = await supabase.storage.from(BUCKET)
          .upload(`magazines/${iss.rkvid}/low/${p.image}`, buf, { contentType: 'image/jpeg', upsert: true });
        if (error) { warn(`${iss.rkvid}/${p.image}: ${error.message.slice(0, 60)}`); continue; }
        have.add(p.image);
        fetched++;
      }
    }));
  }

  // Build images and labels in lockstep, in fid order. A page whose file is
  // genuinely gone at source is skipped from BOTH arrays so they stay parallel.
  const images = [], labels = [], gone = [];
  for (const p of iss.pages) {
    if (!have.has(p.image)) { gone.push(p.label || '?'); continue; }
    images.push(`${PUBLIC}${BUCKET}/magazines/${iss.rkvid}/low/${p.image}`);
    labels.push(p.label);
  }
  absent += gone.length;

  // The front cover is the page labelled FC; it is always fid 1 where present
  // (82 of 82, checked in 60). Otherwise fall back to the first page.
  const fc = labels.findIndex((l) => l.trim().toUpperCase() === 'FC');
  const cover = images[fc >= 0 ? fc : 0] || '';

  const record = {
    rkvid: iss.rkvid,
    source_nid: iss.nid,
    issue_number: iss.issueNumber,
    publication: PUBLICATION[iss.publicationNid] || 'aiwa',
    issue_type: ISSUE_TYPE[iss.issueType] || 'regular',
    // Source titles carry trailing tabs and leading spaces; the publication is
    // now a column, so the title text itself is left exactly as authored.
    title: (iss.title || '').replace(/\s+/g, ' ').trim(),
    publish_date: new Date(iss.publishingDate.replace(' ', 'T') + 'Z').toISOString(),
    cover_image: cover,
    pages: images.length,
    pages_images: images,
    page_labels: labels,
    pages_ready: images.length === iss.pages.length,
    status: iss.status === 1 ? 'published' : 'draft',
  };

  report.push({
    rkvid: iss.rkvid, issue: iss.issueNumber, pages: images.length,
    of: iss.pages.length, gone, cover: fc >= 0 ? 'FC' : labels[0] || '-',
  });

  if (DRY) continue;

  const { data, error } = await supabase
    .from('magazine_issues')
    .upsert(record, { onConflict: 'rkvid' })
    .select('id, created_at, updated_at');

  if (error) { warn(`${iss.rkvid}: ${error.message.slice(0, 120)}`); failed++; continue; }
  // created_at is only equal to updated_at on a fresh row.
  const row = data && data[0];
  if (row && row.created_at === row.updated_at) inserted++; else updated++;
}

writeFileSync(resolve(DATA_DIR, 'magazine-load-report.json'), JSON.stringify(report, null, 2));

log('');
log(`issues processed   : ${work.length}`);
log(`  inserted         : ${inserted}`);
log(`  updated          : ${updated}`);
log(`  failed           : ${failed}`);
log(`page files fetched : ${fetched}`);
log(`pages gone at source: ${absent}`);
log(`total pages linked : ${report.reduce((s, r) => s + r.pages, 0)}`);
log(`issues with a real FC cover: ${report.filter((r) => r.cover === 'FC').length}`);
const short = report.filter((r) => r.gone.length);
if (short.length) {
  warn(`${short.length} issue(s) still short of source:`);
  for (const s of short) warn(`  ${s.rkvid}: ${s.pages}/${s.of} — missing ${s.gone.join(', ')}`);
}
log(`→ ${resolve(DATA_DIR, 'magazine-load-report.json')}`);
if (DRY) log('--dry-run: nothing written');
