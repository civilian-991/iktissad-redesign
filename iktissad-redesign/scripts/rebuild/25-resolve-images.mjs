/**
 * 25 — Image resolution and legacy-host decoupling
 *
 * Answers three questions for every canonical story:
 *   1. Which source image is its lead image?
 *   2. Is that image already in our storage, and is it the RIGHT one?
 *   3. What still has to be uploaded before the legacy hosts can be switched off?
 *
 * The "right one" question matters: the previous upload sanitised filenames by
 * replacing every non-ASCII byte with "-", so Arabic names collapsed to strings
 * of dashes. 495 Drupal groups and 52 awalan groups collide — 1,822 images were
 * overwritten, and those articles currently display another article's photo.
 * Anything colliding is re-pathed as "<source>-<id>-<name>", which is unique by
 * construction and traceable back to the source row.
 *
 * Also produces the body-HTML rewrite map: article bodies currently reference
 * iktissadonline.com / awalan.com directly, so they would break on shutdown.
 *
 * Writes files only. No uploads, no database changes.
 */
import { readNdjson, DATA_DIR, log } from './lib.mjs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { writeFileSync, createWriteStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PUBLIC = `${SUPABASE_URL}/storage/v1/object/public/`;

/**
 * The sanitiser the previous upload used, recovered by matching stored filenames
 * against source values: everything outside [A-Za-z0-9_.-] becomes "-".
 * Verified at 17,162/17,514 on awalan. Note `\w` has no `u` flag, so all Arabic
 * is replaced — which is exactly why names collide.
 *   618~LOGO-STC.jpg          -> 618-LOGO-STC.jpg
 *   سوق-السندات-السعودية.jpg  -> --------------------.jpg
 */
const legacySanitise = (s) => s.replace(/[^\w.\-]/g, '-');
/** Collision-free replacement: keep the source id, so two Arabic names never merge. */
const safeName = (source, id, name) => `${source}-${id}-${legacySanitise(name)}`;

// ── what is already in storage ──────────────────────────────────────────────
const storedUrls = new Set();
{
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('media').select('url').range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data.length) break;
    data.forEach(r => storedUrls.add(r.url));
    if (data.length < 1000) break;
    from += 1000;
  }
}
log(`media rows in storage: ${storedUrls.size}`);

// ── source image references ─────────────────────────────────────────────────
const files = new Map(readNdjson('drupal_files').map(f => [Number(f.fid), f]));
const thumb = new Map();
for (const r of readNdjson('drupal_img_thumbnail')) if (!thumb.has(Number(r.entity_id))) thumb.set(Number(r.entity_id), Number(r.fid));
const promoted = new Map();
for (const r of readNdjson('drupal_img_promoted')) if (!promoted.has(Number(r.entity_id))) promoted.set(Number(r.entity_id), Number(r.fid));

const awImg = new Map();
for (const a of readNdjson('awalan_articles')) {
  if (a.isPublished === 'True' && a.isDeleted !== 'True' && a.imgSrc) awImg.set(Number(a.id), a.imgSrc);
}

