/**
 * Script 5: Sync featured_article + article_edit_choice flags from Drupal → Supabase
 * Run: node scripts/5-sync-flags.js
 *
 * Matches articles by slug (same formula as script 4).
 * Only updates articles that need a flag change — safe to re-run.
 */

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

const DB = {
  host: '127.0.0.1', port: 3307,
  user: 'root', password: 'migrate123',
  database: 'iktissad', charset: 'utf8mb4',
};

const supabase = createClient(
  'https://vqdxinosmzezjveliemb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZHhpbm9zbXplemp2ZWxpZW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY2NDgyNiwiZXhwIjoyMDg5MjQwODI2fQ.3JWT3VDRYvxLjxdTCXcLmeBqpV_tBru40jLTw9l4Pz0'
);

function makeSlug(urlAlias, nid) {
  let slug = urlAlias
    ? urlAlias.replace(/^\//, '').replace(/\//g, '-')
    : `article-${nid}`;
  return slug.replace(/[^a-zA-Z0-9\u0600-\u06FF\-]/g, '-').replace(/-+/g, '-').substring(0, 200);
}

const BATCH_SIZE = 10;
const DELAY_MS = 200;

async function main() {
  console.log('Connecting to Drupal MySQL...');
  const conn = await mysql.createConnection(DB);

  console.log('Fetching flags from Drupal...');
  const [rows] = await conn.query(`
    SELECT n.nid,
           ua.alias            AS url_alias,
           ia.featured_article AS featured,
           ia.article_edit_choice AS editor_choice
    FROM node n
    JOIN ikt_article ia ON ia.nid = n.nid
    LEFT JOIN url_alias ua ON ua.source = CONCAT('node/', n.nid)
    WHERE n.status = 1
      AND (ia.featured_article = 1 OR ia.article_edit_choice = 1)
  `);
  await conn.end();

  console.log(`Found ${rows.length} articles with flags in Drupal`);

  const featured    = rows.filter(r => r.featured     === 1).length;
  const editorChoice = rows.filter(r => r.editor_choice === 1).length;
  console.log(`  featured_article:    ${featured}`);
  console.log(`  article_edit_choice: ${editorChoice}\n`);

  // Build slug → flags map
  const flagMap = {};
  for (const r of rows) {
    const slug = makeSlug(r.url_alias, r.nid);
    flagMap[slug] = {
      featured:      r.featured      === 1,
      editor_choice: r.editor_choice === 1,
    };
  }

  const slugs = Object.keys(flagMap);
  let success = 0, failed = 0, notFound = 0;

  for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
    const batch = slugs.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (slug) => {
      const flags = flagMap[slug];

      const { error } = await supabase
        .from('articles')
        .update({ featured: flags.featured, editor_choice: flags.editor_choice })
        .eq('slug', slug);

      if (error) {
        if (error.code === 'PGRST116') notFound++;
        else { failed++; console.error(`  ❌ ${slug}: ${error.message}`); }
      } else {
        success++;
      }
    }));

    const pct = Math.round(((i + batch.length) / slugs.length) * 100);
    process.stdout.write(`\r  ${i + batch.length}/${slugs.length} (${pct}%) — ✅ ${success} | ❌ ${failed} | ⚠️  not found ${notFound}`);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n\n✅ Done!`);
  console.log(`  Updated: ${success} | Failed: ${failed} | Not in Supabase: ${notFound}`);

  // Verify
  const { count: featuredCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .eq('featured', true);
  const { count: ecCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .eq('editor_choice', true);

  console.log(`\nSupabase now has:`);
  console.log(`  featured articles:      ${featuredCount}`);
  console.log(`  editor choice articles: ${ecCount}`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
