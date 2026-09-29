/**
 * 60 — Extract the authoritative magazine issue list from Drupal.
 *
 * The previous magazine migration (m07 + 52) lost three things that only exist
 * at source, and this extract is what makes them recoverable:
 *
 *  1. `publication` / `issueType` — three different magazines (الاقتصاد والأعمال,
 *     اللبنانية, and the special issues) were flattened into one flat table with
 *     no column to tell them apart, so the archive interleaves them by date.
 *  2. `rkvid` — the only stable per-issue key. 52-magazine-pages keyed its writes
 *     on `issue_number` with a bare `.update()`, so issues that had no row yet
 *     (545, 546, 547) were silently dropped: the update matched zero rows and
 *     PostgREST does not call that an error.
 *  3. The page ORDER. Page files are named `<rkvid>_<random><ts>.jpg`, so a
 *     storage listing is alphabetical, NOT page order. Only the XML's
 *     `page_number` attribute knows which scan is page 1. Rebuilding the page
 *     array from a bucket listing would shuffle every issue.
 *
 * Read-only, like every extract in this pipeline. Writes NDJSON to data/.
 *
 * Usage:
 *   node scripts/rebuild/60-extract-magazines.mjs
 */
import { sshConnect, drupalJson, DATA_DIR, log, warn } from './lib.mjs';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const OUT = resolve(DATA_DIR, 'drupal_magazines.ndjson');
const CHUNK = 25;

const conn = await sshConnect();
log('SSH connected');

// The publication column is a node reference; resolve it to a real name once.
const pubs = await drupalJson(conn, `
  SELECT JSON_OBJECT('nid', n.nid, 'title', n.title)
  FROM node n WHERE n.type = 'iktpublication'`, 60000);
log(`publications at source: ${pubs.length}`);
for (const p of pubs) log(`  nid=${p.nid} → ${p.title}`);
const pubName = Object.fromEntries(pubs.map((p) => [String(p.nid), p.title]));

// CHAR(10)/CHAR(13) rather than '\n' — drupalJson escapes backslashes on the way
// through the shell, and a literal newline inside the XML would split the JSON
// row across two lines and be dropped by the line-based parser.
const rows = [];
let last = 0;
for (;;) {
  const batch = await drupalJson(conn, `
    SELECT JSON_OBJECT(
      'nid', ii.nid, 'rkvid', ii.rkvid, 'issueNumber', ii.issueNumber,
      'issueType', ii.issueType, 'publication', ii.publication,
      'publishingDate', ii.publishingDate, 'numberOfPages', ii.numberOfPages,
      'title', n.title, 'status', n.status,
      'xml', REPLACE(REPLACE(ii.xml, CHAR(10), ' '), CHAR(13), ' ')
    )
    FROM ikt_issue ii JOIN node n ON n.nid = ii.nid
    WHERE ii.nid > ${last} ORDER BY ii.nid LIMIT ${CHUNK}`, 180000);
  if (!batch.length) break;
  rows.push(...batch);
  last = Math.max(...batch.map((r) => Number(r.nid)));
  log(`  fetched ${rows.length} issues (nid ≤ ${last})`);
  if (batch.length < CHUNK) break;
}
conn.end();

// An empty or short result must throw, never be written as an empty table —
// that is exactly how 31,996 newsletter subscribers were lost last time.
if (rows.length < 200) throw new Error(`only ${rows.length} issues extracted; expected ~204`);

/** Pull the ordered page list out of the XML blob. */
function parseIssue(xml) {
  if (!xml) return null;
  const dir = (k) => (xml.match(new RegExp(`${k}='([^']+)'`)) || [])[1] || null;
  const dirs = { low: dir('lowdir'), thumb: dir('thumbdir'), high: dir('highdir'), pdf: dir('pdfdir') };
  const pages = [];
  for (const m of xml.matchAll(/<page\s+([^>]+)\/>/g)) {
    const attrs = Object.fromEntries([...m[1].matchAll(/(\w+)='([^']*)'/g)].map((a) => [a[1], a[2]]));
    if (!attrs.imageName) continue;
    // `page_number` is the LABEL PRINTED ON THE PAGE, not a sequence: covers and
    // inserts carry 'FC', 'G.F 1', 'IFCS', 'I'..'VI', 'BC'. The old migration did
    // Number(page_number) and indexed an array with the result, so every named
    // page became pageUrls[NaN] — a string property, not a slot — and was then
    // dropped by .filter(Boolean). That is how 84 issues lost their front cover.
    // `fid` is the flipbook's own insertion order and is the real sequence.
    pages.push({
      fid: Number(attrs.fid),
      label: attrs.page_number ?? '',
      image: attrs.imageName,
      category: attrs.pageCategory || '',
    });
  }
  pages.sort((a, b) => a.fid - b.fid);
  return { dirs, pages };
}

let bad = 0, badFid = 0, dupFid = 0;
const out = rows.map((r) => {
  const parsed = parseIssue(r.xml);
  if (!parsed || !parsed.pages.length || !parsed.dirs.low) { bad++; return null; }
  // fid is now load-bearing: it decides page order. Assert it is present and
  // unique here rather than discovering a shuffled issue in the reader.
  const seen = new Set();
  for (const p of parsed.pages) {
    if (!Number.isFinite(p.fid)) badFid++;
    if (seen.has(p.fid)) dupFid++;
    seen.add(p.fid);
  }
  return {
    rkvid: r.rkvid,
    nid: Number(r.nid),
    issueNumber: Number(r.issueNumber),
    issueType: r.issueType || null,
    publicationNid: r.publication == null ? null : String(r.publication),
    publicationName: pubName[String(r.publication)] || null,
    publishingDate: r.publishingDate || null,
    numberOfPages: r.numberOfPages == null ? null : Number(r.numberOfPages),
    title: r.title || '',
    status: Number(r.status),
    dirs: parsed.dirs,
    pages: parsed.pages,
  };
}).filter(Boolean);

writeFileSync(OUT, out.map((o) => JSON.stringify(o)).join('\n') + '\n');

log('');
log(`issues extracted      : ${rows.length}`);
log(`issues with page list : ${out.length}${bad ? ` (${bad} unusable)` : ''}`);
log(`pages missing a fid   : ${badFid}`);
log(`duplicate fids        : ${dupFid}`);
log(`total pages           : ${out.reduce((s, i) => s + i.pages.length, 0)}`);
log(`named (non-numeric) pages: ${out.reduce((s, i) => s + i.pages.filter((p) => !/^\d+$/.test(p.label.trim())).length, 0)}`);
log(`published / unpublished: ${out.filter((o) => o.status === 1).length} / ${out.filter((o) => o.status !== 1).length}`);
const byPub = {};
for (const o of out) {
  const k = `${o.publicationName || o.publicationNid || '?'} / ${o.issueType || '?'}`;
  byPub[k] = (byPub[k] || 0) + 1;
}
log('breakdown:');
for (const [k, v] of Object.entries(byPub)) log(`  ${k}: ${v}`);
log(`→ ${OUT}`);
if (dupFid || badFid) warn("fid problems found — inspect before loading");