// ── detect collisions on the LEGACY path scheme ─────────────────────────────
const legacyPathOwners = new Map();  // legacy storage path -> Set of source keys
function drupalLegacyPath(fid) {
  const f = files.get(fid);
  if (!f) return null;
  const p = String(f.uri).replace(/^public:\/\//, '');
  const parts = p.split('/');
  const name = parts.pop();
  return `articles/iktissad/${parts.length ? parts.join('/') + '/' : ''}${legacySanitise(name)}`;
}
const awalanLegacyPath = (imgSrc) => `articles/awalan/${legacySanitise(imgSrc)}`;

for (const [fid, f] of files) {
  const p = drupalLegacyPath(fid);
  if (!p) continue;
  if (!legacyPathOwners.has(p)) legacyPathOwners.set(p, new Set());
  legacyPathOwners.get(p).add(`iktissad:${String(f.uri).split('/').pop()}`);
}
for (const [id, src] of awImg) {
  const p = awalanLegacyPath(src);
  if (!legacyPathOwners.has(p)) legacyPathOwners.set(p, new Set());
  legacyPathOwners.get(p).add(`awalan:${src}`);
}
const collidedPaths = new Set([...legacyPathOwners].filter(([, s]) => s.size > 1).map(([p]) => p));
log(`legacy storage paths that more than one source image maps to: ${collidedPaths.size}`);

// ── classify every canonical story's lead image ─────────────────────────────
const canonical = readNdjson('canonical_articles');
const out = createWriteStream(resolve(DATA_DIR, 'canonical_images.ndjson'), { flags: 'w' });
const uploads = [];
const stat = { total: canonical.length, resolved: 0, recovered: 0, collided: 0, missing: 0, none: 0 };

for (const c of canonical) {
  let rec = null;
  for (const ref of c.refs) {
    if (ref.source === 'iktissad') {
      const fid = thumb.get(ref.sourceId) ?? promoted.get(ref.sourceId);
      const f = fid != null ? files.get(fid) : null;
      if (!f) continue;
      const name = String(f.uri).split('/').pop();
      rec = { source: 'iktissad', id: fid, sourceRef: String(f.uri), name,
              legacyPath: drupalLegacyPath(fid),
              legacyUrl: `https://www.iktissadonline.com/sites/default/files/${String(f.uri).replace(/^public:\/\//, '')}` };
      break;
    }
    if (ref.source === 'awalan') {
      const src = awImg.get(ref.sourceId);
      if (!src) continue;
      rec = { source: 'awalan', id: ref.sourceId, sourceRef: src, name: src,
              legacyPath: awalanLegacyPath(src),
              legacyUrl: `https://api.awalan.com/Content/uploads/Articles/${src}` };
      break;
    }
  }

  if (!rec) { stat.none++; out.write(JSON.stringify({ slug: c.slug, image: null, status: 'none' }) + '\n'); continue; }

  const isCollided = collidedPaths.has(rec.legacyPath);
  const storedUrl = PUBLIC + rec.legacyPath;
  const exists = storedUrls.has(storedUrl);

  let status, finalPath;
  if (isCollided) {
    // cannot trust what is there — another image may have overwritten it
    finalPath = `articles/${rec.source}/${safeName(rec.source, rec.id, rec.name)}`;
    // has the corrected copy been uploaded yet?
    if (storedUrls.has(PUBLIC + finalPath)) { status = 'recovered'; stat.recovered++; }
    else {
      status = 'collided';
      stat.collided++;
      uploads.push({ ...rec, reason: 'filename collision — stored file may be the wrong image', targetPath: finalPath });
    }
  } else if (exists) {
    status = 'resolved';
    finalPath = rec.legacyPath;
    stat.resolved++;
  } else {
    finalPath = `articles/${rec.source}/${safeName(rec.source, rec.id, rec.name)}`;
    if (storedUrls.has(PUBLIC + finalPath)) { status = 'recovered'; stat.recovered++; }
    else {
      status = 'missing';
      stat.missing++;
      uploads.push({ ...rec, reason: 'never uploaded', targetPath: finalPath });
    }
  }

  out.write(JSON.stringify({ slug: c.slug, status, url: PUBLIC + finalPath, source: rec.source, sourceRef: rec.sourceRef }) + '\n');
}
await new Promise(r => out.end(r));

// ── body HTML still pointing at the legacy hosts ────────────────────────────
const HOST_RE = /https?:\/\/(?:www\.)?(?:iktissadonline\.com|awalan\.com|api\.awalan\.com)[^"'\s)]*/gi;
let bodiesWithLegacy = 0;
const refCounts = new Map();
for (const c of canonical) {
  const m = (c.body || '').match(HOST_RE);
  if (!m) continue;
  bodiesWithLegacy++;
  for (const u of m) refCounts.set(u, (refCounts.get(u) || 0) + 1);
}

const pct = (n) => `${((n / stat.total) * 100).toFixed(1)}%`;
log('');
log(`canonical stories:      ${stat.total}`);
log(`  lead image resolved:  ${stat.resolved}  (${pct(stat.resolved)})`);
log(`  recovered by re-upload: ${stat.recovered}  (${pct(stat.recovered)})`);
log(`  WRONG image (collision): ${stat.collided}  (${pct(stat.collided)})`);
log(`  image never uploaded: ${stat.missing}  (${pct(stat.missing)})`);
log(`  no image at source:   ${stat.none}  (${pct(stat.none)})`);
log('');
log(`uploads required:       ${uploads.length}`);
log(`bodies referencing a legacy host: ${bodiesWithLegacy}  (${pct(bodiesWithLegacy)})`);
log(`distinct legacy URLs inside bodies: ${refCounts.size}`);

writeFileSync(resolve(DATA_DIR, 'image-uploads.json'), JSON.stringify(uploads, null, 2));
writeFileSync(resolve(DATA_DIR, 'images-report.md'), [
  '# Image resolution',
  '',
  `| Status | Stories | Share |`,
  `|---|---:|---:|`,
  `| Lead image resolved | ${stat.resolved} | ${pct(stat.resolved)} |`,
  `| **Wrong image (filename collision)** | ${stat.collided} | ${pct(stat.collided)} |`,
  `| Never uploaded | ${stat.missing} | ${pct(stat.missing)} |`,
  `| No image at source | ${stat.none} | ${pct(stat.none)} |`,
  '',
  `Uploads required: **${uploads.length}**`,
  '',
  `Bodies referencing a legacy host: **${bodiesWithLegacy}** across ${refCounts.size} distinct URLs.`,
  'Each must be rewritten to our own storage before either domain is switched off.',
  '',
].join('\n'));
log('\nwrote canonical_images.ndjson, image-uploads.json, images-report.md');
