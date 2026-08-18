/**
 * 40 — Incremental sync from the two live sources.
 *
 * Both legacy sites are still publishing (~8 articles/day). This is what stops
 * iktissad.com drifting behind them again — the previous gap reached 105 days
 * because every import was a person remembering to run a script.
 *
 * Safe to run repeatedly and on a schedule:
 *   - Identity is (source_site, source_id) over NON-PROFILE rows. Profiles share
 *     awalan's id space (2,255 of them), so including them makes the importer
 *     think it already has articles it does not — the defect that hid ~600
 *     missing stories last time.
 *   - Cross-masthead dedup: a story that ran on both sites is matched against
 *     what we already have by normalised title + date window, so it lands once.
 *   - Every insert also writes its redirect rows, so a new article's legacy URLs
 *     work immediately rather than in a later batch.
 *
 * Usage:
 *   node scripts/rebuild/40-sync.mjs --dry-run
 *   node scripts/rebuild/40-sync.mjs
 */
import { sshConnect, drupalJson, awalanJson, log, warn } from './lib.mjs';
import { stripMarkup, makeSlug } from './slug.mjs';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PUBLIC = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;
const SITE = 'https://www.iktissad.com';

const DRY = process.argv.includes('--dry-run');
const map = JSON.parse(readFileSync(resolve(__dirname, 'taxonomy-map.json'), 'utf8'));

// ── shared helpers, identical to the rebuild ────────────────────────────────
const norm = (s) => (s || '').replace(/[ً-ْٰـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const titleKey = (t) => norm(stripMarkup(t)).replace(/\s/g, '');
const clip = (t, max) => {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max), sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[،,؛;:\-–—]$/, '').trim() + '…';
};
const firstProse = (html) => {
  if (!html) return '';
  const paras = String(html).split(/<\/p>|<br\s*\/?>/i)
    .map(p => stripMarkup(p).replace(/\s+/g, ' ').trim()).filter(p => p.length > 40);
  return paras[0] || stripMarkup(html).replace(/\s+/g, ' ').trim();
};
const legacySanitise = (s) => s.replace(/[^\w.\-]/g, '-');

// ── live vocabularies (never invent a category) ─────────────────────────────
async function vocab(table) {
  const m = new Map();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select('id, slug, name')
      .order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data.length) break;
    data.forEach(r => { m.set(r.slug, r.id); if (r.name) m.set('name:' + norm(r.name).replace(/\s/g, ''), r.id); });
    if (data.length < 1000) break;
    from += 1000;
  }
  return m;
}
const [sectionV, sectorV, countryV] = await Promise.all([vocab('sections'), vocab('sectors'), vocab('countries')]);

const target = (t) => {
  if (!t || t === 'unset') return null;
  const [kind, slug] = String(t).split(':');
  const v = kind === 'section' ? sectionV : kind === 'sector' ? sectorV : countryV;
  return v.has(slug) ? { kind, id: v.get(slug) } : null;
};
const drupalSectorMap = new Map(Object.entries(map.drupal_sector_vocabulary).filter(([k]) => !k.startsWith('_')).map(([k, e]) => [Number(k), target(e.target)]));
const awSectorMap = new Map(Object.entries(map.awalan_sector_children).filter(([k]) => !k.startsWith('_')).map(([k, e]) => [Number(k), target(e.target)]));
const awSectionMap = new Map(Object.entries(map.awalan_section_roots).filter(([k]) => !k.startsWith('_')).map(([k, e]) => [Number(k), target(e.target)]));
const countryAlias = new Map(Object.entries(map.country_aliases || {}).filter(([k]) => !k.startsWith('_'))
  .map(([name, t]) => [norm(name).replace(/\s/g, ''), String(t).split(':')[1]]));
const regionTerms = new Set(Object.keys(map._region_terms || {}).filter(k => !k.startsWith('_')).map(n => norm(n).replace(/\s/g, '')));

