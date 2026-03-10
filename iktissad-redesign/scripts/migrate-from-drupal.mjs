/**
 * Migration script: Drupal 7 MySQL → Supabase PostgreSQL
 * Usage:
 *   node scripts/migrate-from-drupal.mjs            # migrate all
 *   node scripts/migrate-from-drupal.mjs --dry-run  # preview only
 *   node scripts/migrate-from-drupal.mjs --limit 100
 */

import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const MYSQL = {
  host: '127.0.0.1', port: 3307,
  user: 'root', password: 'migrate123',
  database: 'iktissad', charset: 'utf8mb4',
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FILES_BASE_URL = 'https://www.iktissadonline.com/sites/default/files';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i+1]) : null; })();

function drupalUriToUrl(uri) {
  if (!uri) return '';
  return FILES_BASE_URL + '/' + uri.replace('public://', '');
}

function fromUnix(ts) {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

function slugify(text, suffix = '') {
  if (!text) return suffix ? `article-${suffix}` : '';
  const slug = text
    .toLowerCase().trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
  return suffix ? `${slug || 'article'}-${suffix}` : slug;
}

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

async function main() {
  if (!SUPABASE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

  log(`Starting migration${DRY_RUN ? ' (DRY RUN)' : ''}${LIMIT ? ` limit:${LIMIT}` : ''}`);

  const db = await mysql.createConnection({ ...MYSQL, namedPlaceholders: true });
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── 1. Sectors ──────────────────────────────────────────────────────────────
  log('Migrating sectors...');
  const [sectors] = await db.query(`
    SELECT t.tid, t.name, t.description FROM taxonomy_term_data t
    JOIN taxonomy_vocabulary v ON v.vid = t.vid
    WHERE v.machine_name = 'ikttaxonomy_sector' ORDER BY t.tid
  `);

  const sectorNameToId = {}; // name → supabase uuid

  if (!DRY_RUN) {
    for (const s of sectors) {
      const slug = slugify(s.name);
      if (!slug) continue;
      const { data, error } = await sb.from('sectors')
        .upsert({ name: s.name, slug, description: s.description || null }, { onConflict: 'slug' })
        .select('id, name').single();
      if (error) console.error('  Sector error:', error.message, s.name);
      else sectorNameToId[s.name] = data.id;
    }
    // Re-fetch all to get IDs for ones that already existed
    const { data: allSectors } = await sb.from('sectors').select('id, name');
    allSectors?.forEach(s => { sectorNameToId[s.name] = s.id; });
    log(`  ✓ ${sectors.length} sectors — ${Object.keys(sectorNameToId).length} mapped`);
  } else {
    sectors.forEach(s => { sectorNameToId[s.name] = 'uuid-placeholder'; });
    log(`  [dry] ${sectors.length} sectors`);
  }

  // ── 2. Countries ────────────────────────────────────────────────────────────
  log('Migrating countries...');
  const [countries] = await db.query(`
    SELECT t.tid, t.name, t.description FROM taxonomy_term_data t
    JOIN taxonomy_vocabulary v ON v.vid = t.vid
    WHERE v.machine_name = 'ikttaxonomy_countries' ORDER BY t.tid
  `);

  const countryNameToId = {};

  if (!DRY_RUN) {
    for (const c of countries) {
      const slug = slugify(c.name);
      if (!slug) continue;
      const { data, error } = await sb.from('countries')
        .upsert({ name: c.name, slug, economic_overview: c.description || null }, { onConflict: 'slug' })
        .select('id, name').single();
      if (error) console.error('  Country error:', error.message, c.name);
      else countryNameToId[c.name] = data.id;
    }
    const { data: allCountries } = await sb.from('countries').select('id, name');
    allCountries?.forEach(c => { countryNameToId[c.name] = c.id; });
    log(`  ✓ ${countries.length} countries — ${Object.keys(countryNameToId).length} mapped`);
  } else {
    countries.forEach(c => { countryNameToId[c.name] = 'uuid-placeholder'; });
    log(`  [dry] ${countries.length} countries`);
  }

  // ── 3. Sections ─────────────────────────────────────────────────────────────
  log('Migrating sections...');
  const [sections] = await db.query(`
    SELECT t.tid, t.name, t.description FROM taxonomy_term_data t
    JOIN taxonomy_vocabulary v ON v.vid = t.vid
    WHERE v.machine_name = 'ikttaxonomy_subjects' ORDER BY t.tid
  `);

  const sectionNameToId = {};

  if (!DRY_RUN) {
    for (const s of sections) {
      const slug = slugify(s.name);
      if (!slug) continue;
      const { data, error } = await sb.from('sections')
        .upsert({ name: s.name, slug, description: s.description || null }, { onConflict: 'slug' })
        .select('id, name').single();
      if (error) console.error('  Section error:', error.message, s.name);
      else sectionNameToId[s.name] = data.id;
    }
    const { data: allSections } = await sb.from('sections').select('id, name');
    allSections?.forEach(s => { sectionNameToId[s.name] = s.id; });
    log(`  ✓ ${sections.length} sections — ${Object.keys(sectionNameToId).length} mapped`);
  } else {
    sections.forEach(s => { sectionNameToId[s.name] = 'uuid-placeholder'; });
    log(`  [dry] ${sections.length} sections`);
  }

  // ── 4. Build taxonomy lookup maps (tid → name) ───────────────────────────────
  const sectorTidToName = {};
  sectors.forEach(s => { sectorTidToName[s.tid] = s.name; });
  const countryTidToName = {};
  countries.forEach(c => { countryTidToName[c.tid] = c.name; });
  const sectionTidToName = {};
  sections.forEach(s => { sectionTidToName[s.tid] = s.name; });

  // ── 5. Author map ────────────────────────────────────────────────────────────
  log('Building author map...');
  const [authors] = await db.query(`
    SELECT u.uid, u.name, u.mail,
      fn.field_profile_first_name_value as first_name,
      ln.field_profile_last_name_value as last_name
    FROM users u
    LEFT JOIN field_data_field_profile_first_name fn ON fn.entity_id = u.uid AND fn.entity_type = 'user'
    LEFT JOIN field_data_field_profile_last_name ln ON ln.entity_id = u.uid AND ln.entity_type = 'user'
    WHERE u.uid > 0
  `);
  const authorMap = {};
  for (const a of authors) {
    authorMap[a.uid] = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.name;
  }
  log(`  ✓ ${authors.length} authors`);

  // ── 6. Article taxonomy associations ─────────────────────────────────────────
  log('Fetching article taxonomy associations...');

  const [sectorRows] = await db.query(`SELECT entity_id as nid, iktarticle_sector_taxo_tid as tid FROM field_data_iktarticle_sector_taxo ORDER BY delta ASC`);
  const artSector = {};
  for (const r of sectorRows) if (!artSector[r.nid]) artSector[r.nid] = r.tid;

  const [countryRows] = await db.query(`SELECT entity_id as nid, iktarticle_countries_taxo_tid as tid FROM field_data_iktarticle_countries_taxo ORDER BY delta ASC`);
  const artCountry = {};
  for (const r of countryRows) if (!artCountry[r.nid]) artCountry[r.nid] = r.tid;

  const [sectionRows] = await db.query(`SELECT entity_id as nid, field_iktarticle_sections_tid as tid FROM field_data_field_iktarticle_sections ORDER BY delta ASC`);
  const artSection = {};
  for (const r of sectionRows) if (!artSection[r.nid]) artSection[r.nid] = r.tid;

  const [tagRows] = await db.query(`
    SELECT tf.entity_id as nid, t.name as tag
    FROM field_data_field_iktarticle_tags tf
    JOIN taxonomy_term_data t ON t.tid = tf.field_iktarticle_tags_tid
    ORDER BY tf.delta ASC
  `);
  const artTags = {};
  for (const r of tagRows) { if (!artTags[r.nid]) artTags[r.nid] = []; artTags[r.nid].push(r.tag); }

  log('  ✓ Taxonomy lookups ready');

  // ── 7. Articles ──────────────────────────────────────────────────────────────
  log('Migrating articles...');
  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : '';
  const [articles] = await db.query(`
    SELECT
      n.nid, n.title, n.uid, n.status, n.created, n.changed,
      ia.featured_article,
      ANY_VALUE(b.body_value) as content,
      ANY_VALUE(b.body_summary) as excerpt,
      ANY_VALUE(fm_promo.uri) as promo_uri,
      ANY_VALUE(fm_thumb.uri) as thumb_uri
    FROM node n
    JOIN ikt_article ia ON ia.nid = n.nid
    LEFT JOIN field_data_body b ON b.entity_id = n.nid AND b.bundle = 'iktarticle'
    LEFT JOIN field_data_iktarticle_promoted_image promo ON promo.entity_id = n.nid
    LEFT JOIN file_managed fm_promo ON fm_promo.fid = promo.iktarticle_promoted_image_fid
    LEFT JOIN field_data_iktarticle_thumbnail thumb ON thumb.entity_id = n.nid
    LEFT JOIN file_managed fm_thumb ON fm_thumb.fid = thumb.iktarticle_thumbnail_fid
    WHERE n.type = 'iktarticle'
    GROUP BY n.nid, n.title, n.uid, n.status, n.created, n.changed, ia.featured_article
    ORDER BY n.created ASC
    ${limitClause}
  `);

  log(`  Found ${articles.length} articles`);

  if (DRY_RUN) {
    const a = articles[0];
    const sName = sectorTidToName[artSector[a.nid]];
    const cName = countryTidToName[artCountry[a.nid]];
    const secName = sectionTidToName[artSection[a.nid]];
    console.log('  Sample:', JSON.stringify({
      title: a.title,
      slug: slugify(a.title, a.nid),
      sector_id: sName ? `[uuid for: ${sName}]` : null,
      country_id: cName ? `[uuid for: ${cName}]` : null,
      section_id: secName ? `[uuid for: ${secName}]` : null,
      tags: artTags[a.nid] || [],
      featured_image: drupalUriToUrl(a.promo_uri) || drupalUriToUrl(a.thumb_uri),
      status: a.status === 1 ? 'published' : 'draft',
      published_at: fromUnix(a.created),
    }, null, 2));
    log(`  [dry] Would insert ${articles.length} articles`);
  } else {
    let inserted = 0, failed = 0;
    const BATCH = 50;

    for (let i = 0; i < articles.length; i += BATCH) {
      const batch = articles.slice(i, i + BATCH);

      const rows = batch.map(a => {
        const sName = sectorTidToName[artSector[a.nid]];
        const cName = countryTidToName[artCountry[a.nid]];
        const secName = sectionTidToName[artSection[a.nid]];

        return {
          title: a.title,
          slug: slugify(a.title, a.nid),
          excerpt: a.excerpt || '',
          content: a.content || '',
          featured_image: drupalUriToUrl(a.promo_uri) || drupalUriToUrl(a.thumb_uri),
          sector_id: sName ? (sectorNameToId[sName] || null) : null,
          country_id: cName ? (countryNameToId[cName] || null) : null,
          section_id: secName ? (sectionNameToId[secName] || null) : null,
          tags: artTags[a.nid] || [],
          status: a.status === 1 ? 'published' : 'draft',
          views: 0,
          published_at: fromUnix(a.created),
          created_at: fromUnix(a.created),
          updated_at: fromUnix(a.changed),
        };
      });

      const { error } = await sb.from('articles').insert(rows);
      if (error) {
        console.error(`  Batch ${Math.floor(i/BATCH)+1} error:`, error.message);
        failed += batch.length;
      } else {
        inserted += batch.length;
      }

      if (inserted > 0 && inserted % 1000 === 0) log(`  Progress: ${inserted}/${articles.length}`);
    }

    log(`  ✓ Articles: ${inserted} inserted, ${failed} failed`);
  }

  // ── 8. Magazine Issues ───────────────────────────────────────────────────────
  log('Migrating magazine issues...');
  const [issues] = await db.query(`
    SELECT
      n.nid, n.title, n.status, n.created,
      ANY_VALUE(fm_pdf.uri) as pdf_uri,
      ANY_VALUE(fm_cover.uri) as cover_uri
    FROM node n
    LEFT JOIN field_data_iktissue_pdf pdf ON pdf.entity_id = n.nid
    LEFT JOIN file_managed fm_pdf ON fm_pdf.fid = pdf.iktissue_pdf_fid
    LEFT JOIN field_data_field_issue_image cover ON cover.entity_id = n.nid
    LEFT JOIN file_managed fm_cover ON fm_cover.fid = cover.field_issue_image_fid
    WHERE n.type = 'iktissue'
    GROUP BY n.nid, n.title, n.status, n.created
    ORDER BY n.created ASC
  `);

  if (!DRY_RUN) {
    // Assign sequential issue numbers based on publish date order
    const issueRows = issues.map((issue, index) => ({
      issue_number: index + 1,
      title: issue.title,
      subtitle: '',
      cover_image: drupalUriToUrl(issue.cover_uri),
      pdf_url: drupalUriToUrl(issue.pdf_uri),
      publish_date: fromUnix(issue.created),
      status: issue.status === 1 ? 'published' : 'draft',
      pages: 0,
      views: 0,
      downloads: 0,
      featured: false,
      highlights: [],
    }));

    // Insert in batches of 50
    let issueInserted = 0;
    for (let i = 0; i < issueRows.length; i += 50) {
      const { error } = await sb.from('magazine_issues').insert(issueRows.slice(i, i + 50));
      if (error) console.error('  Magazine batch error:', error.message);
      else issueInserted += Math.min(50, issueRows.length - i);
    }
    log(`  ✓ ${issueInserted} magazine issues`);
  } else {
    log(`  [dry] Would insert ${issues.length} magazine issues`);
    log(`  Sample: "${issues[0]?.title}" → issue_number: 1, cover: ${drupalUriToUrl(issues[0]?.cover_uri)}`);
  }

  await db.end();
  log('Migration complete!');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
