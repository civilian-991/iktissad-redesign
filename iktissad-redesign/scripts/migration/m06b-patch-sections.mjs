/**
 * M06B — Patch section_id for already-migrated awalan articles
 *
 * Problem: m06 migrated 17k+ articles but never set section_id for videos/opinion.
 * This script fixes that without re-migrating everything.
 *
 * What it does:
 *   1. Ensures `videos` and `opinion` sections exist in Supabase
 *   2. SSH → awalan DB → fetch all article IDs in video/opinion categories
 *   3. UPDATE articles in Supabase SET section_id WHERE source_site='awalan' AND source_id IN (...)
 *
 * Usage:
 *   node scripts/migration/m06b-patch-sections.mjs
 *   node scripts/migration/m06b-patch-sections.mjs --dry-run
 */
import { sshConnect, awQueryRaw, parsePSV, supabase, log, logErr } from './lib.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
if (DRY_RUN) log('DRY RUN — no writes to Supabase');

// ── 1. Ensure sections exist ──────────────────────────────────────────────────
log('Ensuring videos + opinion sections exist in Supabase...');

const sectionsToEnsure = [
  {
    id: 'a0000000-0000-0000-0000-000000000007',
    slug: 'videos',
    name: 'فيديو',
    name_en: 'Videos',
    description: 'مقاطع الفيديو والمحتوى المرئي الاقتصادي والمالي',
    description_en: 'Economic and financial video content',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000008',
    slug: 'opinion',
    name: 'رأي',
    name_en: 'Opinion',
    description: 'مقالات الرأي والتحليلات من كبار الكتاب والمحللين الاقتصاديين',
    description_en: 'Opinion articles and analysis from leading economic writers and analysts',
  },
];

// Insert sections only if the slug doesn't already exist (never overwrite id — FK safety)
const { data: existingSections } = await supabase.from('sections').select('slug');
const existingSlugs = new Set(existingSections?.map(s => s.slug) || []);

for (const sec of sectionsToEnsure) {
  if (existingSlugs.has(sec.slug)) {
    log(`Section '${sec.slug}' already exists — skipping insert`);
    continue;
  }
  const { error: insErr } = await supabase.from('sections').insert(sec);
  if (insErr) { logErr(`Failed to insert section '${sec.slug}'`, insErr); process.exit(1); }
  log(`Inserted section '${sec.slug}'`);
}
log('Sections ready.');

// ── 2. Load section IDs from Supabase ─────────────────────────────────────────
const { data: sections } = await supabase.from('sections').select('id, slug');
const sectionBySlug = new Map(sections?.map(s => [s.slug, s.id]) || []);

const videosSectionId = sectionBySlug.get('videos');
const opinionSectionId = sectionBySlug.get('opinion');

if (!videosSectionId) { log('ERROR: videos section not found in Supabase'); process.exit(1); }
if (!opinionSectionId) { log('ERROR: opinion section not found in Supabase'); process.exit(1); }
log(`videos section id: ${videosSectionId}`);
log(`opinion section id: ${opinionSectionId}`);

// ── 3. SSH → awalan DB: fetch article IDs by category ─────────────────────────
log('SSH connecting to awalan DB...');
const conn = await sshConnect();
log('SSH connected');

// Known category IDs
const VIDEO_IDS   = ['10', '18'];
const OPINION_IDS = ['12', '20'];

async function getArticleIdsForCategories(catIds) {
  const inList = catIds.map(id => `'${id}'`).join(', ');
  const raw = await awQueryRaw(conn, `
    SELECT DISTINCT aci.articleId
    FROM ArticleCategoryItem aci
    WHERE aci.articleCategoryId IN (${inList})
  `);
  const rows = parsePSV(raw);
  return rows.map(r => parseInt(r.articleId)).filter(Boolean);
}

log('Fetching video article IDs from awalan...');
const videoSourceIds = await getArticleIdsForCategories(VIDEO_IDS);
log(`Found ${videoSourceIds.length} video articles`);

log('Fetching opinion article IDs from awalan...');
const opinionSourceIds = await getArticleIdsForCategories(OPINION_IDS);
log(`Found ${opinionSourceIds.length} opinion articles`);

conn.end();

// ── 4. Batch UPDATE in Supabase ───────────────────────────────────────────────
const BATCH = 500;

async function patchSectionId(sourceIds, sectionId, label) {
  if (sourceIds.length === 0) { log(`No ${label} articles to patch`); return; }
  let updated = 0;
  for (let i = 0; i < sourceIds.length; i += BATCH) {
    const batch = sourceIds.slice(i, i + BATCH);
    if (DRY_RUN) {
      log(`[DRY RUN] Would UPDATE ${batch.length} ${label} articles (batch ${Math.floor(i/BATCH)+1})`);
      updated += batch.length;
      continue;
    }
    const { error, count } = await supabase
      .from('articles')
      .update({ section_id: sectionId })
      .eq('source_site', 'awalan')
      .in('source_id', batch);
    if (error) {
      logErr(`Failed to patch ${label} batch ${Math.floor(i/BATCH)+1}`, error);
    } else {
      updated += batch.length;
      log(`Patched ${label} batch ${Math.floor(i/BATCH)+1}: ${batch.length} articles (total so far: ${updated})`);
    }
  }
  log(`✅ ${label}: ${updated} articles updated`);
}

await patchSectionId(videoSourceIds,   videosSectionId,   'videos');
await patchSectionId(opinionSourceIds, opinionSectionId,  'opinion');

log('✅ M06B patch complete');
