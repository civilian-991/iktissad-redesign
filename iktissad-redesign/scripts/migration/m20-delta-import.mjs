/**
 * M20 — Delta import: new articles from iktissad (Drupal) + awalan (MSSQL)
 *
 * Differences from m05/m06:
 *  - Set-difference against live source_ids in our DB (ignores stale progress files)
 *  - Consolidates m05 + m14 + m15 (drupal taxonomy) and m06 + m16 + m06b (awalan taxonomy)
 *    so taxonomy is mapped CORRECTLY at import time, not patched after
 *  - Drupal subtitle → both `deck` and `excerpt` fallback
 *  - Tags pulled by name (not numeric tids)
 *  - Forces auto_post=false, is_paid=false, is_paywalled=false on every row
 *  - Countries beyond our 5 → country_id=null (preserves curated taxonomy)
 *  - Sectors with no mapping → sector_id=null
 *
 * Usage:
 *   node scripts/migration/m20-delta-import.mjs --dry-run --limit 10
 *   node scripts/migration/m20-delta-import.mjs --iktissad-only
 *   node scripts/migration/m20-delta-import.mjs --awalan-only
 *   node scripts/migration/m20-delta-import.mjs                    # full run
 */

import {
  sshConnect, drupalQuery, awQueryRaw,
  parseTSV, parsePSV, makeSlug, cleanHtml,
  supabase, log, logErr,
} from './lib.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_AI = args.includes('--no-ai');
const SOURCE = args.includes('--awalan-only') ? 'awalan'
             : args.includes('--iktissad-only') ? 'iktissad'
             : 'both';
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1]) : null; })();

// ────────── Load taxonomy mapping from JSON ──────────
const taxonomyMap = JSON.parse(readFileSync(resolve(__dirname, 'taxonomy-map.json'), 'utf8'));
const DRUPAL_TAXONOMY = taxonomyMap.drupal_taxonomy;
const AWALAN_TAXONOMY = taxonomyMap.awalan_categories;
const AWALAN_BREAKING_IDS = new Set(taxonomyMap.awalan_breaking_ids);
const AWALAN_FEATURED_IDS = new Set(taxonomyMap.awalan_featured_ids);
const COUNTRY_MAP = taxonomyMap.country_map;

// Fallback author UUID for awalan articles where writer is the publication or absent
const AWALAN_DEFAULT_AUTHOR_ID = '2b628718-74dc-4605-bf04-47c49e81cd07'; // "أولا- الاقتصاد والأعمال"

// ────────── AI fallback classifier ──────────
const AI_CACHE_FILE = resolve(__dirname, 'ai-classifications.json');
const aiCache = existsSync(AI_CACHE_FILE) ? JSON.parse(readFileSync(AI_CACHE_FILE, 'utf8')) : {};

const AI_SCHEMA = z.object({
  section: z.enum(['economy','companies','markets','technology','energy-innovation','opinion','files','videos']).nullable(),
  sector:  z.enum(['industry','agriculture','trade','finance','investment','insurance','real-estate','transport','automotive','tourism-entertainment','education','luxury','health','energy-environment','entrepreneurship','wealth']).nullable(),
  country: z.enum(['uae','lebanon','saudi-arabia','egypt','kuwait','qatar','bahrain','oman','syria','jordan','iraq','morocco','algeria','tunisia','libya','usa','china','india','turkey','france','world']).nullable(),
});

async function aiClassifyOne(key, title, excerpt) {
  if (NO_AI) return null;
  if (aiCache[key]) return aiCache[key];

  const cleanedTitle   = (title || '').replace(/<[^>]+>/g, '').trim().slice(0, 200);
  const cleanedExcerpt = (excerpt || '').replace(/<[^>]+>/g, '').trim().slice(0, 600);
  if (!cleanedTitle && !cleanedExcerpt) return null;

  try {
    const { object } = await generateObject({
      model: openai('gpt-5-mini'),
      schema: AI_SCHEMA,
      system: `You classify Arabic financial news articles into a fixed taxonomy.
Sections (editorial buckets): economy, companies, markets, technology, energy-innovation, opinion, files, videos.
Sectors (industries): industry, agriculture, trade, finance, investment, insurance, real-estate, transport, automotive, tourism-entertainment, education, luxury, health, energy-environment, entrepreneurship, wealth.
Countries: uae, lebanon, saudi-arabia, egypt, kuwait, qatar, bahrain, oman, syria, jordan, iraq, morocco, algeria, tunisia, libya, usa, china, india, turkey, france, world (use 'world' for international/multi-country pieces).
Pick at most one of each. Use null when no clear fit. Section and sector are independent (an article can have both, only one, or neither).`,
      prompt: `Title: ${cleanedTitle}\n\nExcerpt: ${cleanedExcerpt}`,
    });
    aiCache[key] = object;
    return object;
  } catch (e) {
    logErr(`AI classify ${key}`, e);
    return null;
  }
}

