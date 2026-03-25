/**
 * M15 — Re-map article sector_id/section_id from Drupal source of truth
 *
 * m14 deleted old Arabic-slug sectors and nulled out sector_id on articles
 * that were mapped to them (تعليم, مال ومصارف, سياحة وطيران, عقار وإنشاءات,
 * سيارات ومحركات, تكنولوجيا, etc.). This script re-assigns them correctly
 * by querying Drupal for each article's sector tid.
 *
 * Mapping: Drupal Arabic sector name → new Supabase English slug
 */

import { sshConnect, drupalQuery, parseTSV, makeSlug, supabase, log, logErr } from './lib.mjs';

const conn = await sshConnect();
log('SSH connected');

// ─── 1. Load new Supabase sector + section IDs ───────────────────────────────

const { data: sectors } = await supabase.from('sectors').select('id, slug, name');
const { data: sections } = await supabase.from('sections').select('id, slug, name');

const sectorById = Object.fromEntries((sectors ?? []).map(s => [s.slug, s.id]));
const sectionById = Object.fromEntries((sections ?? []).map(s => [s.slug, s.id]));

// ─── 2. Drupal sector name → new target ─────────────────────────────────────
// Maps old Arabic Drupal sector name (lowercased) to new Supabase slug + type

const DRUPAL_TO_NEW = {
  // Already handled by m14 (but include for completeness — won't hurt to re-apply)
  'اقتصاد عام':         { type: 'section', slug: 'economy' },
  'طاقة':              { type: 'sector',  slug: 'energy-environment' },
  'ساعات ورفاهية':     { type: 'sector',  slug: 'luxury' },
  'النقل واللوجستيات': { type: 'sector',  slug: 'transport' },
  'نفط وغاز':          { type: 'sector',  slug: 'energy-environment' },
  'صحة':               { type: 'sector',  slug: 'health' },
  // Missed by m14 — Drupal sectors that had articles but weren't in the 6 we tracked
  'تعليم':             { type: 'sector',  slug: 'education' },
  'مال ومصارف':        { type: 'sector',  slug: 'finance' },
  'سياحة وطيران':      { type: 'sector',  slug: 'tourism-entertainment' },
  'سياحة وترفيه':      { type: 'sector',  slug: 'tourism-entertainment' },
  'عقار وإنشاءات':     { type: 'sector',  slug: 'real-estate' },
  'عقار':              { type: 'sector',  slug: 'real-estate' },
  'سيارات ومحركات':    { type: 'sector',  slug: 'automotive' },
  'سيارات':            { type: 'sector',  slug: 'automotive' },
  'تكنولوجيا':         { type: 'section', slug: 'technology' },  // editorial section not industry sector
  'صناعة':             { type: 'sector',  slug: 'industry' },
  'زراعة':             { type: 'sector',  slug: 'agriculture' },
  'تجارة':             { type: 'sector',  slug: 'trade' },
  'استثمار':           { type: 'sector',  slug: 'investment' },
  'تأمين':             { type: 'sector',  slug: 'insurance' },
  'ريادة':             { type: 'sector',  slug: 'entrepreneurship' },
  'ريادة وابتكار':     { type: 'sector',  slug: 'entrepreneurship' },
  'رفاهية':            { type: 'sector',  slug: 'luxury' },
  'ثروات':             { type: 'sector',  slug: 'wealth' },
  // Previously unmapped Drupal sectors
  'طاقة متجددة':      { type: 'sector',  slug: 'energy-environment' },
  'كهرباء':           { type: 'sector',  slug: 'energy-environment' },
  'بيئة':             { type: 'sector',  slug: 'energy-environment' },
  'منتجات الرفاهية':  { type: 'sector',  slug: 'luxury' },
  'رجال وأعمال':      { type: 'section', slug: 'companies' },
  'مجتمع':            { type: 'section', slug: 'economy' },  // closest match
  // Editorial sections
  'رأي':               { type: 'section', slug: 'opinion' },
  'ملفات':             { type: 'section', slug: 'files' },
  'شركات':             { type: 'section', slug: 'companies' },
  'أسواق':             { type: 'section', slug: 'markets' },
  'فيديو':             { type: 'section', slug: 'video' },
};

