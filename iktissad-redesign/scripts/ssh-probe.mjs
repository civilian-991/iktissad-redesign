/**
 * SSH probe — connects to Windows server, runs discovery commands
 * Usage: node scripts/ssh-probe.mjs
 */

import { createRequire } from 'module';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const require = createRequire(import.meta.url);
const { Client } = require('ssh2');

const SSH = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
  readyTimeout: 20000,
};

function run(conn, cmd) {
  return new Promise((resolve, reject) => {
    let out = '';
    let err = '';
    conn.exec(cmd, (e, stream) => {
      if (e) return reject(e);
      stream.on('data', d => out += d.toString());
      stream.stderr.on('data', d => err += d.toString());
      stream.on('close', () => resolve({ out: out.trim(), err: err.trim() }));
    });
  });
}

async function main() {
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(SSH);
  });

  console.log('✅ SSH connected\n');

  // ── 1. List all hosted websites ──────────────────────────────────────
  console.log('=== HOSTED WEBSITES ===');
  const vhosts = await run(conn, 'dir /b C:\\Inetpub\\vhosts');
  console.log(vhosts.out || vhosts.err);

  // ── 2. Find Plesk MySQL credentials file ─────────────────────────────
  console.log('\n=== PLESK MYSQL CREDENTIALS ===');
  const psa = await run(conn, 'type "C:\\Program Files (x86)\\Parallels\\Plesk\\etc\\psa.conf" 2>nul || type "C:\\Program Files\\Parallels\\Plesk\\etc\\psa.conf" 2>nul || echo not found');
  console.log(psa.out || psa.err);

  // ── 3. Check MySQL / MariaDB service ─────────────────────────────────
  console.log('\n=== DATABASE SERVICES ===');
  const services = await run(conn, 'sc query type= all state= all | findstr /i "mysql mssql mariadb plesk"');
  console.log(services.out || 'none found');

  // ── 4. Find MySQL bin ─────────────────────────────────────────────────
  console.log('\n=== MYSQL LOCATION ===');
  const mysqlPath = await run(conn, 'where mysql 2>nul || dir /s /b "C:\\Program Files\\mysql*\\bin\\mysql.exe" 2>nul | head -1 || dir /s /b "C:\\Program Files (x86)\\mysql*\\bin\\mysql.exe" 2>nul | head -1 || echo not in PATH');
  console.log(mysqlPath.out || mysqlPath.err);

  // ── 5. List databases via Plesk CLI ──────────────────────────────────
  console.log('\n=== PLESK DATABASES LIST ===');
  const dbList = await run(conn, '"C:\\Program Files (x86)\\Parallels\\Plesk\\bin\\database.exe" --list 2>nul || "C:\\Program Files\\Parallels\\Plesk\\bin\\database.exe" --list 2>nul || echo plesk db cli not found');
  console.log(dbList.out || dbList.err);

  // ── 6. Check Node.js ──────────────────────────────────────────────────
  console.log('\n=== NODE.JS ===');
  const nodeVer = await run(conn, 'node --version 2>nul || echo not installed');
  console.log(nodeVer.out || nodeVer.err);

  // ── 7. Check .NET / IIS ───────────────────────────────────────────────
  console.log('\n=== .NET & IIS ===');
  const iis = await run(conn, 'sc query W3SVC && dotnet --version 2>nul');
  console.log(iis.out || iis.err);

  // ── 8. Drupal httpdocs path ───────────────────────────────────────────
  console.log('\n=== IKTISSAD FILES ===');
  const ikFiles = await run(conn, 'dir /b "C:\\Inetpub\\vhosts\\iktissadonline.com\\httpdocs\\sites\\default\\files" 2>nul || echo path not found - trying alt');
  console.log(ikFiles.out || ikFiles.err);

  conn.end();
}

main().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
// Extra probe - run separately
