/**
 * Full discovery script — runs all inventory queries on both databases via SSH
 * Usage: node scripts/discover.mjs
 */
import { createRequire } from 'module';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const require = createRequire(import.meta.url);
const { Client } = require('ssh2');

const SSH = {
  host: process.env.SSH_HOST,
  port: 22,
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
  readyTimeout: 30000,
};

function run(conn, cmd, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let out = '', err = '';
    const timer = setTimeout(() => reject(new Error('Command timed out: ' + cmd.slice(0, 60))), timeoutMs);
    conn.exec(cmd, (e, stream) => {
      if (e) { clearTimeout(timer); return reject(e); }
      stream.on('data', d => out += d.toString());
      stream.stderr.on('data', d => err += d.toString());
      stream.on('close', () => { clearTimeout(timer); resolve({ out: out.trim(), err: err.trim() }); });
    });
  });
}

// Run a MySQL query on the server via SSH
function mysql(conn, query, db = process.env.DRUPAL_DB_NAME) {
  const escaped = query.replace(/"/g, '\\"');
  const cmd = `"C:\\Program Files\\MariaDB 10.11\\bin\\mysql.exe" -u root -p"${process.env.DRUPAL_DB_PASS}" ${db} -e "${escaped}" 2>nul`;
  return run(conn, cmd, 30000);
}

// Run a SQL Server query via sqlcmd
function sqlcmd(conn, query) {
  const escaped = query.replace(/"/g, '\\"');
  const cmd = `sqlcmd -S ".\\${process.env.AWALAN_DB_INSTANCE}" -U ${process.env.AWALAN_DB_USER} -P "${process.env.AWALAN_DB_PASS}" -d ${process.env.AWALAN_DB_NAME} -Q "${escaped}" -W -s"|" 2>nul`;
  return run(conn, cmd, 30000);
}

const conn = new Client();
await new Promise((res, rej) => {
  conn.on('ready', res);
  conn.on('error', rej);
  conn.connect(SSH);
});
console.log('✅ SSH Connected\n');

const results = {};

// ── DRUPAL DISCOVERY ─────────────────────────────────────────────────────────

console.log('━━━ DRUPAL: Content Types ━━━');
const nodeTypes = await mysql(conn, 'SELECT type, COUNT(*) as count FROM node WHERE status=1 GROUP BY type ORDER BY count DESC;');
console.log(nodeTypes.out || nodeTypes.err);
results.drupal_node_types = nodeTypes.out;

console.log('\n━━━ DRUPAL: Taxonomies ━━━');
const taxo = await mysql(conn, 'SELECT v.machine_name, v.name, COUNT(t.tid) as terms FROM taxonomy_vocabulary v LEFT JOIN taxonomy_term_data t ON t.vid=v.vid GROUP BY v.vid ORDER BY terms DESC;');
console.log(taxo.out || taxo.err);
results.drupal_taxonomies = taxo.out;

console.log('\n━━━ DRUPAL: Sectors ━━━');
const sectors = await mysql(conn, "SELECT t.tid, t.name FROM taxonomy_term_data t JOIN taxonomy_vocabulary v ON v.vid=t.vid WHERE v.machine_name='ikttaxonomy_sector' ORDER BY t.name;");
console.log(sectors.out || sectors.err);
results.drupal_sectors = sectors.out;

console.log('\n━━━ DRUPAL: Countries ━━━');
const countries = await mysql(conn, "SELECT t.tid, t.name FROM taxonomy_term_data t JOIN taxonomy_vocabulary v ON v.vid=t.vid WHERE v.machine_name='ikttaxonomy_countries' ORDER BY t.name;");
console.log(countries.out || countries.err);
results.drupal_countries = countries.out;

console.log('\n━━━ DRUPAL: Sections ━━━');
const sections = await mysql(conn, "SELECT t.tid, t.name FROM taxonomy_term_data t JOIN taxonomy_vocabulary v ON v.vid=t.vid WHERE v.machine_name LIKE '%section%' OR v.machine_name LIKE '%subject%' ORDER BY t.name;");
console.log(sections.out || sections.err);
results.drupal_sections = sections.out;

console.log('\n━━━ DRUPAL: Users / Authors ━━━');
const users = await mysql(conn, "SELECT COUNT(*) as total_users, SUM(status) as active FROM users WHERE uid > 0;");
console.log(users.out || users.err);
results.drupal_users_count = users.out;

console.log('\n━━━ DRUPAL: Authors in articles ━━━');
const authors = await mysql(conn, "SELECT u.uid, u.name, u.mail, COUNT(n.nid) as articles FROM users u JOIN node n ON n.uid=u.uid WHERE n.type='ikt_article' GROUP BY u.uid ORDER BY articles DESC LIMIT 30;");
console.log(authors.out || authors.err);
results.drupal_authors = authors.out;

console.log('\n━━━ DRUPAL: Articles total & date range ━━━');
const artStats = await mysql(conn, "SELECT COUNT(*) as total, MIN(FROM_UNIXTIME(created)) as oldest, MAX(FROM_UNIXTIME(created)) as newest FROM node WHERE type='ikt_article' AND status=1;");
console.log(artStats.out || artStats.err);
results.drupal_articles_stats = artStats.out;

console.log('\n━━━ DRUPAL: Magazine issues ━━━');
const mags = await mysql(conn, "SELECT COUNT(*) as total FROM node WHERE type='ikt_issue' AND status=1;");
console.log(mags.out || mags.err);
results.drupal_magazines = mags.out;

console.log('\n━━━ DRUPAL: Interviews ━━━');
const interviews = await mysql(conn, "SELECT COUNT(*) as total FROM node WHERE type IN ('ikt_interview','interview','mukabala') AND status=1;");
console.log(interviews.out || interviews.err);
results.drupal_interviews = interviews.out;

console.log('\n━━━ DRUPAL: Newsletter subscribers ━━━');
const newsletter = await mysql(conn, "SHOW TABLES LIKE '%newsletter%';");
console.log(newsletter.out || newsletter.err);
const nlSub = await mysql(conn, "SELECT COUNT(*) as total FROM simplenews_subscriptions 2>nul;");
console.log(nlSub.out || nlSub.err);
results.drupal_newsletter = newsletter.out + '\n' + nlSub.out;

console.log('\n━━━ DRUPAL: All tables (for reference) ━━━');
const tables = await mysql(conn, 'SHOW TABLES;');
console.log(tables.out || tables.err);
results.drupal_tables = tables.out;

console.log('\n━━━ DRUPAL: Files/Images count ━━━');
const files = await mysql(conn, "SELECT COUNT(*) as total, SUM(filesize)/1024/1024 as total_mb FROM file_managed WHERE status=1;");
console.log(files.out || files.err);
results.drupal_files = files.out;

// ── AWALAN DISCOVERY ─────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('━━━ AWALAN SQL SERVER: All Tables ━━━');
const awTables = await sqlcmd(conn, 'SELECT TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES ORDER BY TABLE_NAME;');
console.log(awTables.out || awTables.err);
results.awalan_tables = awTables.out;

console.log('\n━━━ AWALAN: Article count & date range ━━━');
const awArts = await sqlcmd(conn, 'SELECT COUNT(*) as total, MIN(PublishDate) as oldest, MAX(PublishDate) as newest FROM Articles;');
console.log(awArts.out || awArts.err);
results.awalan_articles_stats = awArts.out;

console.log('\n━━━ AWALAN: Categories ━━━');
const awCats = await sqlcmd(conn, 'SELECT Id, Title, ParentId, Type FROM Categories ORDER BY ParentId, Id;');
console.log(awCats.out || awCats.err);
results.awalan_categories = awCats.out;

console.log('\n━━━ AWALAN: Users ━━━');
const awUsers = await sqlcmd(conn, 'SELECT COUNT(*) as total FROM AspNetUsers;');
console.log(awUsers.out || awUsers.err);
results.awalan_users = awUsers.out;

console.log('\n━━━ AWALAN: Newsletter subscribers ━━━');
const awNews = await sqlcmd(conn, 'SELECT COUNT(*) as total FROM NewsletterSubscribers;');
console.log(awNews.out || awNews.err);
results.awalan_newsletter = awNews.out;

console.log('\n━━━ AWALAN: Subscriptions/Packages ━━━');
const awSubs = await sqlcmd(conn, 'SELECT COUNT(*) as total FROM UserPackages;');
console.log(awSubs.out || awSubs.err);
results.awalan_subscriptions = awSubs.out;

console.log('\n━━━ AWALAN: Authors/Writers ━━━');
const awAuthors = await sqlcmd(conn, 'SELECT COUNT(*) as total FROM Authors;');
console.log(awAuthors.out || awAuthors.err);
results.awalan_authors = awAuthors.out;

// ── SAVE RESULTS ─────────────────────────────────────────────────────────────

const outFile = resolve(__dirname, 'discovery-results.json');
writeFileSync(outFile, JSON.stringify(results, null, 2));
console.log('\n✅ Discovery complete. Results saved to scripts/discovery-results.json');

conn.end();
