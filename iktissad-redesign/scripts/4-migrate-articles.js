/**
 * Script 4: Migrate article data (no images) from Drupal MySQL → Supabase
 * Run locally: node scripts/4-migrate-articles.js
 * Images will be updated separately by script 2 running on Windows server.
 */

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const DB = {
  host: '127.0.0.1', port: 3307,
  user: 'root', password: 'migrate123',
  database: 'iktissad', charset: 'utf8mb4',
};

const supabase = createClient(
  'https://vqdxinosmzezjveliemb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZHhpbm9zbXplemp2ZWxpZW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY2NDgyNiwiZXhwIjoyMDg5MjQwODI2fQ.3JWT3VDRYvxLjxdTCXcLmeBqpV_tBru40jLTw9l4Pz0'
);

const PROGRESS_FILE = path.join(__dirname, 'articles-progress.json');
const BATCH_SIZE = 50;

const SECTOR_MAP = {
  1782: 'oil-gas', 1400: 'energy', 1784: 'energy', 1395: 'technology',
  1768: 'banking', 1394: 'aviation', 1769: 'real-estate', 1786: 'economics',
  1788: 'companies', 1783: 'energy', 1787: 'transport', 1772: 'automotive',
  1771: 'luxury', 1785: 'luxury', 2071: 'business', 2112: 'health',
  2113: 'education', 2114: 'environment', 2111: 'society',
};

const SECTION_MAP = {
  1340: 'economics', 1341: 'economics', 1342: 'economics', 1343: 'economics',
  1344: 'economics', 1345: 'economics', 1384: 'markets', 1337: 'markets',
  1354: 'markets', 1368: 'companies', 1395: 'technology', 1350: 'technology',
  1352: 'energy', 1372: 'energy', 1373: 'investment', 1361: 'investment',
  1346: 'economics', 1385: 'economics', 1363: 'economics', 1356: 'markets',
  1375: 'investment', 1334: 'economics', 1333: 'economics',
};

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) return new Set(JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')));
  return new Set();
}
function saveProgress(done) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
}

