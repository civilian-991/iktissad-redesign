/**
 * 52 — Magazine page images.
 *
 * The magazine was migrated as 201 empty shells: no PDFs, no article links, and
 * covers still loading from the legacy domain. The reason the PDFs were never
 * found is that there aren't any at issue level — each issue is a FLIPBOOK of
 * per-page scans, described by an XML blob on ikt_issue:
 *
 *   <issue rkvid='AS202507'
 *          lowdir='sites/default/files/magazines/aiwa/special/AS202507/pages/low'
 *          thumbdir='…/thumbs' highdir='…/high' pdfdir='…/pdf'>
 *     <page page_number='1' imageName='AS202507_ki7arn….jpg' pdfName='….pdf'/>
 *
 * 204 issues, 16,761 pages. We take `low` (~19 KB, the readable page) and
 * `thumbs` (~9 KB, the page strip) — about 470 MB. `high` (~2 GB) and the
 * per-page PDFs (~12.9 GB) are deliberately skipped; they can be added later
 * without redoing this.
 *
 * Resumable and idempotent: progress is journalled per issue.
 *
 * Usage:
 *   node scripts/rebuild/52-magazine-pages.mjs --dry-run
 *   node scripts/rebuild/52-magazine-pages.mjs --limit 2
 *   node scripts/rebuild/52-magazine-pages.mjs
 */
import { sshConnect, drupalJson, DATA_DIR, log, warn } from './lib.mjs';
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

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1], 10) : null; })();
const CONCURRENCY = 10;
const STATE = resolve(DATA_DIR, 'magazine-state.json');

// ── read the issue definitions ──────────────────────────────────────────────
const conn = await sshConnect();
log('SSH connected');
const issues = await drupalJson(conn, `
  SELECT JSON_OBJECT('nid', ii.nid, 'issueNumber', ii.issueNumber, 'pages', ii.numberOfPages,
                     'rkvid', ii.rkvid, 'publication', ii.publication, 'issueType', ii.issueType,
                     'publishingDate', ii.publishingDate, 'title', n.title, 'status', n.status,
                     'xml', ii.xml)
  FROM ikt_issue ii JOIN node n ON n.nid = ii.nid ORDER BY ii.issueNumber DESC`, 300000);
conn.end();
log(`issues at source: ${issues.length}`);

/** Pull the page list out of the XML blob. */
function parseIssue(xml) {
  if (!xml) return null;
  const dir = (k) => (xml.match(new RegExp(`${k}='([^']+)'`)) || [])[1] || null;
  const dirs = { low: dir('lowdir'), thumb: dir('thumbdir'), high: dir('highdir'), pdf: dir('pdfdir') };
  const pages = [];
  for (const m of xml.matchAll(/<page\s+([^>]+)\/>/g)) {
    const attrs = Object.fromEntries([...m[1].matchAll(/(\w+)='([^']*)'/g)].map(a => [a[1], a[2]]));
    if (!attrs.imageName) continue;
    pages.push({ n: Number(attrs.page_number || pages.length + 1), image: attrs.imageName });
  }
  pages.sort((a, b) => a.n - b.n);
  return { dirs, pages };
}

const parsed = issues.map(i => ({ ...i, parsed: parseIssue(i.xml) }))
  .filter(i => i.parsed && i.parsed.pages.length && i.parsed.dirs.low);
const totalPages = parsed.reduce((s, i) => s + i.parsed.pages.length, 0);
log(`issues with a usable page list: ${parsed.length}`);
log(`total pages: ${totalPages}  (~${Math.round(totalPages * 28 / 1024)} MB at low+thumb)`);

if (DRY) {
  log('\n--dry-run: nothing downloaded');
  parsed.slice(0, 3).forEach(i => {
    log(`  #${i.issueNumber} ${String(i.title || '').slice(0, 40)} — ${i.parsed.pages.length} pages`);
    log(`     ${LEGACY}${i.parsed.dirs.low}/${i.parsed.pages[0].image}`);
  });
  process.exit(0);
}

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { issues: {} };
const work = (LIMIT ? parsed.slice(0, LIMIT) : parsed).filter(i => !state.issues[i.rkvid]);
log(`already done: ${Object.keys(state.issues).length} | to process: ${work.length}`);

async function grab(url) {
  for (let a = 1; a <= 3; a++) {
    try {
      const r = await fetch(encodeURI(url), { signal: AbortSignal.timeout(45000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      return b.length ? b : null;
    } catch { if (a === 3) return null; await new Promise(x => setTimeout(x, 600 * a)); }
  }
  return null;
}

let issuesDone = 0, pagesUp = 0, pagesGone = 0;

for (const iss of work) {
  const { dirs, pages } = iss.parsed;
  const urls = [];
  for (const p of pages) {
    urls.push({ kind: 'low', n: p.n, from: `${LEGACY}${dirs.low}/${p.image}`, to: `magazines/${iss.rkvid}/low/${p.image}` });
    if (dirs.thumb) urls.push({ kind: 'thumb', n: p.n, from: `${LEGACY}${dirs.thumb}/${p.image}`, to: `magazines/${iss.rkvid}/thumb/${p.image}` });
  }

  const pageUrls = new Array(pages.length).fill(null);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= urls.length) return;
      const u = urls[i];
      const objectPath = u.to;
      const { data: exists } = await supabase.storage.from('magazines')
        .list(objectPath.split('/').slice(0, -1).join('/'), { search: objectPath.split('/').pop(), limit: 1 });
      if (!(exists && exists.length)) {
        const buf = await grab(u.from);
        if (!buf) { pagesGone++; continue; }
        const { error } = await supabase.storage.from('magazines')
          .upload(objectPath, buf, { contentType: 'image/jpeg', upsert: true });
        if (error) { warn(`${objectPath}: ${error.message.slice(0, 60)}`); continue; }
        pagesUp++;
      }
      if (u.kind === 'low') pageUrls[u.n - 1] = PUBLIC + 'magazines/' + objectPath;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const ready = pageUrls.filter(Boolean);
  // upsert by issue_number — the only stable key this table has
  const { error } = await supabase.from('magazine_issues').update({
    pages_images: ready,
    pages_ready: ready.length >= pages.length * 0.9,
    pages: pages.length,
    cover_image: ready[0] || null,
  }).eq('issue_number', Number(iss.issueNumber));
  if (error) warn(`issue ${iss.issueNumber}: ${error.message.slice(0, 80)}`);

  state.issues[iss.rkvid] = { pages: ready.length, of: pages.length };
  writeFileSync(STATE, JSON.stringify(state));
  issuesDone++;
  log(`  [${issuesDone}/${work.length}] #${iss.issueNumber} — ${ready.length}/${pages.length} pages`);
}

log('');
log(`issues processed: ${issuesDone}`);
log(`page files uploaded: ${pagesUp}`);
log(`page files gone at source: ${pagesGone}`);