// ─── 3. Fetch Drupal sector taxonomy ────────────────────────────────────────

log('Fetching Drupal sector taxonomy terms...');
const drupalSectorRaw = await drupalQuery(conn, `
  SELECT t.tid, t.name
  FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE v.machine_name = 'ikttaxonomy_sector'
  ORDER BY t.name;
`);
const drupalSectors = parseTSV(drupalSectorRaw);
log(`  Found ${drupalSectors.length} Drupal sector terms`);

// Build: Drupal tid → new target
const tidToTarget = new Map();
for (const ds of drupalSectors) {
  const name = ds.name?.trim();
  if (!name) continue;
  const mapping = DRUPAL_TO_NEW[name] ?? DRUPAL_TO_NEW[name.toLowerCase()];
  if (mapping) {
    tidToTarget.set(ds.tid, { ...mapping, name });
  } else {
    log(`  ⚠ No mapping for Drupal sector: "${name}" (tid=${ds.tid})`);
  }
}
log(`  Mapped ${tidToTarget.size} / ${drupalSectors.length} Drupal sector terms`);

// ─── 4. Fetch all Drupal articles with their sector tid ─────────────────────

log('Fetching Drupal article→sector assignments...');
const articleSectorRaw = await drupalQuery(conn, `
  SELECT fs.entity_id AS nid,
         GROUP_CONCAT(DISTINCT fs.iktarticle_sector_taxo_tid) AS sector_tids
  FROM field_data_iktarticle_sector_taxo fs
  JOIN node n ON n.nid = fs.entity_id AND n.type = 'iktarticle' AND n.status = 1
  GROUP BY fs.entity_id
  ORDER BY fs.entity_id;
`);
const articleSectors = parseTSV(articleSectorRaw).map(r => ({
  nid: r.nid,
  sector_tid: r.sector_tids?.split(',')[0], // take first sector
}));
log(`  Found ${articleSectors.length} iktissad article→sector links`);

// ─── 5. Update Supabase articles ─────────────────────────────────────────────

let ok = 0, skip = 0, fail = 0, noArticle = 0;
const CONCURRENCY = 20;

async function updateOne({ nid, sector_tid }) {
  if (!nid || !sector_tid) { skip++; return; }

  const target = tidToTarget.get(sector_tid);
  if (!target) { skip++; return; }

  // Look up Supabase article by source_id + source_site
  const { data: article } = await supabase
    .from('articles')
    .select('id, sector_id, section_id')
    .eq('source_id', parseInt(nid))
    .eq('source_site', 'iktissad')
    .maybeSingle();

  if (!article) { noArticle++; return; }

  // Build update payload
  const update = {};
  if (target.type === 'section') {
    const newId = sectionById[target.slug];
    if (!newId) { fail++; return; }
    // Only update if not already set (or set to wrong value)
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

  if (error) { logErr(`nid=${nid}`, error); fail++; }
  else ok++;
}

// Process in parallel batches
for (let i = 0; i < articleSectors.length; i += CONCURRENCY) {
  const batch = articleSectors.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(updateOne));

  if ((i + CONCURRENCY) % 500 === 0) {
    log(`  Progress: ${i + CONCURRENCY}/${articleSectors.length} — ok:${ok} skip:${skip} fail:${fail} no-article:${noArticle}`);
  }
}

log(`\n✅ Sector re-mapping done:`);
log(`   ok:          ${ok}`);
log(`   skip:        ${skip} (no mapping defined)`);
log(`   fail:        ${fail} (error or missing ID)`);
log(`   no-article:  ${noArticle} (nid not found in Supabase)`);

// ─── 6. Verify counts ────────────────────────────────────────────────────────

log('\nVerifying article counts per sector/section...');
const allTaxonomy = [
  ...Object.values(sectorById).map(id => ({ id, type: 'sector' })),
  ...Object.values(sectionById).map(id => ({ id, type: 'section' })),
];

const results = [];
for (const { id, type } of allTaxonomy) {
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
    results.push({ name: entry?.name, type, count });
  }
}

results.sort((a, b) => b.count - a.count);
for (const r of results) {
  log(`  [${r.type}] ${r.name}: ${r.count} published articles`);
}

conn.end();
