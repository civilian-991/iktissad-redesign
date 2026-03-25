/**
 * M04 — Migrate authors from both sources into Supabase users table
 * Drupal: ikttaxonomy_article_by (30 named byline authors)
 * awalan: ArticleWriter table (20 writers) — uses PowerShell for Unicode
 * Idempotent: upsert on email or slug
 */
import { sshConnect, drupalQuery, awQueryRaw, parseTSV, parsePSV, makeSlug, supabase, log, logErr } from './lib.mjs';

const conn = await sshConnect();
log('SSH connected');

// ── 1. Drupal byline authors ─────────────────────────────────────────────────
log('Fetching Drupal byline authors...');
const drupalRaw = await drupalQuery(conn, `
  SELECT t.tid, t.name, t.description as bio
  FROM taxonomy_term_data t
  JOIN taxonomy_vocabulary v ON v.vid = t.vid
  WHERE v.machine_name = 'ikttaxonomy_article_by'
  ORDER BY t.name;
`);
const drupalAuthors = parseTSV(drupalRaw);
log(`  ${drupalAuthors.length} Drupal byline authors`);

// ── 2. awalan writers (Unicode via PowerShell) ───────────────────────────────
log('Fetching awalan writers...');
const awRaw = await awQueryRaw(conn, `
  SELECT id, fullName, email, biography, imgSrc
  FROM ArticleWriter
  WHERE isDeleted = 0 OR isDeleted IS NULL
  ORDER BY id;
`);
const awWriters = parsePSV(awRaw);
log(`  ${awWriters.length} awalan writers`);

// ── 3. Build unified author list ─────────────────────────────────────────────
const authors = [];

for (const a of drupalAuthors) {
  if (!a.name || a.name.includes('الاقتصاد والاعمال')) continue; // skip editorial bylines
  const slug = makeSlug(a.name, a.tid);
  authors.push({
    name: a.name,
    email: `author-${slug}@iktissadonline.placeholder`,
    role: 'author',
    source_site: 'iktissad',
    source_id: a.tid,
  });
}

for (const w of awWriters) {
  if (!w.fullName || w.fullName.includes('sdfg') || w.fullName.includes('asdf')) continue; // skip test data
  const slug = makeSlug(w.fullName, w.id);
  const email = (w.email && w.email !== 'NULL' && w.email.includes('@'))
    ? w.email.toLowerCase()
    : `author-${slug}@awalan.placeholder`;
  authors.push({
    name: w.fullName,
    email,
    role: 'author',
    source_site: 'awalan',
    source_id: w.id,
    avatar: w.imgSrc && w.imgSrc !== 'NULL' ? w.imgSrc : '',
  });
}

log(`Upserting ${authors.length} authors into Supabase users...`);
let ok = 0, fail = 0;

for (const author of authors) {
  const record = {
    name: author.name,
    email: author.email,
    role: author.role,
    avatar: author.avatar || '',
  };

  // Upsert on email to avoid duplicates
  const { error } = await supabase
    .from('users')
    .upsert(record, { onConflict: 'email' });
  if (error) { logErr(`Author: ${author.name}`, error); fail++; }
  else ok++;
}

log(`✅ Authors done: ${ok} inserted/skipped, ${fail} failed`);
conn.end();
