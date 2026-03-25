/**
 * M05 — Migrate 8,121 Drupal articles → Supabase articles table
 * - Fetches in batches of 100
 * - Cleans HTML content
 * - Maps sector, country, section, author
 * - Tracks progress in scripts/migration/progress-drupal.json
 * - Idempotent: upsert on slug
 *
 * Usage:
 *   node scripts/migration/m05-articles-drupal.mjs
 *   node scripts/migration/m05-articles-drupal.mjs --dry-run
 *   node scripts/migration/m05-articles-drupal.mjs --limit 50
 *   node scripts/migration/m05-articles-drupal.mjs --reset   # start over
 */
import { sshConnect, drupalQuery, parseTSV, makeSlug, cleanHtml, supabase, log, logErr } from './lib.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = resolve(__dirname, 'progress-drupal.json');
const BATCH = 100;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RESET = args.includes('--reset');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1]) : null; })();

// Load progress
let done = new Set();
if (!RESET && existsSync(PROGRESS_FILE)) {
  done = new Set(JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')));
  log(`Resuming: ${done.size} articles already migrated`);
}

const conn = await sshConnect();
log('SSH connected');

// ── Load taxonomy ID → Supabase UUID maps ────────────────────────────────────

// Sectors
const { data: sectors } = await supabase.from('sectors').select('id, name, slug');
const sectorBySlug = new Map(sectors?.map(s => [s.slug, s.id]) || []);

// Countries
const { data: countries } = await supabase.from('countries').select('id, name, slug');
const countryBySlug = new Map(countries?.map(c => [c.slug, c.id]) || []);

// Sections
const { data: sections } = await supabase.from('sections').select('id, name, slug');
const sectionBySlug = new Map(sections?.map(s => [s.slug, s.id]) || []);

// Authors (users with role=author)
const { data: users } = await supabase.from('users').select('id, name');
const userByName = new Map(users?.map(u => [u.name, u.id]) || []);

// Drupal tid → Supabase sector UUID
const drupalSectorRaw = await drupalQuery(conn, `
  SELECT t.tid, t.name FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE v.machine_name = 'ikttaxonomy_sector';
`);
const drupalSectorMap = new Map();
for (const r of parseTSV(drupalSectorRaw)) {
  const slug = makeSlug(r.name);
  const id = sectorBySlug.get(slug);
  if (id) drupalSectorMap.set(r.tid, id);
}

// Drupal tid → Supabase country UUID
const drupalCountryRaw = await drupalQuery(conn, `
  SELECT t.tid, t.name FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE v.machine_name = 'ikttaxonomy_countries';
`);
const drupalCountryMap = new Map();
for (const r of parseTSV(drupalCountryRaw)) {
  const slug = makeSlug(r.name);
  const id = countryBySlug.get(slug);
  if (id) drupalCountryMap.set(r.tid, id);
}

// Drupal tid → Supabase section UUID
const drupalSectionRaw = await drupalQuery(conn, `
  SELECT t.tid, t.name FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE v.machine_name IN ('ikttaxonomy_sections', 'ikttaxonomy_subjects');
`);
const drupalSectionMap = new Map();
for (const r of parseTSV(drupalSectionRaw)) {
  const slug = makeSlug(r.name);
  const id = sectionBySlug.get(slug);
  if (id) drupalSectionMap.set(r.tid, id);
}

// Drupal tid → Supabase author UUID (byline taxonomy)
const drupalAuthorRaw = await drupalQuery(conn, `
  SELECT t.tid, t.name FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE v.machine_name = 'ikttaxonomy_article_by';
`);
const drupalAuthorMap = new Map();
for (const r of parseTSV(drupalAuthorRaw)) {
  const id = userByName.get(r.name);
  if (id) drupalAuthorMap.set(r.tid, id);
}

// ── Get total count & all NIDs ───────────────────────────────────────────────
const totalRaw = await drupalQuery(conn, `
  SELECT nid FROM node WHERE type = 'iktarticle' AND status = 1 ORDER BY created ASC;
`);
const allNids = parseTSV(totalRaw).map(r => r.nid).filter(nid => !done.has(nid));
const nidsToProcess = LIMIT ? allNids.slice(0, LIMIT) : allNids;
log(`Articles to migrate: ${nidsToProcess.length} (${done.size} already done)`);

if (DRY_RUN) {
  log('[DRY RUN] Would migrate ' + nidsToProcess.length + ' articles');
  conn.end();
  process.exit(0);
}

// ── Process in batches ───────────────────────────────────────────────────────
let totalOk = 0, totalFail = 0;

for (let i = 0; i < nidsToProcess.length; i += BATCH) {
  const batch = nidsToProcess.slice(i, i + BATCH);
  const nidList = batch.join(',');

  // Fetch full article data for this batch
  const raw = await drupalQuery(conn, `
    SELECT
      n.nid, n.title, n.status,
      ia.subtitle, ia.articledate, ia.featured_article, ia.article_edit_choice,
      ia.article_sponsored, ia.article_sponsored_party, ia.pin,
      ia.video, ia.source_title,
      b.body_value as content, b.body_summary as excerpt,
      ua.alias as slug,
      n.created, n.changed,
      u.name as author_name,
      fm.uri as image_uri,
      GROUP_CONCAT(DISTINCT fs.iktarticle_sector_taxo_tid) as sector_tids,
      GROUP_CONCAT(DISTINCT fc.iktarticle_countries_taxo_tid) as country_tids,
      GROUP_CONCAT(DISTINCT fsu.iktarticle_subjects_taxo_tid) as section_tids,
      GROUP_CONCAT(DISTINCT fab.iktarticle_articleby_taxo_tid) as author_tids,
      GROUP_CONCAT(DISTINCT ft.field_iktarticle_tags_tid) as tag_tids
    FROM node n
    LEFT JOIN ikt_article ia ON ia.nid = n.nid
    LEFT JOIN field_data_body b ON b.entity_id = n.nid AND b.bundle = 'iktarticle'
    LEFT JOIN url_alias ua ON ua.source = CONCAT('node/', n.nid)
    LEFT JOIN users u ON u.uid = n.uid
    LEFT JOIN field_data_iktarticle_thumbnail fth ON fth.entity_id = n.nid
    LEFT JOIN file_managed fm ON fm.fid = fth.iktarticle_thumbnail_fid
    LEFT JOIN field_data_iktarticle_sector_taxo fs ON fs.entity_id = n.nid
    LEFT JOIN field_data_iktarticle_countries_taxo fc ON fc.entity_id = n.nid
    LEFT JOIN field_data_iktarticle_subjects_taxo fsu ON fsu.entity_id = n.nid
    LEFT JOIN field_data_iktarticle_articleby_taxo fab ON fab.entity_id = n.nid
    LEFT JOIN field_data_field_iktarticle_tags ft ON ft.entity_id = n.nid
    WHERE n.nid IN (${nidList})
    AND n.type = 'iktarticle'
    GROUP BY n.nid
    ORDER BY n.created ASC;
  `);

  const articles = parseTSV(raw);
  const toUpsert = [];

  for (const a of articles) {
    // Skip rows with invalid nid (can happen if content has unescaped newlines)
    if (!a.nid || isNaN(parseInt(a.nid))) continue;

    // Build slug
    let slug = a.slug
      ? a.slug.replace(/^\/?(news\/\d{4}\/\d{2}\/\d{2}\/)?/, '').replace(/\/$/, '')
      : makeSlug(a.title, a.nid);
    if (!slug) slug = `article-${a.nid}`;

    // Map taxonomies
    const sectorId = a.sector_tids
      ? drupalSectorMap.get(a.sector_tids.split(',')[0]) || null
      : null;
    const countryId = a.country_tids
      ? drupalCountryMap.get(a.country_tids.split(',')[0]) || null
      : null;
    const sectionId = a.section_tids
      ? drupalSectionMap.get(a.section_tids.split(',')[0]) || null
      : null;

    // Author: prefer byline taxonomy, fall back to Drupal user
    const authorId = a.author_tids
      ? drupalAuthorMap.get(a.author_tids.split(',')[0]) || null
      : userByName.get(a.author_name) || null;

    // Tags
    const tags = a.tag_tids
      ? a.tag_tids.split(',').map(tid => tid.trim()).filter(Boolean)
      : [];

    // Image URL — still points to old site, will be re-uploaded in m11
    const imageUrl = a.image_uri
      ? 'https://www.iktissadonline.com/sites/default/files/' + a.image_uri.replace('public://', '')
      : null;

    // Clean HTML content
    const cleanContent = cleanHtml(a.content || '');
    const cleanExcerpt = cleanHtml(a.excerpt || a.subtitle || '');

    // Legacy URL for redirect
    const legacyUrl = a.slug ? '/' + a.slug.replace(/^\//, '') : null;

    toUpsert.push({
      title: a.title || '',
      slug,
      excerpt: cleanExcerpt.slice(0, 500) || '',
      content: cleanContent || '',
      featured_image: imageUrl || '',
      status: a.status === '1' ? 'published' : 'draft',
      published_at: a.articledate || null,
      created_at: (a.created && parseInt(a.created) > 0 ? new Date(parseInt(a.created) * 1000).toISOString() : null) || a.articledate || new Date().toISOString(),
      updated_at: (a.changed && parseInt(a.changed) > 0 ? new Date(parseInt(a.changed) * 1000).toISOString() : null) || (a.created && parseInt(a.created) > 0 ? new Date(parseInt(a.created) * 1000).toISOString() : null) || new Date().toISOString(),
      sector_id: sectorId,
      country_id: countryId,
      section_id: sectionId,
      author_id: authorId,
      tags: tags.length > 0 ? tags : [],
      featured: a.featured_article === '1',
      editor_choice: a.article_edit_choice === '1',
      is_breaking: a.pin === '1',
      source_site: 'iktissad',
      source_id: parseInt(a.nid),
      legacy_url: legacyUrl,
    });
  }

  if (toUpsert.length === 0) continue;

  const { error } = await supabase
    .from('articles')
    .upsert(toUpsert, { onConflict: 'slug' });

  if (error) {
    logErr(`Batch ${i}–${i + BATCH}`, error);
    // Try one-by-one
    for (const art of toUpsert) {
      const { error: e2 } = await supabase.from('articles').upsert(art, { onConflict: 'slug' });
      if (e2) {
        logErr(`  Article nid=${art.source_id}: ${art.title?.slice(0, 40)}`, e2);
        totalFail++;
      } else {
        done.add(String(art.source_id));
        totalOk++;
      }
    }
  } else {
    toUpsert.forEach(a => done.add(String(a.source_id)));
    totalOk += toUpsert.length;
  }

  // Save progress every batch
  writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
  log(`Progress: ${totalOk + done.size} / ${nidsToProcess.length + done.size} (batch ok=${toUpsert.length})`);
}

log(`✅ Drupal articles done: ${totalOk} ok, ${totalFail} failed`);
conn.end();
