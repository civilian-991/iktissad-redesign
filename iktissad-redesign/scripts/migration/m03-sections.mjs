/**
 * M03 — Migrate sections from Drupal (ikttaxonomy_sections + ikttaxonomy_subjects)
 * Idempotent: upsert on slug
 */
import { sshConnect, drupalQuery, parseTSV, makeSlug, supabase, log, logErr } from './lib.mjs';

const conn = await sshConnect();
log('SSH connected');

// Magazine sections (ابواب المجلة) — 78 terms
const magRaw = await drupalQuery(conn, `
  SELECT t.tid, t.name, 'ikttaxonomy_sections' as vocab
  FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE v.machine_name = 'ikttaxonomy_sections'
  ORDER BY t.name;
`);

// Article subjects/topics — 239 terms
const subjRaw = await drupalQuery(conn, `
  SELECT t.tid, t.name, 'ikttaxonomy_subjects' as vocab
  FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE v.machine_name = 'ikttaxonomy_subjects'
  ORDER BY t.name;
`);

const magRows = parseTSV(magRaw);
const subjRows = parseTSV(subjRaw);
log(`Magazine sections: ${magRows.length}, Subjects: ${subjRows.length}`);

const seen = new Map();
for (const r of [...magRows, ...subjRows]) {
  const slug = makeSlug(r.name);
  if (!slug) continue;
  if (!seen.has(slug)) {
    seen.set(slug, {
      name: r.name,
      slug,
      section_type: r.vocab === 'ikttaxonomy_sections' ? 'magazine' : 'article',
    });
  }
}

log(`Upserting ${seen.size} unique sections...`);
let ok = 0, fail = 0;

const entries = [...seen.values()];
for (let i = 0; i < entries.length; i += 50) {
  const batch = entries.slice(i, i + 50);
  const { data, error } = await supabase
    .from('sections')
    .upsert(batch, { onConflict: 'slug' });
  if (error) {
    // Try one by one
    for (const s of batch) {
      // sections table may not have section_type column — strip it if error
      const { error: e2 } = await supabase.from('sections').upsert({ name: s.name, slug: s.slug }, { onConflict: 'slug' });
      if (e2) { logErr(`Section: ${s.name}`, e2); fail++; }
      else ok++;
    }
  } else {
    ok += batch.length;
  }
}

log(`✅ Sections done: ${ok} upserted, ${fail} failed`);
conn.end();
