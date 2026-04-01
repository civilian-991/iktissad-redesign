/**
 * M18 — Migrate awalan Reports (ملفات / dossiers) → article_series + series_articles
 *
 * Awalan structure (inferred from /Report/31/... URL pattern):
 *   ArticleReport    — dossier header (id, title, description, image, ...)
 *   ArticleReportItem — junction: reportId → articleId (or similar)
 *
 * Usage:
 *   node scripts/migration/m18-series-dossiers.mjs
 *   node scripts/migration/m18-series-dossiers.mjs --dry-run
 *   node scripts/migration/m18-series-dossiers.mjs --probe     ← discover table names first
 */

import { sshConnect, awQueryRaw, parsePSV, makeSlug, supabase, log, logErr } from './lib.mjs';

function stripTags(html) {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PROBE   = args.includes('--probe');

const conn = await sshConnect();
log('SSH connected');

// ── PROBE MODE: discover Report-related tables ────────────────────────────────
if (PROBE) {
  log('Probing awalan DB for Report-related tables...');
  const raw = await awQueryRaw(conn, `
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    AND (TABLE_NAME LIKE '%Report%' OR TABLE_NAME LIKE '%Serie%' OR TABLE_NAME LIKE '%Dossier%' OR TABLE_NAME LIKE '%File%')
    ORDER BY TABLE_NAME
  `);
  const rows = parsePSV(raw);
  log('Tables found:');
  rows.forEach(r => log('  ' + Object.values(r)[0]));

  // Also probe columns of any ArticleReport table
  if (rows.length > 0) {
    for (const r of rows) {
      const tbl = Object.values(r)[0];
      const colRaw = await awQueryRaw(conn, `
        SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tbl}' ORDER BY ORDINAL_POSITION
      `);
      const cols = parsePSV(colRaw);
      log(`\nColumns of ${tbl}:`);
      cols.forEach(c => log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    }
  }

  conn.end();
  process.exit(0);
}

// ── STEP 1: Fetch all reports from awalan ─────────────────────────────────────
log('Fetching Report rows from awalan...');
const reportsRaw = await awQueryRaw(conn, `
  SELECT id, title, smallDescription, description, imgSrc, datePublished, isPublished
  FROM Report
  WHERE (isDeleted = 0 OR isDeleted IS NULL) AND isPublished = 1
  ORDER BY id
`);
const reports = parsePSV(reportsRaw);
log(`Found ${reports.length} reports`);

if (reports.length === 0) {
  logErr('No reports found. Run with --probe to discover table structure.');
  conn.end();
  process.exit(1);
}

// ── STEP 2: Fetch all report→article links ────────────────────────────────────
log('Fetching ArticleReportItem rows...');
const itemsRaw = await awQueryRaw(conn, `
  SELECT reportId, articleId, priority
  FROM ArticleReportItem
  WHERE isDeleted = 0 OR isDeleted IS NULL
  ORDER BY reportId, priority
`);
const items = parsePSV(itemsRaw);
log(`Found ${items.length} report-article links`);

// Group items by reportId
const itemsByReport = new Map();
for (const item of items) {
  if (!itemsByReport.has(item.reportId)) itemsByReport.set(item.reportId, []);
  itemsByReport.get(item.reportId).push(item);
}

// ── STEP 3: Build a map of awalan articleId → supabase article id ─────────────
log('Loading awalan→supabase article ID map...');
// Fetch in pages to avoid the 1000-row PostgREST server cap
const sbArticles = [];
let page = 0;
const PAGE_SIZE = 1000;
while (true) {
  const { data: batch } = await supabase
    .from('articles')
    .select('id, slug')
    .not('slug', 'is', null)
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (!batch || batch.length === 0) break;
  sbArticles.push(...batch);
  if (batch.length < PAGE_SIZE) break;
  page++;
}

// Articles migrated from awalan have slugs ending in -aw{id}
const awalanIdToSbId = new Map();
for (const a of sbArticles ?? []) {
  const m = a.slug?.match(/-aw(\d+)$/);
  if (m) awalanIdToSbId.set(m[1], a.id);
}
log(`Mapped ${awalanIdToSbId.size} awalan articles to Supabase IDs`);

// ── STEP 4: Migrate ───────────────────────────────────────────────────────────
let created = 0, skipped = 0, errors = 0;

for (const report of reports) {
  const slug = makeSlug(report.title || `report-${report.id}`);

  log(`\nProcessing: [${report.id}] ${report.title}`);

  if (DRY_RUN) {
    const reportItems = itemsByReport.get(report.id) ?? [];
    const mappedCount = reportItems.filter(i => awalanIdToSbId.has(i.articleId)).length;
    log(`  → DRY RUN: slug="${slug}", articles=${reportItems.length} (${mappedCount} mapped)`);
    continue;
  }

  // Check if already exists
  const { data: existing } = await supabase
    .from('article_series')
    .select('id, slug')
    .eq('slug', slug)
    .single();

  let seriesId;

  if (existing) {
    log(`  → Already exists (${existing.slug}), skipping creation`);
    seriesId = existing.id;
    skipped++;
  } else {
    // Create the series
    const { data: created_series, error: createErr } = await supabase
      .from('article_series')
      .insert({
        slug,
        title: report.title || '',
        title_en: '',
        description: stripTags(report.smallDescription || report.description || ''),
        description_en: '',
        cover_image: report.imgSrc ? `https://api.awalan.com/Content/uploads/reports/${report.imgSrc}` : '',
        status: 'active',
      })
      .select('id')
      .single();

    if (createErr) {
      logErr(`  ✗ Failed to create series: ${createErr.message}`);
      errors++;
      continue;
    }

    seriesId = created_series.id;
    log(`  ✓ Created series: ${slug} (${seriesId})`);
    created++;
  }

  // Link articles
  const reportItems = (itemsByReport.get(report.id) ?? [])
    .sort((a, b) => parseInt(a.priority ?? 0) - parseInt(b.priority ?? 0));

  let linked = 0, missing = 0;

  for (let i = 0; i < reportItems.length; i++) {
    const item = reportItems[i];
    const sbId = awalanIdToSbId.get(String(item.articleId));

    if (!sbId) {
      missing++;
      continue;
    }

    const { error: linkErr } = await supabase
      .from('series_articles')
      .upsert(
        { series_id: seriesId, article_id: sbId, order_index: i },
        { onConflict: 'series_id,article_id' }
      );

    if (linkErr) {
      logErr(`  ✗ Failed to link article ${item.articleId}: ${linkErr.message}`);
    } else {
      linked++;
    }
  }

  log(`  → Linked ${linked} articles (${missing} not found in Supabase)`);
}

conn.end();

log(`\n── Migration complete ──`);
log(`  Created: ${created} series`);
log(`  Skipped (already existed): ${skipped}`);
log(`  Errors: ${errors}`);
