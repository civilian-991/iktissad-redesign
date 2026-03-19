/**
 * Script 1: Export Drupal MySQL → drupal-export.json
 * Run on Mac: node scripts/1-export-drupal.js
 * Requires: npm install mysql2
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB = {
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'migrate123',
  database: 'iktissad',
  charset: 'utf8mb4',
};

// Map Drupal sector tids → new slug
const SECTOR_MAP = {
  1782: 'oil-gas',
  1400: 'energy',
  1784: 'energy',
  1395: 'technology',
  1768: 'banking',
  1394: 'aviation',
  1769: 'real-estate',
  1786: 'economics',
  1788: 'companies',
  1783: 'energy',
  1787: 'transport',
  1772: 'automotive',
  1771: 'luxury',
  1785: 'luxury',
  2071: 'business',
  2112: 'health',
  2113: 'education',
  2114: 'environment',
  2111: 'society',
};

// Map Drupal section tids → new slug
const SECTION_MAP = {
  1340: 'economics',
  1341: 'economics',
  1342: 'economics',
  1343: 'economics',
  1344: 'economics',
  1345: 'economics',
  1786: 'economics',
  1384: 'markets',
  1337: 'markets',
  1354: 'markets',
  1368: 'companies',
  1388: 'companies',
  1395: 'technology',
  1350: 'technology',
  1352: 'energy',
  1372: 'energy',
  1373: 'investment',
  1361: 'investment',
  1346: 'economics',
  1385: 'economics',
  1387: 'economics',
  1363: 'economics',
  1356: 'markets',
  1374: 'economics',
  1375: 'investment',
  1334: 'economics',
  1333: 'economics',
  1332: 'economics',
  1331: 'economics',
};

async function main() {
  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection(DB);

  console.log('Fetching articles...');
  const [articles] = await conn.query(`
    SELECT
      n.nid,
      n.title,
      n.status,
      ia.subtitle,
      ia.articledate,
      b.body_value   AS content,
      b.body_summary AS excerpt,
      fm.uri         AS image_uri,
      fm.filename    AS image_filename,
      ua.alias       AS url_alias
    FROM node n
    JOIN ikt_article ia ON ia.nid = n.nid
    LEFT JOIN field_data_body b ON b.entity_id = n.nid AND b.bundle = 'iktarticle'
    LEFT JOIN field_data_iktarticle_thumbnail t ON t.entity_id = n.nid
    LEFT JOIN file_managed fm ON fm.fid = t.iktarticle_thumbnail_fid
    LEFT JOIN url_alias ua ON ua.source = CONCAT('node/', n.nid)
    ORDER BY ia.articledate DESC
  `);

  console.log(`Found ${articles.length} articles. Fetching taxonomy...`);

  // Fetch sector per article
  const [sectors] = await conn.query(`
    SELECT entity_id AS nid, iktarticle_sector_taxo_tid AS tid
    FROM field_data_iktarticle_sector_taxo
  `);
  const sectorMap = {};
  sectors.forEach(r => { sectorMap[r.nid] = r.tid; });

  // Fetch section per article
  const [sections] = await conn.query(`
    SELECT entity_id AS nid, iktarticle_subjects_taxo_tid AS tid
    FROM field_data_iktarticle_subjects_taxo
  `);
  const sectionMap = {};
  sections.forEach(r => { sectionMap[r.nid] = r.tid; });

  // Fetch country per article (first country only)
  const [countries] = await conn.query(`
    SELECT entity_id AS nid, MIN(iktarticle_countries_taxo_tid) AS tid
    FROM field_data_iktarticle_countries_taxo
    GROUP BY entity_id
  `);
  const countryTidMap = {};
  countries.forEach(r => { countryTidMap[r.nid] = r.tid; });

  // Fetch country names
  const [countryTerms] = await conn.query(`
    SELECT tid, name FROM taxonomy_term_data WHERE vid = 2
  `);
  const countryNames = {};
  countryTerms.forEach(r => { countryNames[r.tid] = r.name; });

  // Fetch tags per article
  const [tags] = await conn.query(`
    SELECT t.entity_id AS nid, td.name
    FROM field_data_field_iktarticle_tags t
    JOIN taxonomy_term_data td ON td.tid = t.field_iktarticle_tags_tid
  `);
  const tagMap = {};
  tags.forEach(r => {
    if (!tagMap[r.nid]) tagMap[r.nid] = [];
    tagMap[r.nid].push(r.name);
  });

  await conn.end();

  // Build export
  const output = articles.map(a => {
    // Convert public://path to URL path
    const imageUri = a.image_uri
      ? a.image_uri.replace('public://', 'sites/default/files/')
      : null;

    // Generate slug from url_alias or nid
    let slug = a.url_alias
      ? a.url_alias.replace(/^\//, '').replace(/\//g, '-')
      : `article-${a.nid}`;
    slug = slug.replace(/[^a-zA-Z0-9\u0600-\u06FF\-]/g, '-').replace(/-+/g, '-').substring(0, 200);

    const sectorTid = sectorMap[a.nid];
    const sectionTid = sectionMap[a.nid];
    const countryTid = countryTidMap[a.nid];

    return {
      nid: a.nid,
      slug,
      title: a.title || '',
      excerpt: a.excerpt || a.subtitle || '',
      content: a.content || '',
      image_uri: imageUri,
      image_filename: a.image_filename || null,
      published_at: a.articledate,
      status: a.status === 1 ? 'published' : 'draft',
      sector_slug: SECTOR_MAP[sectorTid] || null,
      section_slug: SECTION_MAP[sectionTid] || 'economics',
      country_name: countryTid ? countryNames[countryTid] : null,
      tags: tagMap[a.nid] || [],
    };
  });

  const outPath = path.join(__dirname, 'drupal-export.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`✅ Exported ${output.length} articles to scripts/drupal-export.json`);

  // Summary
  const withImages = output.filter(a => a.image_uri).length;
  const published = output.filter(a => a.status === 'published').length;
  console.log(`   Published: ${published} | With images: ${withImages}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