function countryIdFor(name) {
  if (!name) return null;
  const k = norm(name).replace(/\s/g, '');
  if (regionTerms.has(k)) return null;
  const alias = countryAlias.get(k);
  if (alias && countryV.has(alias)) return countryV.get(alias);
  return countryV.get('name:' + k) || null;
}

// ── what we already hold (non-profile only) ─────────────────────────────────
async function heldIds(site) {
  const s = new Set();
  let from = 0;
  for (;;) {
    // ORDER BY is mandatory: without a stable sort, Postgres may return rows in
    // a different order per page, so .range() pagination silently overlaps and
    // SKIPS rows. That undercounted what we already hold by ~5,200 ids, which
    // would have re-inserted thousands of articles we already have.
    const { data, error } = await supabase.from('articles').select('source_id, tags')
      .eq('source_site', site).not('source_id', 'is', null)
      .order('source_id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data.length) break;
    for (const r of data) if (!(r.tags || []).includes('profile')) s.add(Number(r.source_id));
    if (data.length < 1000) break;
    from += 1000;
  }
  return s;
}

// existing titles, for cross-masthead dedup against what is already live
const existingByTitle = new Map();
{
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('articles')
      .select('id, slug, title, published_at, source_site, source_id')
      .eq('status', 'published').order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data.length) break;
    for (const r of data) {
      const k = titleKey(r.title);
      if (!k) continue;
      if (!existingByTitle.has(k)) existingByTitle.set(k, []);
      existingByTitle.get(k).push(r);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
}
log(`existing published titles indexed: ${existingByTitle.size}`);

const [heldIkt, heldAw] = await Promise.all([heldIds('iktissad'), heldIds('awalan')]);
log(`held source ids — iktissad ${heldIkt.size}, awalan ${heldAw.size}`);

// ── pull the delta ──────────────────────────────────────────────────────────
const conn = await sshConnect();
log('SSH connected');

const drupalIds = await drupalJson(conn, `
  SELECT JSON_OBJECT('nid', n.nid) FROM node n JOIN ikt_article ia ON ia.nid=n.nid
  WHERE n.type='iktarticle' AND n.status=1 ORDER BY n.nid`);
const missingIkt = drupalIds.map(r => Number(r.nid)).filter(id => !heldIkt.has(id));

const awIds = [];
for (let lo = 1; lo <= 40000; lo += 6000) {
  const rows = await awalanJson(conn, `
    SELECT id FROM Article WHERE isPublished=1 AND (isDeleted=0 OR isDeleted IS NULL)
      AND id BETWEEN ${lo} AND ${lo + 5999} ORDER BY id`);
  awIds.push(...rows.map(r => Number(r.id)));
  if (!rows.length && lo > 24000) break;
}
const missingAw = awIds.filter(id => !heldAw.has(id));

log('');
log(`source live — iktissad ${drupalIds.length}, awalan ${awIds.length}`);
log(`MISSING     — iktissad ${missingIkt.length}, awalan ${missingAw.length}`);

if (!missingIkt.length && !missingAw.length) {
  log('\nnothing to sync — already up to date');
  conn.end(); process.exit(0);
}

// ── fetch full rows for the delta only ──────────────────────────────────────
const incoming = [];

for (let i = 0; i < missingIkt.length; i += 100) {
  const ids = missingIkt.slice(i, i + 100);
  const rows = await drupalJson(conn, `
    SELECT JSON_OBJECT('nid',n.nid,'title',n.title,'created',n.created,
      'articledate',ia.articledate,'video',ia.video,'featured',ia.featured_article,
      'editor_choice',ia.article_edit_choice,'body',b.body_value,'summary',b.body_summary,
      'sector_tid',(SELECT f.iktarticle_sector_taxo_tid FROM field_data_iktarticle_sector_taxo f WHERE f.entity_id=n.nid AND f.entity_type='node' LIMIT 1),
      'country_name',(SELECT t.name FROM field_data_iktarticle_countries_taxo f JOIN taxonomy_term_data t ON t.tid=f.iktarticle_countries_taxo_tid WHERE f.entity_id=n.nid AND f.entity_type='node' LIMIT 1),
      'byline',(SELECT t.name FROM field_data_iktarticle_articleby_taxo f JOIN taxonomy_term_data t ON t.tid=f.iktarticle_articleby_taxo_tid WHERE f.entity_id=n.nid AND f.entity_type='node' LIMIT 1),
      'alias',(SELECT a.alias FROM url_alias a WHERE a.source=CONCAT('node/',n.nid) LIMIT 1),
      'img',(SELECT fm.uri FROM field_data_iktarticle_thumbnail f JOIN file_managed fm ON fm.fid=f.iktarticle_thumbnail_fid WHERE f.entity_id=n.nid AND f.entity_type='node' LIMIT 1))
    FROM node n JOIN ikt_article ia ON ia.nid=n.nid
    LEFT JOIN field_data_body b ON b.entity_id=n.nid AND b.entity_type='node'
    WHERE n.nid IN (${ids.join(',')})`);
  for (const r of rows) {
    incoming.push({
      source: 'iktissad', sourceId: Number(r.nid),
      title: stripMarkup(r.title),
      body: r.body || '',
      publishedAt: r.articledate ? String(r.articledate).replace(' ', 'T')
                 : r.created ? new Date(Number(r.created) * 1000).toISOString() : null,
      excerpt: r.summary || null, metaTitle: null, metaDescription: null,
      videoUrl: r.video || null,
      featured: Number(r.featured) === 1, editorChoice: Number(r.editor_choice) === 1,
      sectorTid: r.sector_tid != null ? Number(r.sector_tid) : null,
      countryName: r.country_name || null, byline: r.byline || null,
      alias: r.alias || null,
      imgUri: r.img || null,
    });
  }
}

for (let i = 0; i < missingAw.length; i += 60) {
  const ids = missingAw.slice(i, i + 60);
  const rows = await awalanJson(conn, `
    SELECT a.id, a.title, a.description, a.smallDescription, a.customUrlTitle,
           a.customPageTitle, a.metaDescription, a.imgSrc, a.videoUrl, a.isFeatured,
           CONVERT(varchar(33), a.datePublished, 126) AS datePublished,
           (SELECT TOP 1 w.fullName FROM ArticleWriterItem wi JOIN ArticleWriter w ON w.id=wi.articleWriterId WHERE wi.articleId=a.id) AS byline,
           (SELECT TOP 1 CAST(ci.articleCategoryId AS varchar) FROM ArticleCategoryItem ci WHERE ci.articleId=a.id FOR XML PATH('')) AS cats
    FROM Article a WHERE a.id IN (${ids.join(',')})`);
  for (const r of rows) {
    incoming.push({
      source: 'awalan', sourceId: Number(r.id),
      title: stripMarkup(r.title),
      body: r.description || '',
      publishedAt: r.datePublished || null,
      excerpt: r.smallDescription || null,
      metaTitle: r.customPageTitle || null, metaDescription: r.metaDescription || null,
      videoUrl: r.videoUrl || null,
      featured: r.isFeatured === 'True', editorChoice: false,
      awSlug: r.customUrlTitle || null, byline: r.byline || null,
      imgSrc: r.imgSrc || null,
      catIds: (r.cats || '').split(/(?<=\d)(?=\d{1,})/).length ? [] : [],
      rawCats: r.cats || '',
    });
  }
}
conn.end();
log(`fetched ${incoming.length} full rows`);

// awalan category ids need a clean second pass (FOR XML concatenation is lossy)
{
  const conn2 = await sshConnect();
  const awIdsNeeded = incoming.filter(x => x.source === 'awalan').map(x => x.sourceId);
  for (let i = 0; i < awIdsNeeded.length; i += 200) {
    const chunk = awIdsNeeded.slice(i, i + 200);
    if (!chunk.length) break;
    const rows = await awalanJson(conn2, `
      SELECT articleId, articleCategoryId FROM ArticleCategoryItem WHERE articleId IN (${chunk.join(',')})`);
    const byArticle = new Map();
    for (const r of rows) {
      const k = Number(r.articleId);
      if (!byArticle.has(k)) byArticle.set(k, []);
      byArticle.get(k).push(Number(r.articleCategoryId));
    }
    for (const it of incoming) if (it.source === 'awalan' && byArticle.has(it.sourceId)) it.catIds = byArticle.get(it.sourceId);
  }
  conn2.end();
}

// ── cross-masthead dedup: same story, both sites, lands once ────────────────
const DAY = 86400000;
const merged = [];
const fresh = [];
for (const it of incoming) {
  const k = titleKey(it.title);
  const twin = (existingByTitle.get(k) || []).find(e =>
    !e.published_at || !it.publishedAt || Math.abs(new Date(e.published_at) - new Date(it.publishedAt)) / DAY <= 30);
  if (twin) { merged.push({ it, twin }); continue; }
  // also dedup within this batch
  const inBatch = fresh.find(f => titleKey(f.title) === k && f.source !== it.source);
  if (inBatch) { merged.push({ it, twin: { slug: inBatch.slug || '(this batch)' } }); continue; }
  fresh.push(it);
}
log(`title/date duplicates skipped: ${merged.length}`);

// Second identity check: CONTENT. The rebuild matched on body hash as well as
// title, so a story published twice under different headlines (common in Drupal
// — the same piece re-noded with a longer standfirst) was collapsed into one.
// Title matching alone would let those back in as fresh articles, re-creating
// exactly the duplication the rebuild removed.
const bodyHash = (b) => {
  const t = norm(stripMarkup(b)).replace(/\s/g, '');
  return t.length < 120 ? null : createHash('sha1').update(t).digest('hex');
};
const contentDupes = [];
const trulyFresh = [];
for (const it of fresh) {
  const h = bodyHash(it.body);
  if (!h || !it.publishedAt) { trulyFresh.push(it); continue; }
  // only compare against articles published within a week — cheap and sufficient
  const day = String(it.publishedAt).slice(0, 10);
  const { data } = await supabase.from('articles')
    .select('slug, content')
    .gte('published_at', new Date(new Date(day).getTime() - 7 * 86400000).toISOString())
    .lte('published_at', new Date(new Date(day).getTime() + 7 * 86400000).toISOString())
    .eq('status', 'published').limit(400);
  // Exact hash first, then the OPENING of the article. A story republished on
  // the other masthead is routinely re-headlined and lightly re-edited at the
  // tail, so the full body differs — but the lede is carried over verbatim.
  // A measured pair (بن داود / Estonia) differed by 14 characters in 5,779 yet
  // had an identical 150-character opening and 0.996 token overlap; exact-hash
  // matching missed it and both copies went live.
  const openHash = (b) => {
    const t = norm(stripMarkup(b)).replace(/\s/g, '');
    return t.length < 150 ? null : createHash('sha1').update(t.slice(0, 150)).digest('hex');
  };
  const oh = openHash(it.body);
  const hit = (data || []).find(e => bodyHash(e.content) === h || (oh && openHash(e.content) === oh));
  if (hit) contentDupes.push({ it, twin: hit });
  else trulyFresh.push(it);
}
log(`content duplicates skipped:    ${contentDupes.length}`);
fresh.length = 0;
fresh.push(...trulyFresh);
log(`new stories to insert: ${fresh.length}`);

if (DRY) {
  log('\n--dry-run: nothing written');
  fresh.slice(0, 10).forEach(f => log(`  [${f.source}#${f.sourceId}] ${(f.publishedAt||'').slice(0,10)}  ${f.title.slice(0, 60)}`));
  process.exit(0);
}

// ── author resolution: existing people only, never invent one ───────────────
const usersByName = new Map();
{
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('users').select('id, name')
      .order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data.length) break;
    data.forEach(u => usersByName.set(norm(u.name).replace(/\s/g, ''), u.id));
    if (data.length < 1000) break;
    from += 1000;
  }
}
const HOUSE = usersByName.get(norm('الإقتصاد والأعمال').replace(/\s/g, ''));
const MASTHEAD = /اولا|الاقتصاد ?والاعمال|^خاص|وكالات|رويترز/;
const VERBS = ['كتب','بقلم','حاوره','حاورته','أعده','اعده','ترجمة','تحقيق','حوار'];