async function aiClassifyMissing(rows, lookups) {
  if (NO_AI) return 0;
  // Find rows where dictionary mapping yielded null for at least one of the three taxonomy fields
  const needsAi = rows.filter(r => !r.section_id || !r.sector_id || !r.country_id);
  if (needsAi.length === 0) return 0;
  log(`  AI classifier: ${needsAi.length} rows need fallback...`);

  const CONCURRENCY = 5;
  let done = 0, applied = 0;
  for (let i = 0; i < needsAi.length; i += CONCURRENCY) {
    const slice = needsAi.slice(i, i + CONCURRENCY);
    const results = await Promise.all(slice.map(r => {
      const key = `${r.source_site}:${r.source_id}`;
      return aiClassifyOne(key, r.title, r.excerpt).then(ai => ({ row: r, ai }));
    }));
    for (const { row, ai } of results) {
      if (!ai) continue;
      let touched = false;
      if (!row.section_id && ai.section && lookups.sectionIdBySlug[ai.section]) { row.section_id = lookups.sectionIdBySlug[ai.section]; touched = true; }
      if (!row.sector_id  && ai.sector  && lookups.sectorIdBySlug[ai.sector])   { row.sector_id  = lookups.sectorIdBySlug[ai.sector];  touched = true; }
      if (!row.country_id && ai.country && lookups.countryIdBySlug[ai.country]) { row.country_id = lookups.countryIdBySlug[ai.country]; touched = true; }
      if (touched) applied++;
    }
    done += slice.length;
    if (done % 25 === 0 || done === needsAi.length) {
      log(`    AI ${done}/${needsAi.length} (${applied} touched)`);
      writeFileSync(AI_CACHE_FILE, JSON.stringify(aiCache, null, 2));
    }
  }
  writeFileSync(AI_CACHE_FILE, JSON.stringify(aiCache, null, 2));
  return applied;
}

