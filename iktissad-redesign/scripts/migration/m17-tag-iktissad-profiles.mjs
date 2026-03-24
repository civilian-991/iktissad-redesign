/**
 * M17 — Tag iktissad "قادة" articles as 'profile'
 *
 * The m05 Drupal migration stored tags as numeric Drupal TIDs (e.g. "1234"),
 * not as human-readable strings. The "قادة" (leaders/profiles) taxonomy term
 * in Drupal has a specific TID. This script:
 *   1. Queries Drupal for the TID of the "قادة" term
 *   2. Finds all iktissad articles in Supabase whose tags[] contains that TID
 *   3. Adds 'profile' to their tags array (idempotent)
 *
 * These articles have real featured_image URLs pointing to iktissadonline.com.
 *
 * Usage:
 *   node scripts/migration/m17-tag-iktissad-profiles.mjs
 *   node scripts/migration/m17-tag-iktissad-profiles.mjs --dry-run
 */
import { sshConnect, drupalQuery, parseTSV, supabase, log, logErr } from './lib.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const conn = await sshConnect();
log('SSH connected');

// ─── 1. Find "قادة" TID in Drupal ─────────────────────────────────────────────
log('Looking up "قادة" taxonomy term TID...');
const termRaw = await drupalQuery(conn, `
  SELECT t.tid, t.name
  FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE t.name LIKE '%قادة%' OR t.name LIKE '%قاده%'
  ORDER BY t.tid;
`);
const termRows = parseTSV(termRaw);
log(`Found terms matching قادة: ${JSON.stringify(termRows)}`);

if (termRows.length === 0) {
  log('No matching term found. Trying broader search...');
  const allTagsRaw = await drupalQuery(conn, `
    SELECT t.tid, t.name, v.machine_name
    FROM taxonomy_term_data t
    JOIN taxonomy_vocabulary v ON v.vid = t.vid
    WHERE v.machine_name IN ('ikttaxonomy_subjects', 'ikttaxonomy_sections', 'tags', 'field_iktarticle_tags')
    ORDER BY t.tid;
  `);
  const allTagRows = parseTSV(allTagsRaw);
  log(`All tags vocabulary terms (${allTagRows.length}):`);
  for (const r of allTagRows.slice(0, 50)) {
    log(`  tid=${r.tid} name="${r.name}" vocab=${r.machine_name}`);
  }
  conn.end();
  process.exit(1);
}

// Use the first matching TID
const profileTid = termRows[0].tid;
log(`Using TID ${profileTid} for "قادة"`);

// ─── 2. Get all NIDs from Drupal that are tagged with this TID ────────────────
// "قادة" uses field_iktarticle_term (NOT field_iktarticle_tags — that's a different vocab)
log(`Querying Drupal for article NIDs with field_iktarticle_term TID ${profileTid}...`);
const nidRaw = await drupalQuery(conn, `
  SELECT DISTINCT ft.entity_id as nid
  FROM field_data_field_iktarticle_term ft
  JOIN node n ON n.nid = ft.entity_id AND n.status = 1 AND n.type = 'iktarticle'
  WHERE ft.field_iktarticle_term_tid = ${profileTid}
  ORDER BY ft.entity_id;
`);
const nidRows = parseTSV(nidRaw);
const nids = nidRows.map(r => parseInt(r.nid)).filter(Boolean);
log(`Found ${nids.length} Drupal NIDs tagged as "قادة"`);

if (nids.length === 0) {
  log('No NIDs found. Exiting.');
  conn.end();
  process.exit(0);
}

// ─── 3. Find those articles in Supabase by source_id ─────────────────────────
log(`Fetching matching articles from Supabase...`);
// Fetch in chunks of 500 (Supabase .in() limit)
const CHUNK = 500;
const articles = [];
for (let i = 0; i < nids.length; i += CHUNK) {
  const chunk = nids.slice(i, i + CHUNK);
  const { data, error: fetchErr } = await supabase
    .from('articles')
    .select('id, title, tags, featured_image, source_id')
    .eq('source_site', 'iktissad')
    .in('source_id', chunk);
  if (fetchErr) { logErr('Failed to fetch chunk', fetchErr); continue; }
  if (data) articles.push(...data);
}

log(`Found ${articles.length} matching articles in Supabase (out of ${nids.length} Drupal NIDs)`);

if (!articles || articles.length === 0) {
  log('No articles found. The TID may not match. Check the term list above.');
  conn.end();
  process.exit(0);
}

// Show samples
for (const a of articles.slice(0, 10)) {
  log(`  "${a.title}" | image: ${a.featured_image ? 'yes' : 'no'} | tags: ${JSON.stringify(a.tags)}`);
}

if (DRY_RUN) {
  log(`[DRY RUN] Would tag ${articles.length} articles with 'profile'`);
  conn.end();
  process.exit(0);
}

// ─── 3. Add 'profile' tag to each article ─────────────────────────────────────
log(`\nTagging ${articles.length} articles with 'profile'...`);
let ok = 0, skip = 0, fail = 0;
const CONCURRENCY = 20;

async function tagOne(article) {
  // Idempotent: skip if already has 'profile'
  if (article.tags?.includes('profile')) {
    skip++;
    return;
  }
  const newTags = [...(article.tags ?? []), 'profile'];
  const { error } = await supabase
    .from('articles')
    .update({ tags: newTags })
    .eq('id', article.id);
  if (error) { logErr(`id=${article.id}`, error); fail++; }
  else ok++;
}

for (let i = 0; i < articles.length; i += CONCURRENCY) {
  const batch = articles.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(tagOne));
  if ((i + CONCURRENCY) % 200 === 0) {
    log(`  Progress: ${i + CONCURRENCY}/${articles.length} — ok:${ok} skip:${skip} fail:${fail}`);
  }
}

log(`\n✅ Done tagging iktissad profiles:`);
log(`   ok:    ${ok}`);
log(`   skip:  ${skip} (already had 'profile' tag)`);
log(`   fail:  ${fail}`);

// ─── 4. Verify ────────────────────────────────────────────────────────────────
const { count } = await supabase
  .from('articles')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'published')
  .contains('tags', ['profile']);

log(`\nTotal published articles with 'profile' tag: ${count}`);

conn.end();
