/**
 * Discovery round 2 — precise queries with correct table names
 */
import { createRequire } from 'module';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });
const require = createRequire(import.meta.url);
const { Client } = require('ssh2');

const SSH = { host: process.env.SSH_HOST, port: 22, username: process.env.SSH_USER, password: process.env.SSH_PASSWORD, readyTimeout: 30000 };

function run(conn, cmd) {
  return new Promise((res, rej) => {
    let out = '', err = '';
    conn.exec(cmd, (e, stream) => {
      if (e) return rej(e);
      stream.on('data', d => out += d.toString());
      stream.stderr.on('data', d => err += d.toString());
      stream.on('close', () => res({ out: out.trim(), err: err.trim() }));
    });
  });
}

function mysql(conn, q) {
  const cmd = `"C:\\Program Files\\MariaDB 10.11\\bin\\mysql.exe" -u root -p"${process.env.DRUPAL_DB_PASS}" ${process.env.DRUPAL_DB_NAME} -e "${q.replace(/"/g, '\\"')}" 2>nul`;
  return run(conn, cmd);
}

function sql(conn, q) {
  const cmd = `sqlcmd -S ".\\${process.env.AWALAN_DB_INSTANCE}" -U ${process.env.AWALAN_DB_USER} -P "${process.env.AWALAN_DB_PASS}" -d ${process.env.AWALAN_DB_NAME} -Q "${q.replace(/"/g, '\\"')}" -W -s"|" 2>nul`;
  return run(conn, cmd);
}

const conn = new Client();
await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', rej); conn.connect(SSH); });
console.log('✅ Connected\n');

// ── DRUPAL ──────────────────────────────────────────────────────────────────

console.log('=== DRUPAL: Articles (correct type name) ===');
const a1 = await mysql(conn, "SELECT COUNT(*) as total, MIN(FROM_UNIXTIME(created)) as oldest, MAX(FROM_UNIXTIME(created)) as newest FROM node WHERE type='iktarticle' AND status=1;");
console.log(a1.out || a1.err);

console.log('\n=== DRUPAL: Magazines (correct type) ===');
const a2 = await mysql(conn, "SELECT COUNT(*) as total, MIN(FROM_UNIXTIME(created)) as oldest, MAX(FROM_UNIXTIME(created)) as newest FROM node WHERE type='iktissue' AND status=1;");
console.log(a2.out || a2.err);

console.log('\n=== DRUPAL: Publications (extra magazines) ===');
const a3 = await mysql(conn, "SELECT n.nid, n.title, FROM_UNIXTIME(n.created) as created FROM node n WHERE type='iktpublication' AND status=1;");
console.log(a3.out || a3.err);

console.log('\n=== DRUPAL: iktarticle custom table columns ===');
const a4 = await mysql(conn, "DESCRIBE ikt_article;");
console.log(a4.out || a4.err);

console.log('\n=== DRUPAL: Newsletter subscribers count ===');
const a5 = await mysql(conn, "SELECT COUNT(*) as total FROM simplenews_subscriptions WHERE status=1;");
console.log(a5.out || a5.err);

console.log('\n=== DRUPAL: Newsletter lists ===');
const a6 = await mysql(conn, "SELECT * FROM simplenews_newsletter;");
console.log(a6.out || a6.err);

console.log('\n=== DRUPAL: ikttaxonomy_article_by (byline authors) ===');
const a7 = await mysql(conn, "SELECT t.tid, t.name FROM taxonomy_term_data t JOIN taxonomy_vocabulary v ON v.vid=t.vid WHERE v.machine_name='ikttaxonomy_article_by' ORDER BY t.name;");
console.log(a7.out || a7.err);

console.log('\n=== DRUPAL: Users sample ===');
const a8 = await mysql(conn, "SELECT uid, name, mail, FROM_UNIXTIME(created) as created, status FROM users WHERE uid > 0 ORDER BY created DESC LIMIT 10;");
console.log(a8.out || a8.err);

console.log('\n=== DRUPAL: Magazine sections (ابواب المجلة) ===');
const a9 = await mysql(conn, "SELECT t.tid, t.name FROM taxonomy_term_data t JOIN taxonomy_vocabulary v ON v.vid=t.vid WHERE v.machine_name='ikttaxonomy_sections' ORDER BY t.name;");
console.log(a9.out || a9.err);

console.log('\n=== DRUPAL: Files path root ===');
const a10 = await mysql(conn, "SELECT uri FROM file_managed WHERE status=1 LIMIT 3;");
console.log(a10.out || a10.err);

// ── AWALAN ──────────────────────────────────────────────────────────────────

console.log('\n=== AWALAN: Article table schema ===');
const b1 = await sql(conn, "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Article' ORDER BY ORDINAL_POSITION;");
console.log(b1.out || b1.err);

console.log('\n=== AWALAN: Article count & dates ===');
const b2 = await sql(conn, "SELECT COUNT(*) as total, MIN(PublishDate) as oldest, MAX(PublishDate) as newest FROM Article;");
console.log(b2.out || b2.err);

console.log('\n=== AWALAN: Categories ===');
const b3 = await sql(conn, "SELECT Id, Title, ParentId FROM Category ORDER BY ParentId, Id;");
console.log(b3.out || b3.err);

console.log('\n=== AWALAN: Article types ===');
const b4 = await sql(conn, "SELECT Id, Title FROM ArticleType;");
console.log(b4.out || b4.err);

console.log('\n=== AWALAN: Writers/Authors ===');
const b5 = await sql(conn, "SELECT TOP 20 Id, FullName, Email FROM ArticleWriter ORDER BY Id;");
console.log(b5.out || b5.err);

console.log('\n=== AWALAN: Newsletter subscribers ===');
const b6 = await sql(conn, "SELECT COUNT(*) as total FROM NewsletterUser;");
console.log(b6.out || b6.err);

console.log('\n=== AWALAN: Packages ===');
const b7 = await sql(conn, "SELECT Id, Title, Price, Duration FROM Package;");
console.log(b7.out || b7.err);

console.log('\n=== AWALAN: User subscriptions ===');
const b8 = await sql(conn, "SELECT COUNT(*) as total FROM AspNetUserPackage;");
console.log(b8.out || b8.err);

console.log('\n=== AWALAN: HighProfile (People section) ===');
const b9 = await sql(conn, "SELECT COUNT(*) as total FROM HighProfile;");
console.log(b9.out || b9.err);

console.log('\n=== AWALAN: Reports ===');
const b10 = await sql(conn, "SELECT COUNT(*) as total FROM Report;");
console.log(b10.out || b10.err);

console.log('\n=== AWALAN: Users sample ===');
const b11 = await sql(conn, "SELECT TOP 5 Id, Email, UserName, EmailConfirmed FROM AspNetUsers ORDER BY Id;");
console.log(b11.out || b11.err);

console.log('\n=== AWALAN: Country table ===');
const b12 = await sql(conn, "SELECT TOP 30 Id, Title FROM Country ORDER BY Id;");
console.log(b12.out || b12.err);

conn.end();
console.log('\n✅ Discovery 2 complete.');