// ────────── Helpers ──────────
function parseAwalanDate(s) {
  if (!s || s === 'NULL') return null;
  // SQL Server default format from PowerShell ToString(): "MM/DD/YYYY HH:MM:SS"
  const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, mo, d, y, h, mi, sec] = m;
  return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${h.padStart(2,'0')}:${mi}:${sec}Z`;
}

async function loadLookups() {
  const [sectors, sections, countries, users] = await Promise.all([
    supabase.from('sectors').select('id, slug'),
    supabase.from('sections').select('id, slug'),
    supabase.from('countries').select('id, slug'),
    supabase.from('users').select('id, name, email'),
  ]);
  const userIdByName  = Object.fromEntries((users.data ?? []).map(u => [u.name,  u.id]));
  const userIdByEmail = Object.fromEntries((users.data ?? []).filter(u => u.email).map(u => [u.email.toLowerCase(), u.id]));
  return {
    sectorIdBySlug:  Object.fromEntries((sectors.data  ?? []).map(s => [s.slug, s.id])),
    sectionIdBySlug: Object.fromEntries((sections.data ?? []).map(s => [s.slug, s.id])),
    countryIdBySlug: Object.fromEntries((countries.data?? []).map(c => [c.slug, c.id])),
    userIdByName,
    userIdByEmail,
  };
}

function resolveAuthor(lookups, ...candidates) {
  for (const c of candidates) {
    if (!c) continue;
    const trimmed = String(c).trim();
    if (!trimmed) continue;
    if (trimmed.includes('@')) {
      const id = lookups.userIdByEmail[trimmed.toLowerCase()];
      if (id) return id;
    }
    const id = lookups.userIdByName[trimmed];
    if (id) return id;
  }
  return null;
}

async function getOurSourceIds(siteName) {
  const ids = new Set();
  let from = 0; const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('articles').select('source_id')
      .eq('source_site', siteName).range(from, from + PAGE - 1);
    if (error) { logErr('Supabase paging', error); break; }
    if (!data || data.length === 0) break;
    data.forEach(r => r.source_id != null && ids.add(parseInt(r.source_id)));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return ids;
}

// ────────── Drupal article fetch + transform ──────────
async function fetchDrupalArticles(conn, nids) {
  // No GROUP BY — use scalar subqueries throughout (MariaDB 10.11 lacks ANY_VALUE)
  const raw = await drupalQuery(conn, `
    SELECT
      n.nid, n.title, n.uid, n.status, n.created, n.changed,
      ia.subtitle, ia.articledate, ia.featured_article, ia.article_edit_choice,
      ia.pin, ia.video AS video_url,
      (SELECT body_value   FROM field_data_body
        WHERE entity_id = n.nid AND bundle = 'iktarticle' LIMIT 1) AS content,
      (SELECT body_summary FROM field_data_body
        WHERE entity_id = n.nid AND bundle = 'iktarticle' LIMIT 1) AS excerpt_short,
      (SELECT alias FROM url_alias
        WHERE source = CONCAT('node/', n.nid) ORDER BY pid DESC LIMIT 1) AS alias,
      u.name AS drupal_user,
      u.mail AS drupal_email,
      (SELECT fm.uri FROM field_data_iktarticle_thumbnail fth
        JOIN file_managed fm ON fm.fid = fth.iktarticle_thumbnail_fid
        WHERE fth.entity_id = n.nid LIMIT 1) AS image_uri,
      (SELECT GROUP_CONCAT(DISTINCT tt.name SEPARATOR '||')
        FROM field_data_iktarticle_sector_taxo f
        JOIN taxonomy_term_data tt ON tt.tid = f.iktarticle_sector_taxo_tid
        WHERE f.entity_id = n.nid)              AS sector_names,
      (SELECT GROUP_CONCAT(DISTINCT tt.name SEPARATOR '||')
        FROM field_data_iktarticle_countries_taxo f
        JOIN taxonomy_term_data tt ON tt.tid = f.iktarticle_countries_taxo_tid
        WHERE f.entity_id = n.nid)              AS country_names,
      (SELECT GROUP_CONCAT(DISTINCT tt.name SEPARATOR '||')
        FROM field_data_iktarticle_subjects_taxo f
        JOIN taxonomy_term_data tt ON tt.tid = f.iktarticle_subjects_taxo_tid
        WHERE f.entity_id = n.nid)              AS subject_names,
      (SELECT GROUP_CONCAT(DISTINCT tt.name SEPARATOR '||')
        FROM field_data_iktarticle_articleby_taxo f
        JOIN taxonomy_term_data tt ON tt.tid = f.iktarticle_articleby_taxo_tid
        WHERE f.entity_id = n.nid)              AS author_names,
      (SELECT GROUP_CONCAT(DISTINCT tt.name SEPARATOR '||')
        FROM field_data_field_iktarticle_tags f
        JOIN taxonomy_term_data tt ON tt.tid = f.field_iktarticle_tags_tid
        WHERE f.entity_id = n.nid)              AS tag_names
    FROM node n
    LEFT JOIN ikt_article ia ON ia.nid = n.nid
    LEFT JOIN users u        ON u.uid  = n.uid
    WHERE n.nid IN (${nids.join(',')}) AND n.type = 'iktarticle';
  `);
  return parseTSV(raw);
}

function transformDrupalRow(a, lookups) {
  let slug = a.alias
    ? a.alias.replace(/^\/?(news\/\d{4}\/\d{2}\/\d{2}\/)?/, '').replace(/\/$/, '')
    : makeSlug(a.title, a.nid);
  if (!slug) slug = `article-${a.nid}`;

  let sectorId = null, sectionId = null, countryId = null;
  const taxNames = [];
  if (a.sector_names)  taxNames.push(...a.sector_names.split('||'));
  if (a.subject_names) taxNames.push(...a.subject_names.split('||'));
  for (const raw of taxNames) {
    const map = DRUPAL_TAXONOMY[raw.trim()];
    if (!map) continue;
    if (map.type === 'sector'  && !sectorId)  sectorId  = lookups.sectorIdBySlug[map.slug]  || null;
    if (map.type === 'section' && !sectionId) sectionId = lookups.sectionIdBySlug[map.slug] || null;
  }

  if (a.country_names) {
    for (const raw of a.country_names.split('||')) {
      const slugCty = COUNTRY_MAP[raw.trim()];
      if (slugCty) { countryId = lookups.countryIdBySlug[slugCty] || null; break; }
    }
  }

  let authorId = null;
  if (a.author_names) {
    for (const name of a.author_names.split('||')) {
      authorId = resolveAuthor(lookups, name);
      if (authorId) break;
    }
  }
  if (!authorId) authorId = resolveAuthor(lookups, a.drupal_email, a.drupal_user);

  const tags = a.tag_names
    ? a.tag_names.split('||').map(t => t.trim()).filter(Boolean)
    : [];

  const imageUrl = a.image_uri
    ? 'https://www.iktissadonline.com/sites/default/files/' + a.image_uri.replace('public://', '')
    : '';

  const cleanContent = cleanHtml(a.content || '');
  const cleanExcerpt = cleanHtml(a.excerpt_short || a.subtitle || '').slice(0, 500);
  const deck = a.subtitle ? a.subtitle.slice(0, 200) : '';

  const legacyUrl = a.alias ? '/' + a.alias.replace(/^\//, '') : null;

  const createdAt = (a.created && parseInt(a.created) > 0)
    ? new Date(parseInt(a.created) * 1000).toISOString()
    : (a.articledate || new Date().toISOString());
  const updatedAt = (a.changed && parseInt(a.changed) > 0)
    ? new Date(parseInt(a.changed) * 1000).toISOString()
    : createdAt;

  return {
    title: a.title || '',
    slug,
    excerpt: cleanExcerpt,
    content: cleanContent,
    deck,
    featured_image: imageUrl,
    status: a.status === '1' ? 'published' : 'draft',
    published_at: a.articledate || null,
    created_at: createdAt,
    updated_at: updatedAt,
    section_id: sectionId,
    sector_id:  sectorId,
    country_id: countryId,
    author_id:  authorId,
    tags,
    featured:       a.featured_article === '1',
    editor_choice:  a.article_edit_choice === '1',
    is_breaking:    a.pin === '1',
    is_paid:        false,
    is_paywalled:   false,
    auto_post:      false,
    archived:       false,
    no_index:       false,
    source_site:    'iktissad',
    source_id:      parseInt(a.nid),
    legacy_url:     legacyUrl,
    video_url:      (a.video_url && a.video_url !== 'NULL') ? a.video_url : null,
  };
}

// ────────── Awalan article fetch + transform ──────────
async function fetchAwalanArticles(conn, ids) {
  const raw = await awQueryRaw(conn, `
    SELECT
      a.id, a.title, a.subtitle, a.smallDescription AS excerpt_short,
      a.description AS content,
      a.imgSrc AS image_path,
      a.isFeatured,
      a.datePublished AS published_at, a.dateCreated AS created_at, a.dateModified AS updated_at,
      a.customUrlTitle AS custom_slug,
      a.viewsCount AS views,
      (SELECT STRING_AGG(CAST(aci.articleCategoryId AS VARCHAR), CHAR(44))
       FROM ArticleCategoryItem aci WHERE aci.articleId = a.id) AS category_ids,
      (SELECT TOP 1 CAST(awi.articleWriterId AS VARCHAR)
       FROM ArticleWriterItem awi WHERE awi.articleId = a.id) AS writer_id,
      (SELECT STRING_AGG(at2.title, '||')
       FROM ArticleTagItem ati
       JOIN ArticleTag at2 ON at2.id = ati.tagId
       WHERE ati.articleId = a.id AND ati.isDeleted = 0) AS tag_names
    FROM Article a
    WHERE a.id IN (${ids.join(',')})
    AND a.isPublished = 1 AND a.isDeleted = 0;
  `);
  return parsePSV(raw);
}

function transformAwalanRow(a, lookups, writerNameById, catMap) {
  let slug = (a.custom_slug && a.custom_slug !== 'NULL')
    ? makeSlug(a.custom_slug)
    : makeSlug(a.title, a.id);
  if (!slug) slug = `awalan-${a.id}`;

  let sectorId = null, sectionId = null, countryId = null;
  let isBreaking = false;
  let isFeatured = a.isFeatured === 'True';

  if (a.category_ids && a.category_ids !== 'NULL') {
    for (const rawId of a.category_ids.split(',')) {
      const id = rawId.trim();
      if (!id) continue;

      const explicit = AWALAN_TAXONOMY[id];
      if (explicit?.type === 'sector'  && !sectorId)  { sectorId  = lookups.sectorIdBySlug[explicit.slug]  || null; continue; }
      if (explicit?.type === 'section' && !sectionId) { sectionId = lookups.sectionIdBySlug[explicit.slug] || null; continue; }

      if (AWALAN_BREAKING_IDS.has(id)) { isBreaking = true; continue; }
      if (AWALAN_FEATURED_IDS.has(id)) { isFeatured = true; continue; }

      const cat = catMap.get(id);
      if (cat?.parentId === '3' && !countryId) {
        const slugCty = COUNTRY_MAP[cat.title?.trim()];
        if (slugCty) countryId = lookups.countryIdBySlug[slugCty] || null;
      }
    }
  }

  let authorId = null;
  if (a.writer_id && a.writer_id !== 'NULL' && writerNameById.has(a.writer_id)) {
    authorId = resolveAuthor(lookups, writerNameById.get(a.writer_id));
  }
  // Fall back to publication byline for awalan when writer absent or unresolved
  if (!authorId) authorId = AWALAN_DEFAULT_AUTHOR_ID;

  const tags = (a.tag_names && a.tag_names !== 'NULL')
    ? a.tag_names.split('||').map(t => t.trim()).filter(Boolean)
    : [];

  const imageUrl = (a.image_path && a.image_path !== 'NULL')
    ? `https://api.awalan.com/Content/uploads/articles/${a.image_path}`
    : '';

  const cleanContent = cleanHtml(a.content || '', 'https://awalan.com');
  const cleanExcerpt = (a.excerpt_short && a.excerpt_short !== 'NULL')
    ? a.excerpt_short.replace(/<[^>]*>/g, '').slice(0, 500)
    : (a.subtitle && a.subtitle !== 'NULL' ? a.subtitle.slice(0, 500) : '');
  const deck = (a.subtitle && a.subtitle !== 'NULL') ? a.subtitle.slice(0, 200) : '';

  const publishedAt = parseAwalanDate(a.published_at);
  const createdAt   = parseAwalanDate(a.created_at) || publishedAt || new Date().toISOString();
  const updatedAt   = parseAwalanDate(a.updated_at) || createdAt;

  return {
    title: a.title || '',
    slug,
    excerpt: cleanExcerpt,
    content: cleanContent,
    deck,
    featured_image: imageUrl,
    status: 'published',
    published_at: publishedAt,
    created_at: createdAt,
    updated_at: updatedAt,
    section_id: sectionId,
    sector_id:  sectorId,
    country_id: countryId,
    author_id:  authorId,
    tags,
    featured:       isFeatured,
    is_breaking:    isBreaking,
    is_paid:        false,
    is_paywalled:   false,
    auto_post:      false,
    archived:       false,
    no_index:       false,
    views:          parseInt(a.views) || 0,
    source_site:    'awalan',
    source_id:      parseInt(a.id),
  };
}

