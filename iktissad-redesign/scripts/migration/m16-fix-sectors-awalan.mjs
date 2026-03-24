/**
 * M16 — Re-map awalan article sector_id from awalan SQL Server source of truth
 *
 * m14 deleted old Arabic-slug sectors and nulled sector_id on all articles,
 * including awalan articles. m15 fixed iktissad but skipped awalan.
 * This script re-assigns sector_id for awalan articles by querying their
 * ArticleCategoryItem assignments from the awalan SQL Server.
 *
 * Mapping: awalan ArticleCategory title → new Supabase English slug
 */
import { sshConnect, awQueryRaw, parsePSV, supabase, log, logErr } from './lib.mjs';

const conn = await sshConnect();
log('SSH connected');

// ─── 1. Load new Supabase sector + section IDs ────────────────────────────────

const { data: sectors } = await supabase.from('sectors').select('id, slug, name');
const { data: sections } = await supabase.from('sections').select('id, slug, name');

const sectorById = Object.fromEntries((sectors ?? []).map(s => [s.slug, s.id]));
const sectionById = Object.fromEntries((sections ?? []).map(s => [s.slug, s.id]));

// ─── 2. Awalan ArticleCategory ID → new target ───────────────────────────────
// Mapped by discovery: awalan sector categories live under parentId=1 (قطاعات)
// and editorial sections are top-level categories (parentId=null).
// Keys are awalan ArticleCategory.id as strings.

const CAT_ID_TO_NEW = {
  // Sectors (children of id=1 "قطاعات")
  '21':  { type: 'sector',  slug: 'automotive' },         // سيارات
  '24':  { type: 'sector',  slug: 'finance' },             // مصارف
  '30':  { type: 'sector',  slug: 'energy-environment' },  // طاقة
  '31':  { type: 'sector',  slug: 'transport' },           // نقل
  '32':  { type: 'sector',  slug: 'tourism-entertainment'},// سياحة
  '33':  { type: 'sector',  slug: 'real-estate' },         // عقار
  '34':  { type: 'sector',  slug: 'industry' },            // صناعة
  '35':  { type: 'sector',  slug: 'agriculture' },         // زراعة
  '36':  { type: 'sector',  slug: 'trade' },               // تجزئة (retail → trade)
  '480': { type: 'section', slug: 'technology' },          // الاتصالات → technology section
  '485': { type: 'sector',  slug: 'energy-environment' },  // بتروكيماويات
  '490': { type: 'sector',  slug: 'luxury' },              // ساعات → luxury
  '491': { type: 'sector',  slug: 'health' },              // صحة
  '493': { type: 'sector',  slug: 'investment' },          // استثمار
  // 495: رياضة (sports) — no matching sector in our taxonomy, skip
  // Editorial sections (top-level, parentId=null)
  '5':   { type: 'section', slug: 'economy' },             // اقتصاد
  '6':   { type: 'section', slug: 'markets' },             // أسواق مالية
  '7':   { type: 'section', slug: 'files' },               // ملفات
  '8':   { type: 'section', slug: 'companies' },           // شركات
  '9':   { type: 'section', slug: 'technology' },          // تكنولوجيا
  '11':  { type: 'sector',  slug: 'entrepreneurship' },    // ريادة
  '12':  { type: 'section', slug: 'opinion' },             // رأي
  '38':  { type: 'section', slug: 'files' },               // تحت المجهر → files
  '501': { type: 'section', slug: 'files' },               // تقارير → files
  '502': { type: 'sector',  slug: 'energy-environment' },  // الاقتصاد الأخضر
  '503': { type: 'sector',  slug: 'investment' },          // استثمارات النمو
  '504': { type: 'section', slug: 'technology' },          // ديجيتال → technology
};

// ─── 3. Build catId → target map (direct lookup, no SSH query needed) ─────────

const catIdToTarget = new Map(Object.entries(CAT_ID_TO_NEW));
log(`Using ${catIdToTarget.size} known awalan category ID mappings`);

// ─── 4. Fetch awalan article → category assignments ───────────────────────────

log('Fetching awalan article→category assignments...');
const linkRaw = await awQueryRaw(conn, `
  SELECT aci.articleId, aci.articleCategoryId
  FROM ArticleCategoryItem aci
  JOIN Article a ON a.id = aci.articleId AND a.isPublished = 1 AND a.isDeleted = 0
  ORDER BY aci.articleId, aci.articleCategoryId;
`);
const linkRows = parsePSV(linkRaw);
log(`  Found ${linkRows.length} article→category links`);

// Group by articleId, take first matching sector category
const articleToTarget = new Map();
for (const r of linkRows) {
  const aid = String(r.articleId);
  if (articleToTarget.has(aid)) continue; // already have a sector for this article
  const target = catIdToTarget.get(String(r.articleCategoryId));
  if (target) articleToTarget.set(aid, target);
}
log(`  ${articleToTarget.size} awalan articles have a sector/section assignment`);

// ─── 5. Update Supabase articles ──────────────────────────────────────────────

let ok = 0, skip = 0, fail = 0, noArticle = 0;
const CONCURRENCY = 20;

const entries = [...articleToTarget.entries()];

async function updateOne([awId, target]) {
  const { data: article } = await supabase
    .from('articles')
    .select('id, sector_id, section_id')
    .eq('source_id', parseInt(awId))
    .eq('source_site', 'awalan')
    .maybeSingle();

  if (!article) { noArticle++; return; }

  const update = {};
  if (target.type === 'section') {
    const newId = sectionById[target.slug];
    if (!newId) { fail++; return; }
    update.section_id = newId;
  } else {
    const newId = sectorById[target.slug];
    if (!newId) { fail++; return; }
    update.sector_id = newId;
  }

  const { error } = await supabase
    .from('articles')
    .update(update)
    .eq('id', article.id);

  if (error) { logErr(`awId=${awId}`, error); fail++; }
  else ok++;
}

for (let i = 0; i < entries.length; i += CONCURRENCY) {
  const batch = entries.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(updateOne));

  if ((i + CONCURRENCY) % 500 === 0) {
    log(`  Progress: ${i + CONCURRENCY}/${entries.length} — ok:${ok} skip:${skip} fail:${fail} no-article:${noArticle}`);
  }
}

log(`\n✅ Awalan sector re-mapping done:`);
log(`   ok:          ${ok}`);
log(`   skip:        ${skip}`);
log(`   fail:        ${fail}`);
log(`   no-article:  ${noArticle} (awalan id not found in Supabase)`);

// ─── 6. Verify ────────────────────────────────────────────────────────────────

log('\nVerifying article counts per sector/section (all sources)...');
const allTaxonomy = [
  ...Object.entries(sectorById).map(([slug, id]) => ({ id, slug, type: 'sector' })),
  ...Object.entries(sectionById).map(([slug, id]) => ({ id, slug, type: 'section' })),
];

const results = [];
for (const { id, slug, type } of allTaxonomy) {
  const col = type === 'sector' ? 'sector_id' : 'section_id';
  const { count } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq(col, id)
    .eq('status', 'published');
  if ((count ?? 0) > 0) {
    const entry = type === 'sector'
      ? sectors?.find(s => s.id === id)
      : sections?.find(s => s.id === id);
    results.push({ name: entry?.name, slug, type, count });
  }
}

results.sort((a, b) => b.count - a.count);
for (const r of results) {
  log(`  [${r.type}] ${r.name} (${r.slug}): ${r.count} published articles`);
}

conn.end();
