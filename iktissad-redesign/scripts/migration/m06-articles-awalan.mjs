/**
 * M06 — Migrate 17,368 awalan articles → Supabase articles table
 * - Uses PowerShell for proper Unicode (Arabic text)
 * - Fetches in batches of 200
 * - Maps categories → sectors/countries/sections
 * - Tracks progress in scripts/migration/progress-awalan.json
 * - Idempotent: upsert on source_id + source_site
 *
 * Usage:
 *   node scripts/migration/m06-articles-awalan.mjs
 *   node scripts/migration/m06-articles-awalan.mjs --dry-run
 *   node scripts/migration/m06-articles-awalan.mjs --limit 100
 */
import { sshConnect, awQueryRaw, parsePSV, makeSlug, cleanHtml, supabase, log, logErr } from './lib.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = resolve(__dirname, 'progress-awalan.json');
const BATCH = 200;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RESET = args.includes('--reset');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1]) : null; })();

let done = new Set();
if (!RESET && existsSync(PROGRESS_FILE)) {
  done = new Set(JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')));
  log(`Resuming: ${done.size} awalan articles already migrated`);
}

const conn = await sshConnect();
log('SSH connected');

// ── Load Supabase taxonomy maps ───────────────────────────────────────────────
const { data: sectors } = await supabase.from('sectors').select('id, name, slug');
const sectorBySlug = new Map(sectors?.map(s => [s.slug, s.id]) || []);

const { data: countries } = await supabase.from('countries').select('id, name, slug');
const countryBySlug = new Map(countries?.map(c => [c.slug, c.id]) || []);

const { data: users } = await supabase.from('users').select('id, name');
const userByName = new Map(users?.map(u => [u.name, u.id]) || []);

// ── Load awalan ArticleCategory → type mapping ────────────────────────────────
log('Loading awalan categories...');
const catRaw = await awQueryRaw(conn, `
  SELECT id, title, parentId FROM ArticleCategory WHERE isDeleted = 0 OR isDeleted IS NULL ORDER BY id;
`);
const catRows = parsePSV(catRaw);

// Build a map of category ID → { title, parentId }
const catMap = new Map();
for (const c of catRows) {
  catMap.set(c.id, { title: c.title, parentId: c.parentId });
}

// Known top-level category IDs (from discovery)
const SECTOR_PARENT_ID = '2';   // "Sectors"
const COUNTRY_PARENT_ID = '4';  // "Countries"
const OPINION_IDS = new Set(['12', '20']); // رأي / Opinion
const VIDEO_IDS = new Set(['10', '18']);   // فيديو / Video
const BREAKING_IDS = new Set(['478', '38']); // أخبار أولاً

// Categorize a category ID
function categorizeId(id) {
  const cat = catMap.get(String(id));
  if (!cat) return null;
  if (cat.parentId === SECTOR_PARENT_ID) return { type: 'sector', slug: makeSlug(cat.title) };
  if (cat.parentId === COUNTRY_PARENT_ID) return { type: 'country', slug: makeSlug(cat.title) };
  if (OPINION_IDS.has(String(id))) return { type: 'section', slug: 'opinion' };
  if (VIDEO_IDS.has(String(id))) return { type: 'content_type', value: 'video' };
  if (BREAKING_IDS.has(String(id))) return { type: 'breaking' };
  return null;
}

// ── Load awalan writers for author mapping ────────────────────────────────────
log('Loading awalan writers...');
const writerRaw = await awQueryRaw(conn, `SELECT id, fullName FROM ArticleWriter WHERE isDeleted = 0 OR isDeleted IS NULL;`);
const writerRows = parsePSV(writerRaw);
const writerMap = new Map(); // awalan writer id → supabase user uuid
for (const w of writerRows) {
  const uid = userByName.get(w.fullName);
  if (uid) writerMap.set(w.id, uid);
}

// ── Get all article IDs ───────────────────────────────────────────────────────
log('Loading article IDs...');
const idsRaw = await awQueryRaw(conn, `
  SELECT id FROM Article WHERE isPublished = 1 AND isDeleted = 0 ORDER BY datePublished ASC;
`);
const allIds = parsePSV(idsRaw).map(r => r.id).filter(id => !done.has(id));
const toProcess = LIMIT ? allIds.slice(0, LIMIT) : allIds;
log(`Articles to migrate: ${toProcess.length} (${done.size} already done)`);

if (DRY_RUN) {
  log('[DRY RUN] Would migrate ' + toProcess.length + ' articles');
  conn.end();
  process.exit(0);
}

// ── Process in batches ───────────────────────────────────────────────────────
let totalOk = 0, totalFail = 0;

for (let i = 0; i < toProcess.length; i += BATCH) {
  const batch = toProcess.slice(i, i + BATCH);
  const idList = batch.join(',');

  // Fetch full article data
  const raw = await awQueryRaw(conn, `
    SELECT
      a.id, a.title, a.subtitle as subtitle, a.smallDescription as excerpt,
      a.description as content,
      a.imgSrc as image_url,
      a.isPaid as is_paid, a.isFeatured as is_featured,
      a.datePublished as published_at, a.dateCreated as created_at,
      a.dateModified as updated_at,
      a.customUrlTitle as custom_slug,
      a.viewsCount as views,
      (SELECT STRING_AGG(CAST(aci.articleCategoryId AS VARCHAR), CHAR(44))
       FROM ArticleCategoryItem aci WHERE aci.articleId = a.id) as category_ids,
      (SELECT TOP 1 CAST(awi.articleWriterId AS VARCHAR)
       FROM ArticleWriterItem awi WHERE awi.articleId = a.id) as writer_id,
      (SELECT STRING_AGG(at2.title, CHAR(44))
       FROM ArticleTagItem ati
       JOIN ArticleTag at2 ON at2.id = ati.tagId
       WHERE ati.articleId = a.id AND ati.isDeleted = 0) as tags
    FROM Article a
    WHERE a.id IN (${idList})
    AND a.isPublished = 1 AND a.isDeleted = 0
    ORDER BY a.datePublished ASC;
  `);

  const articles = parsePSV(raw);
  const toUpsert = [];

  for (const a of articles) {
    // Skip rows with invalid id (can happen if content has unescaped newlines)
    if (!a.id || isNaN(parseInt(a.id))) continue;

    // Build slug: prefer customUrlTitle, else title + id
    let slug = a.custom_slug && a.custom_slug !== 'NULL'
      ? makeSlug(a.custom_slug)
      : makeSlug(a.title, a.id);
    if (!slug) slug = `awalan-${a.id}`;

    // Map categories
    let sectorId = null, countryId = null, contentType = 'article', isBreaking = false;
    if (a.category_ids) {
      for (const catId of a.category_ids.split(',')) {
        const result = categorizeId(catId.trim());
        if (!result) continue;
        if (result.type === 'sector' && !sectorId) sectorId = sectorBySlug.get(result.slug) || null;
        if (result.type === 'country' && !countryId) countryId = countryBySlug.get(result.slug) || null;
        if (result.type === 'content_type') contentType = result.value;
        if (result.type === 'breaking') isBreaking = true;
        if (result.type === 'section' && result.slug === 'opinion') contentType = 'opinion';
      }
    }

    // Author
    const authorId = a.writer_id ? writerMap.get(String(a.writer_id)) || null : null;

    // Tags
    const tags = a.tags && a.tags !== 'NULL'
      ? a.tags.split(',').map(t => t.trim()).filter(Boolean)
      : null;

    // Image URL — from api.awalan.com
    const imageUrl = a.image_url && a.image_url !== 'NULL'
      ? `https://api.awalan.com/Content/uploads/articles/${a.image_url}`
      : null;

    // Clean HTML
    const cleanContent = cleanHtml(a.content || '', 'https://awalan.com');
    const cleanExcerpt = (a.excerpt && a.excerpt !== 'NULL') ? a.excerpt.replace(/<[^>]*>/g, '').slice(0, 500) : null;

    toUpsert.push({
      title: a.title || '',
      slug,
      excerpt: cleanExcerpt || '',
      content: cleanContent || '',
      featured_image: imageUrl || '',
      status: 'published',
      published_at: a.published_at && a.published_at !== 'NULL' ? a.published_at : null,
      created_at: (a.created_at && a.created_at !== 'NULL' ? a.created_at : null) || (a.published_at && a.published_at !== 'NULL' ? a.published_at : null) || new Date().toISOString(),
      updated_at: (a.updated_at && a.updated_at !== 'NULL' ? a.updated_at : null) || (a.created_at && a.created_at !== 'NULL' ? a.created_at : null) || new Date().toISOString(),
      sector_id: sectorId,
      country_id: countryId,
      author_id: authorId,
      tags: tags || [],
      featured: a.is_featured === 'True',
      is_breaking: isBreaking,
      is_paid: a.is_paid === 'True',
      views: parseInt(a.views) || 0,
      source_site: 'awalan',
      source_id: parseInt(a.id),
      // No legacy_url — awalan uses /Article/[id]/[slug] which we'll handle with a Next.js route
    });
  }

  if (toUpsert.length === 0) continue;

  // Upsert — conflict on source_site + source_id
  const { error } = await supabase
    .from('articles')
    .upsert(toUpsert, { onConflict: 'slug' });

  if (error) {
    logErr(`Batch ${i}–${i + BATCH}`, error);
    for (const art of toUpsert) {
      // Generate unique slug if conflict
      const safeArt = { ...art, slug: `${art.slug}-aw${art.source_id}` };
      const { error: e2 } = await supabase.from('articles').upsert(safeArt, { onConflict: 'slug' });
      if (e2) { logErr(`  Article id=${art.source_id}`, e2); totalFail++; }
      else { done.add(String(art.source_id)); totalOk++; }
    }
  } else {
    toUpsert.forEach(a => done.add(String(a.source_id)));
    totalOk += toUpsert.length;
  }

  writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
  log(`Progress: ${totalOk + done.size} / ${toProcess.length + done.size}`);
}

log(`✅ awalan articles done: ${totalOk} ok, ${totalFail} failed`);
conn.end();