// ────────── Reporting helpers ──────────
function summarize(label, rows, lookups) {
  const sectionFreq = {}, sectorFreq = {}, countryFreq = {};
  let nullSection = 0, nullSector = 0, nullCountry = 0, nullAuthor = 0, nullImage = 0;
  const idToSlug = (map) => Object.fromEntries(Object.entries(map).map(([slug, id]) => [id, slug]));
  const sectionsBack = idToSlug(lookups.sectionIdBySlug);
  const sectorsBack  = idToSlug(lookups.sectorIdBySlug);
  const countriesBack= idToSlug(lookups.countryIdBySlug);
  for (const r of rows) {
    if (r.section_id) sectionFreq[sectionsBack[r.section_id] || r.section_id] = (sectionFreq[sectionsBack[r.section_id] || r.section_id] || 0) + 1;
    else nullSection++;
    if (r.sector_id) sectorFreq[sectorsBack[r.sector_id] || r.sector_id] = (sectorFreq[sectorsBack[r.sector_id] || r.sector_id] || 0) + 1;
    else nullSector++;
    if (r.country_id) countryFreq[countriesBack[r.country_id] || r.country_id] = (countryFreq[countriesBack[r.country_id] || r.country_id] || 0) + 1;
    else nullCountry++;
    if (!r.author_id) nullAuthor++;
    if (!r.featured_image) nullImage++;
  }
  log(`\n  Mapping summary for ${label} (${rows.length} rows):`);
  log(`    sections: ${JSON.stringify(sectionFreq)}  (null=${nullSection})`);
  log(`    sectors:  ${JSON.stringify(sectorFreq)}  (null=${nullSector})`);
  log(`    countries:${JSON.stringify(countryFreq)}  (null=${nullCountry})`);
  log(`    null author=${nullAuthor}, null image=${nullImage}`);
}

