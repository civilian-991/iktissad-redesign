/**
 * M01 — Migrate sectors from both Drupal + awalan into Supabase
 * Idempotent: uses upsert on slug
 * Usage: node scripts/migration/m01-sectors.mjs
 */
import { sshConnect, drupalQuery, awQueryRaw, parseTSV, parsePSV, makeSlug, supabase, log, logErr } from './lib.mjs';

const conn = await sshConnect();
log('SSH connected');

// ── 1. Drupal sectors ────────────────────────────────────────────────────────
log('Fetching Drupal sectors...');
const drupalRaw = await drupalQuery(conn, `
  SELECT t.tid, t.name, t.description
  FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE v.machine_name = 'ikttaxonomy_sector'
  ORDER BY t.name;
`);
const drupalSectors = parseTSV(drupalRaw);
log(`  Found ${drupalSectors.length} Drupal sectors`);

// ── 2. awalan sectors (ArticleCategory where type is sector) ─────────────────
log('Fetching awalan categories...');
const awRaw = await awQueryRaw(conn, `
  SELECT Id, Title, ParentId FROM ArticleCategory
  WHERE ParentId IS NULL AND isDeleted = 0
  ORDER BY Id;
`);
const awCats = parsePSV(awRaw);
log(`  Found ${awCats.length} awalan top-level categories`);

// ── 3. Merge & upsert into Supabase ─────────────────────────────────────────
const allSectors = new Map(); // slug → { name, name_ar, description, source_ids }

// From Drupal
for (const s of drupalSectors) {
  const slug = makeSlug(s.name);
  if (!slug) continue;
  allSectors.set(slug, {
    name: s.name,
    slug,
    description: s.description || '',
  });
}

// From awalan — known sector category IDs (2 = Sectors parent, children are actual sectors)
// We'll add any unique awalan categories that aren't already covered
const awSectorKeywords = ['قطاعات', 'sector', 'banking', 'energy', 'tech', 'real estate', 'oil', 'transport'];
for (const c of awCats) {
  if (!c.Title) continue;
  const slug = makeSlug(c.Title);
  if (!slug || allSectors.has(slug)) continue;
  // Only add if it looks like a content sector (not a utility category)
  const title = c.Title.toLowerCase();
  const isUtility = ['test', 'sssss', 'featured', 'null', 'microscope', 'video', 'leaders', 'opinion', 'files', 'companies', 'economy', 'markets'].some(k => title.includes(k));
  if (!isUtility) {
    allSectors.set(slug, { name: c.Title, slug, description: '' });
  }
}

log(`Upserting ${allSectors.size} sectors into Supabase...`);
let ok = 0, fail = 0;
for (const sector of allSectors.values()) {
  const { error } = await supabase
    .from('sectors')
    .upsert(sector, { onConflict: 'slug' });
  if (error) { logErr(`Sector ${sector.name}`, error); fail++; }
  else ok++;
}

log(`✅ Sectors done: ${ok} upserted, ${fail} failed`);
conn.end();
