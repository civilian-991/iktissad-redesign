/**
 * M02 — Migrate countries from Drupal (241 terms) into Supabase
 * Idempotent: upsert on slug
 */
import { sshConnect, drupalQuery, parseTSV, makeSlug, supabase, log, logErr } from './lib.mjs';

const conn = await sshConnect();
log('SSH connected');

const raw = await drupalQuery(conn, `
  SELECT t.tid, t.name, t.description
  FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE v.machine_name = 'ikttaxonomy_countries'
  ORDER BY t.name;
`);

const rows = parseTSV(raw);
log(`Found ${rows.length} countries in Drupal`);

// Deduplicate by slug (there are near-duplicates like أروبا / أوروبا)
const seen = new Map();
for (const r of rows) {
  const slug = makeSlug(r.name);
  if (!slug) continue;
  if (!seen.has(slug)) {
    seen.set(slug, { name: r.name, slug, economic_overview: r.description || '' });
  }
}

log(`Upserting ${seen.size} unique countries...`);
let ok = 0, fail = 0, skip = 0;

// Insert in batches of 50
const entries = [...seen.values()];
for (let i = 0; i < entries.length; i += 50) {
  const batch = entries.slice(i, i + 50);
  const { error } = await supabase
    .from('countries')
    .upsert(batch, { onConflict: 'slug' });
  if (error) {
    logErr(`Batch ${i}`, error);
    // Try one by one to identify problem rows
    for (const c of batch) {
      const { error: e2 } = await supabase.from('countries').upsert(c, { onConflict: 'slug' });
      if (e2) { logErr(`  Country: ${c.name}`, e2); fail++; }
      else ok++;
    }
  } else {
    ok += batch.length;
  }
}

log(`✅ Countries done: ${ok} upserted, ${fail} failed, ${skip} skipped`);
conn.end();