function previewRow(r, idx) {
  const compact = {
    source_site: r.source_site, source_id: r.source_id,
    slug: r.slug, title: r.title?.slice(0, 60),
    section_id: r.section_id ? '✓' : 'null',
    sector_id:  r.sector_id  ? '✓' : 'null',
    country_id: r.country_id ? '✓' : 'null',
    author_id:  r.author_id  ? '✓' : 'null',
    image:      r.featured_image ? r.featured_image.slice(0, 80) : 'null',
    deck:       r.deck?.slice(0, 60) || '',
    excerpt:    r.excerpt?.slice(0, 60) || '',
    tags:       r.tags,
    flags:      [r.featured && 'featured', r.is_breaking && 'breaking', r.editor_choice && 'editor', r.is_paid && 'paid'].filter(Boolean),
    published_at: r.published_at,
    legacy_url: r.legacy_url,
    video_url:  r.video_url,
  };
  console.log(`\n  ── #${idx + 1} ──`);
  console.log('  ' + JSON.stringify(compact, null, 2).split('\n').join('\n  '));
}

// ────────── Main ──────────
async function main() {
  log(`M20 delta import — source=${SOURCE} dryRun=${DRY_RUN}${LIMIT ? ' limit=' + LIMIT : ''}`);
  const lookups = await loadLookups();
  log(`Loaded lookups: ${Object.keys(lookups.sectorIdBySlug).length} sectors, ${Object.keys(lookups.sectionIdBySlug).length} sections, ${Object.keys(lookups.countryIdBySlug).length} countries, ${Object.keys(lookups.userIdByName).length} users`);

  const conn = await sshConnect();
  log('SSH connected\n');

  // ── IKTISSAD ─────────────────────────────────────────────────────────────────
  if (SOURCE === 'both' || SOURCE === 'iktissad') {
    log('━━━ IKTISSAD ━━━');
    const drupalRaw = await drupalQuery(conn, "SELECT nid FROM node WHERE type='iktarticle' AND status=1;");
    const drupalIds = new Set(parseTSV(drupalRaw).map(r => parseInt(r.nid)).filter(Boolean));
    const ourIds = await getOurSourceIds('iktissad');
    let newIds = [...drupalIds].filter(id => !ourIds.has(id)).sort((a, b) => a - b);
    if (LIMIT) {
      const half = Math.floor(LIMIT / 2);
      newIds = [...newIds.slice(0, half), ...newIds.slice(-(LIMIT - half))];
    }
    log(`Drupal published: ${drupalIds.size}, ours: ${ourIds.size}, NEW to import: ${newIds.length}`);

    if (newIds.length > 0) {
      const allRows = [];
      const BATCH = 100;
      for (let i = 0; i < newIds.length; i += BATCH) {
        const batch = newIds.slice(i, i + BATCH);
        const articles = await fetchDrupalArticles(conn, batch);
        for (const a of articles) {
          if (!a.nid || isNaN(parseInt(a.nid))) continue;
          allRows.push(transformDrupalRow(a, lookups));
        }
        log(`  fetched ${Math.min(i + BATCH, newIds.length)}/${newIds.length}`);
      }

      const aiTouched = await aiClassifyMissing(allRows, lookups);
      if (aiTouched) log(`  AI fallback patched ${aiTouched} rows`);

      summarize('IKTISSAD', allRows, lookups);

      if (DRY_RUN) {
        log('\n  [DRY RUN] Sample of first 5 transformed rows:');
        allRows.slice(0, 5).forEach(previewRow);
      } else {
        let ok = 0, fail = 0;
        for (let i = 0; i < allRows.length; i += 50) {
          const slice = allRows.slice(i, i + 50);
          const { error } = await supabase.from('articles').insert(slice);
          if (error) {
            // Likely a slug collision somewhere in the batch — retry one-by-one with suffix fallback
            for (const row of slice) {
              const { error: e1 } = await supabase.from('articles').insert(row);
              if (!e1) { ok++; continue; }
              const safe = { ...row, slug: `${row.slug}-ikt${row.source_id}` };
              const { error: e2 } = await supabase.from('articles').insert(safe);
              if (e2) { logErr(`  nid=${row.source_id}`, e2); fail++; } else ok++;
            }
          } else ok += slice.length;
          log(`  inserted ${ok}/${allRows.length}`);
        }
        log(`✅ IKTISSAD: ${ok} ok, ${fail} failed`);
      }
    }
  }

  // ── AWALAN ───────────────────────────────────────────────────────────────────
  if (SOURCE === 'both' || SOURCE === 'awalan') {
    log('\n━━━ AWALAN ━━━');
    const awRaw = await awQueryRaw(conn, "SELECT id FROM Article WHERE isPublished=1 AND isDeleted=0;");
    const awIds = new Set(parsePSV(awRaw).map(r => parseInt(r.id)).filter(Boolean));
    const ourIds = await getOurSourceIds('awalan');
    let newIds = [...awIds].filter(id => !ourIds.has(id)).sort((a, b) => a - b);
    if (LIMIT) {
      const half = Math.floor(LIMIT / 2);
      newIds = [...newIds.slice(0, half), ...newIds.slice(-(LIMIT - half))];
    }
    log(`Awalan published: ${awIds.size}, ours: ${ourIds.size}, NEW to import: ${newIds.length}`);

    if (newIds.length > 0) {
      // Pre-load awalan writer + category maps
      const writerNameById = new Map();
      parsePSV(await awQueryRaw(conn, "SELECT id, fullName FROM ArticleWriter WHERE isDeleted = 0 OR isDeleted IS NULL;"))
        .forEach(r => writerNameById.set(r.id, r.fullName));
      const catMap = new Map();
      parsePSV(await awQueryRaw(conn, "SELECT id, title, parentId FROM ArticleCategory WHERE isDeleted = 0 OR isDeleted IS NULL;"))
        .forEach(r => catMap.set(r.id, { title: r.title, parentId: r.parentId }));

      const allRows = [];
      const BATCH = 100;
      for (let i = 0; i < newIds.length; i += BATCH) {
        const batch = newIds.slice(i, i + BATCH);
        const articles = await fetchAwalanArticles(conn, batch);
        for (const a of articles) {
          if (!a.id || isNaN(parseInt(a.id))) continue;
          allRows.push(transformAwalanRow(a, lookups, writerNameById, catMap));
        }
        log(`  fetched ${Math.min(i + BATCH, newIds.length)}/${newIds.length}`);
      }

      const aiTouched = await aiClassifyMissing(allRows, lookups);
      if (aiTouched) log(`  AI fallback patched ${aiTouched} rows`);

      summarize('AWALAN', allRows, lookups);

      if (DRY_RUN) {
        log('\n  [DRY RUN] Sample of first 5 transformed rows:');
        allRows.slice(0, 5).forEach(previewRow);
      } else {
        let ok = 0, fail = 0;
        for (let i = 0; i < allRows.length; i += 50) {
          const slice = allRows.slice(i, i + 50);
          const { error } = await supabase.from('articles').insert(slice);
          if (error) {
            for (const row of slice) {
              const { error: e1 } = await supabase.from('articles').insert(row);
              if (!e1) { ok++; continue; }
              const safe = { ...row, slug: `${row.slug}-aw${row.source_id}` };
              const { error: e2 } = await supabase.from('articles').insert(safe);
              if (e2) { logErr(`  id=${row.source_id}`, e2); fail++; } else ok++;
            }
          } else ok += slice.length;
          log(`  inserted ${ok}/${allRows.length}`);
        }
        log(`✅ AWALAN: ${ok} ok, ${fail} failed`);
      }
    }
  }

  conn.end();
  log('\nDone.');
}

main().catch(err => { logErr('Fatal', err); process.exit(1); });