function authorFor(byline) {
  if (!byline) return HOUSE;
  let n = String(byline).trim();
  for (const v of VERBS) if (n.startsWith(v + ' ')) { n = n.slice(v.length).trim(); break; }
  n = n.replace(/^([؀-ۿ]{3,}(?:\s[؀-ۿ]{3,})?)\s*[-–—]\s*(?=\S)/, '');
  const k = norm(n).replace(/\s/g, '');
  if (MASTHEAD.test(k)) return HOUSE;              // never show a masthead as a person
  return usersByName.get(k) || HOUSE;
}

// ── image: download from source, store under a collision-free path ──────────
async function fetchAsset(url) {
  let t;
  try { t = encodeURI(decodeURI(url)); } catch { t = encodeURI(url); }
  t = t.replace(/^http:/, 'https:');
  for (let a = 1; a <= 3; a++) {
    try {
      const r = await fetch(t, { redirect: 'follow', signal: AbortSignal.timeout(45000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      return buf.length ? buf : null;
    } catch { if (a === 3) return null; await new Promise(x => setTimeout(x, 700 * a)); }
  }
  return null;
}

async function resolveImage(it) {
  let url = null, name = null;
  if (it.source === 'iktissad' && it.imgUri) {
    const rel = String(it.imgUri).replace(/^public:\/\//, '');
    name = rel.split('/').pop();
    url = `https://www.iktissadonline.com/sites/default/files/${rel}`;
  } else if (it.source === 'awalan' && it.imgSrc) {
    name = it.imgSrc;
    // NOTE: /Content/uploads/Articles/ — the other path silently 404s everything
    url = `https://api.awalan.com/Content/uploads/Articles/${it.imgSrc}`;
  }
  if (!url) return '';

  const path = `articles/${it.source}/${it.source}-${it.sourceId}-${legacySanitise(name)}`;
  const publicUrl = PUBLIC + path;

  const { data: exists } = await supabase.storage.from('articles')
    .list(path.split('/').slice(1, -1).join('/'), { search: path.split('/').pop(), limit: 1 });
  if (exists && exists.length) return publicUrl;

  const buf = await fetchAsset(url);
  if (!buf) return '';
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext] || 'image/jpeg';
  const { error } = await supabase.storage.from('articles')
    .upload(path.replace(/^articles\//, ''), buf, { contentType: mime, upsert: true });
  if (error) { warn(`upload ${path}: ${error.message}`); return ''; }
  await supabase.from('media').upsert({
    url: publicUrl, filename: path.split('/').pop(), mime_type: mime, size: buf.length,
    folder: path.split('/').slice(1, -1).join('/'), alt: '', alt_en: '',
  }, { onConflict: 'url' });
  return publicUrl;
}

// ── taxonomy for one incoming row ───────────────────────────────────────────
function taxonomyFor(it) {
  let section = null, sector = null, country = null;
  if (it.source === 'iktissad') {
    const t = it.sectorTid != null ? drupalSectorMap.get(it.sectorTid) : null;
    if (t) { if (t.kind === 'section') section = t.id; else sector = t.id; }
    country = countryIdFor(it.countryName);
  } else {
    for (const cid of it.catIds || []) {
      if (awSectorMap.has(cid)) { const t = awSectorMap.get(cid); if (t && !sector) sector = t.id; }
      else if (awSectionMap.has(cid)) { const t = awSectionMap.get(cid); if (t && !section) section = t.id; }
    }
  }
  return { section, sector, country };
}

// ── unique slug ─────────────────────────────────────────────────────────────
async function uniqueSlug(it) {
  let base = makeSlug(it.title) || `article-${it.source}-${it.sourceId}`;
  const { data } = await supabase.from('articles').select('slug').eq('slug', base).maybeSingle();
  if (!data) return base;
  return `${base}-${it.source}-${it.sourceId}`;
}

// ── insert ──────────────────────────────────────────────────────────────────
let inserted = 0, withImage = 0, failed = 0;
const redirectRows = [];

for (const it of fresh) {
  try {
    const slug = await uniqueSlug(it);
    const tax = taxonomyFor(it);
    const img = await resolveImage(it);
    if (img) withImage++;

    const excerpt = clip(stripMarkup(it.excerpt || '') || firstProse(it.body), 300) || '';
    let desc = stripMarkup(it.metaDescription || '').replace(/\s+/g, ' ').trim();
    if (!desc || desc.length < 50) desc = firstProse(it.body);
    desc = desc ? clip(desc, 160) : null;

    const row = {
      slug, title: it.title, title_en: '',
      excerpt, excerpt_en: '',
      content: it.body, content_en: '',
      featured_image: img,
      section_id: tax.section, sector_id: tax.sector, country_id: tax.country,
      author_id: authorFor(it.byline),
      tags: [], status: 'published',
      published_at: it.publishedAt, created_at: it.publishedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      featured: !!it.featured, editor_choice: !!it.editorChoice,
      video_url: it.videoUrl || null,
      meta_title: clip(stripMarkup(it.metaTitle || '') || it.title, 65),
      meta_description: desc,
      og_image: img || null,
      canonical_url: `${SITE}/${encodeURI(slug)}`,
      source_site: it.source, source_id: it.sourceId,
    };

    const { error } = await supabase.from('articles').insert(row);
    if (error) { failed++; warn(`insert ${it.source}#${it.sourceId}: ${error.message.slice(0, 90)}`); continue; }
    inserted++;

    // legacy URLs for this article work immediately
    if (it.source === 'iktissad') {
      if (it.alias) redirectRows.push({ from_path: '/' + it.alias, to_path: '/' + slug, kind: 'drupal-alias' });
      redirectRows.push({ from_path: `/node/${it.sourceId}`, to_path: '/' + slug, kind: 'drupal-node' });
    } else {
      redirectRows.push({ from_path: `/Article/${it.sourceId}`, to_path: '/' + slug, kind: 'awalan-article-id' });
      if (it.awSlug) {
        redirectRows.push({ from_path: `/Article/${it.sourceId}/${it.awSlug}`, to_path: '/' + slug, kind: 'awalan-article' });
        redirectRows.push({ from_path: '/' + it.awSlug, to_path: '/' + slug, kind: 'awalan-bare-slug' });
      }
    }
    if (inserted % 25 === 0) log(`  inserted ${inserted}/${fresh.length}`);
  } catch (e) {
    failed++; warn(`${it.source}#${it.sourceId}: ${e.message.slice(0, 90)}`);
  }
}

// redirects, skipping any path that is now live content
if (redirectRows.length) {
  const liveSlugs = new Set();
  for (const r of redirectRows) liveSlugs.add(r.to_path);
  const safe = redirectRows.filter(r => !liveSlugs.has(r.from_path));
  for (let i = 0; i < safe.length; i += 500) {
    const { error } = await supabase.from('article_redirects')
      .upsert(safe.slice(i, i + 500), { onConflict: 'from_path' });
    if (error) warn(`redirects: ${error.message.slice(0, 90)}`);
  }
  log(`redirect rows written: ${safe.length}`);
}

log('');
log(`inserted:            ${inserted}`);
log(`  with an image:     ${withImage}`);
log(`cross-masthead dupes skipped: ${merged.length}`);
log(`failed:              ${failed}`);

// ── reconciliation: the number that would have caught the 105-day gap ───────
const { count: nowHave } = await supabase.from('articles')
  .select('id', { count: 'exact', head: true }).eq('status', 'published');
log('');
log(`published on iktissad.com: ${nowHave}`);
log(`source live total:         ${drupalIds.length + awIds.length} (before cross-masthead dedup)`);
