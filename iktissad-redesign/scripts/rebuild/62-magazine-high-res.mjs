/**
 * 62 — Re-pull the magazine archive at readable resolution.
 *
 * The original migration took the `low` rendition: 400×526px, ~18KB. At that
 * size an Arabic magazine page is a thumbnail — the masthead is legible, the
 * body copy is not. Subscribers have been served thumbnails as pages.
 *
 * The source keeps three renditions per page; this pulls the middle one:
 *
 *     thumbs   96×129     ~7KB    page strip only
 *     low     400×526    ~18KB    what we shipped — unreadable
 *     high    800×1054  ~250KB    comfortably readable       ← this script
 *
 * There is no larger rendition, and the per-page `pdfdir` files 404 (the server
 * returns a Drupal error page with a .pdf extension), so `high` is the ceiling
 * short of the original print-production PDFs.
 *
 * ~17,303 pages, ~4.4GB. Resumable and idempotent: progress is journalled per
 * issue, the bucket is checked before every download, and each issue's DB row
 * is updated as soon as that issue completes — kill it any time and re-run.
 *
 * A page whose `high` cannot be fetched keeps its existing `low` URL, so
 * `pages_images` never loses an entry and stays parallel to `page_labels`.
 *
 * Usage:
 *   node scripts/rebuild/62-magazine-high-res.mjs --dry-run
 *   node scripts/rebuild/62-magazine-high-res.mjs --limit 2
 *   node scripts/rebuild/62-magazine-high-res.mjs
 */
import { DATA_DIR, log, warn } from './lib.mjs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
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
// Kept deliberately low. The project's Postgres allows only 60 connections and
// PostgREST already holds 21 of them, so the storage API's pool is tight; at 10
// concurrent uploads this job started losing pages to "Too many connections
// issued to the database" and was competing with the live site for the pool.
// Throughput is bounded by the legacy server's uplink anyway (0.2–1.6 MB/s,
// unaffected by concurrency), so there is nothing to gain by pushing harder.
const CONCURRENCY = Number(process.env.MAG_CONCURRENCY || 4);
const STATE = resolve(DATA_DIR, 'magazine-high-state.json');

const issues = readFileSync(resolve(DATA_DIR, 'drupal_magazines.ndjson'), 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l));

// The legacy server's uplink is capped at ~0.2 MB/s and no amount of concurrency
// moves it (5/10/20/32 all measure ~62 pages/min; SFTP is slower still at 41).
// The whole archive is therefore a ~6 hour pull, so order matters: newest issues
// first, because those are the ones people open, and the archive then improves
// from the front rather than from 2013 forward.
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { issues: {} };
const byNewest = [...issues].sort(
  (a, b) => new Date(b.publishingDate) - new Date(a.publishingDate)
);
// An issue is only "done" when every page made it to high. Storage 502s are
// rare but real (~1 in 2,600), and journalling a partial issue as complete
// would strand those pages at low resolution forever, since a re-run skips
// anything in the journal.
const pending = (LIMIT ? byNewest.slice(0, LIMIT) : byNewest)
  .filter((i) => !state.issues[i.rkvid] || state.issues[i.rkvid].missing > 0);

log(`issues total: ${issues.length} | already done: ${Object.keys(state.issues).length} | to do: ${pending.length}`);
log(`pages to pull: ~${pending.reduce((s, i) => s + i.pages.length, 0)}`);

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
      const r = await fetch(encodeURI(url), { signal: AbortSignal.timeout(60000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      // A Drupal error page is served as 200 with HTML; only accept a real JPEG.
      if (b.length < 1024 || b[0] !== 0xFF || b[1] !== 0xD8) return null;
      return b;
    } catch { if (a === 3) return null; await new Promise((x) => setTimeout(x, 800 * a)); }
  }
  return null;
}

/** Upload with retries — storage answers 502 occasionally and a bare `continue`
 *  would cost that page its high rendition permanently. */
async function put(path, buf) {
  for (let a = 1; a <= 3; a++) {
    const { error } = await supabase.storage.from(BUCKET)
      .upload(path, buf, { contentType: 'image/jpeg', upsert: true });
    if (!error) return null;
    if (a === 3) return error;
    await new Promise((x) => setTimeout(x, 800 * a));
  }
  return null;
}

if (DRY) {
  log('\n--dry-run: nothing downloaded');
  for (const i of pending.slice(0, 3)) {
    log(`  ${i.rkvid} — ${i.pages.length} pages`);
    log(`     ${LEGACY}${i.dirs.high}/${i.pages[0].image}`);
  }
  process.exit(0);
}

let issuesDone = 0, up = 0, skipped = 0, fellBack = 0, bytes = 0;
const started = Date.now();

for (const iss of pending) {
  const have = await listAll(`magazines/${iss.rkvid}/high`);
  const need = iss.pages.filter((p) => !have.has(p.image));

  let cursor = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const k = cursor++;
      if (k >= need.length) return;
      const p = need[k];
      const buf = await grab(`${LEGACY}${iss.dirs.high}/${p.image}`);
      if (!buf) continue;
      const error = await put(`magazines/${iss.rkvid}/high/${p.image}`, buf);
      if (error) { warn(`${iss.rkvid}/${p.image}: ${error.message.slice(0, 60)}`); continue; }
      have.add(p.image);
      up++; bytes += buf.length;
    }
  }));
  skipped += iss.pages.length - need.length;

  // Build the array in fid order: high where we have it, existing low where we
  // do not, so the array never shrinks and stays parallel to page_labels.
  const images = [];
  let missing = 0;
  for (const p of iss.pages) {
    if (have.has(p.image)) {
      images.push(`${PUBLIC}${BUCKET}/magazines/${iss.rkvid}/high/${p.image}`);
    } else {
      images.push(`${PUBLIC}${BUCKET}/magazines/${iss.rkvid}/low/${p.image}`);
      missing++;
    }
  }
  fellBack += missing;

  const fcIdx = iss.pages.findIndex((p) => (p.label || '').trim().toUpperCase() === 'FC');
  const { error } = await supabase.from('magazine_issues').update({
    pages_images: images,
    cover_image: images[fcIdx >= 0 ? fcIdx : 0],
    pages: images.length,
    pages_ready: true,
  }).eq('rkvid', iss.rkvid);
  if (error) { warn(`${iss.rkvid} db: ${error.message.slice(0, 90)}`); continue; }

  state.issues[iss.rkvid] = { pages: iss.pages.length, high: iss.pages.length - missing, missing };
  writeFileSync(STATE, JSON.stringify(state));
  issuesDone++;

  const mins = (Date.now() - started) / 60000;
  const rate = up / Math.max(mins, 0.01);
  log(`[${issuesDone}/${pending.length}] ${iss.rkvid} — ${iss.pages.length - missing}/${iss.pages.length} high` +
      `${missing ? ` (${missing} kept at low)` : ''} | ${(bytes / 1e9).toFixed(2)}GB | ${Math.round(rate)} pages/min`);
}

log('');
log(`issues completed   : ${issuesDone}`);
log(`pages uploaded     : ${up}  (${(bytes / 1e9).toFixed(2)} GB)`);
log(`pages already there: ${skipped}`);
log(`pages kept at low  : ${fellBack}`);
log(`elapsed            : ${((Date.now() - started) / 60000).toFixed(1)} min`);
if (fellBack) warn('some pages had no high rendition and kept their low URL');