async function main() {
  const conn = await mysql.createConnection(DB);
  console.log('Loading articles from MySQL...');

  const [articles] = await conn.query(`
    SELECT n.nid, n.title, n.status, ia.subtitle, ia.articledate,
           b.body_value AS content, b.body_summary AS excerpt,
           fm.uri AS image_uri, fm.filename AS image_filename,
           ua.alias AS url_alias
    FROM node n
    JOIN ikt_article ia ON ia.nid = n.nid
    LEFT JOIN field_data_body b ON b.entity_id = n.nid AND b.bundle = 'iktarticle'
    LEFT JOIN field_data_iktarticle_thumbnail t ON t.entity_id = n.nid
    LEFT JOIN file_managed fm ON fm.fid = t.iktarticle_thumbnail_fid
    LEFT JOIN url_alias ua ON ua.source = CONCAT('node/', n.nid)
    ORDER BY ia.articledate DESC
  `);

  const [sectors]   = await conn.query(`SELECT entity_id AS nid, iktarticle_sector_taxo_tid AS tid FROM field_data_iktarticle_sector_taxo`);
  const [sections]  = await conn.query(`SELECT entity_id AS nid, iktarticle_subjects_taxo_tid AS tid FROM field_data_iktarticle_subjects_taxo`);
  const [countries] = await conn.query(`SELECT entity_id AS nid, MIN(iktarticle_countries_taxo_tid) AS tid FROM field_data_iktarticle_countries_taxo GROUP BY entity_id`);
  const [countryTerms] = await conn.query(`SELECT tid, name FROM taxonomy_term_data WHERE vid = 2`);
  const [tags] = await conn.query(`
    SELECT t.entity_id AS nid, td.name
    FROM field_data_field_iktarticle_tags t
    JOIN taxonomy_term_data td ON td.tid = t.field_iktarticle_tags_tid
  `);

  await conn.end();

  // Build lookup maps
  const sectorMap = {}, sectionMap = {}, countryTidMap = {}, countryNames = {}, tagMap = {};
  sectors.forEach(r => { sectorMap[r.nid] = r.tid; });
  sections.forEach(r => { sectionMap[r.nid] = r.tid; });
  countries.forEach(r => { countryTidMap[r.nid] = r.tid; });
  countryTerms.forEach(r => { countryNames[r.tid] = r.name; });
  tags.forEach(r => { if (!tagMap[r.nid]) tagMap[r.nid] = []; tagMap[r.nid].push(r.name); });

  // Load Supabase lookups
  const [{ data: dbSections }, { data: dbSectors }, { data: dbCountries }] = await Promise.all([
    supabase.from('sections').select('id, slug'),
    supabase.from('sectors').select('id, slug'),
    supabase.from('countries').select('id, name'),
  ]);
  const sectionById = {}, sectorById = {}, countryByName = {};
  dbSections?.forEach(s => { sectionById[s.slug] = s.id; });
  dbSectors?.forEach(s => { sectorById[s.slug] = s.id; });
  dbCountries?.forEach(c => { countryByName[c.name] = c.id; });

  console.log(`${articles.length} articles loaded. Starting migration...\n`);

  const done = loadProgress();
  console.log(`Resuming — ${done.size} already done`);
  const remaining = articles.filter(a => !done.has(String(a.nid)));
  console.log(`Migrating ${remaining.length} remaining...\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (a) => {
      // Take only the last path segment of the Drupal alias (strip /news/YYYY-MM-DD/ prefix)
      // Then strip HTML tags (e.g. <br>), clean to URL-safe chars, deduplicate hyphens
      const rawAlias = a.url_alias
        ? a.url_alias.replace(/^\//, '').split('/').pop()
        : `article-${a.nid}`;
      let slug = (rawAlias || `article-${a.nid}`)
        .replace(/<[^>]*>/g, '')                          // strip HTML tags
        .replace(/&[a-zA-Z0-9#]+;/g, '')                 // strip HTML entities
        .replace(/[^a-zA-Z0-9\u0600-\u06FF\-]/g, '-')    // non-slug chars → hyphen
        .replace(/-+/g, '-')                              // collapse hyphens
        .replace(/^-|-$/g, '')                            // trim leading/trailing
        .substring(0, 200);

      const sectorTid = sectorMap[a.nid];
      const sectionTid = sectionMap[a.nid];
      const countryTid = countryTidMap[a.nid];
      const countryName = countryTid ? countryNames[countryTid] : null;

      let countryId = countryName ? countryByName[countryName] : null;
      if (!countryId && countryName) {
        const key = Object.keys(countryByName).find(k => k.includes(countryName) || countryName.includes(k));
        if (key) countryId = countryByName[key];
      }

      // placeholder image URL — will be overwritten by script 2 on Windows server
      const imageUri = a.image_uri ? a.image_uri.replace('public://', 'sites/default/files/') : null;
      const featuredImage = imageUri
        ? `https://www.iktissadonline.com/${imageUri}`
        : '';

      const row = {
        slug,
        title: a.title || '',
        title_en: '',
        excerpt: a.excerpt || a.subtitle || '',
        excerpt_en: '',
        content: a.content || '',
        content_en: '',
        featured_image: featuredImage,
        section_id: SECTION_MAP[sectionTid] ? sectionById[SECTION_MAP[sectionTid]] || null : null,
        sector_id:  SECTOR_MAP[sectorTid]  ? sectorById[SECTOR_MAP[sectorTid]]   || null : null,
        country_id: countryId || null,
        tags: tagMap[a.nid] || [],
        status: a.status === 1 ? 'published' : 'draft',
        published_at: a.status === 1 ? a.articledate : null,
        created_at: a.articledate,
        updated_at: a.articledate,
      };

      const { error } = await supabase.from('articles').upsert(row, { onConflict: 'slug' });
      if (error) { failed++; }
      else { done.add(String(a.nid)); success++; }
    }));

    saveProgress(done);
    const pct = Math.round(((i + batch.length) / remaining.length) * 100);
    process.stdout.write(`\r  ${i + batch.length}/${remaining.length} (${pct}%) — ✅ ${success} | ❌ ${failed}`);
  }

  console.log(`\n\n✅ Done! ${success} articles migrated, ${failed} failed.`);
  console.log(`featured_image is set to old site URL for now — run script 2 on Windows server to upload to Supabase storage.`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
