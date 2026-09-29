/**
 * Rebuild pipeline — shared extraction helpers.
 *
 * Design rules (each one exists because the previous migration broke it):
 *  - Transport is JSON, never TSV/PSV. MySQL --batch escapes newlines as literal
 *    "\n" and the old parseTSV never unescaped them; the PowerShell PSV path
 *    stripped newlines outright. Both silently corrupt article bodies.
 *  - Every extract asserts an expected row count and throws on mismatch. The
 *    newsletter list was lost because an empty result was read as an empty table.
 *  - Nothing here writes to any database. Extraction is read-only by construction.
 */
import { createRequire } from 'module';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, createWriteStream, existsSync, readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });

const require = createRequire(import.meta.url);
const { Client: SSH2Client } = require('ssh2');

export const DATA_DIR = resolve(__dirname, 'data');
mkdirSync(DATA_DIR, { recursive: true });

// ── logging ──────────────────────────────────────────────────────────────────
export const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
export const warn = (m) => console.warn(`[WARN] ${m}`);

// ── SSH ──────────────────────────────────────────────────────────────────────
export function sshConnect() {
  return new Promise((res, rej) => {
    const conn = new SSH2Client();
    conn.on('ready', () => res(conn));
    conn.on('error', rej);
    conn.connect({
      host: process.env.SSH_HOST,
      port: Number(process.env.SSH_PORT) || 22,
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD,
      readyTimeout: 30000,
    });
  });
}

export function sshRun(conn, cmd, timeoutMs = 180000) {
  return new Promise((res, rej) => {
    // Collect raw Buffers and decode ONCE at the end.
    //
    // Decoding each chunk individually (`d.toString('utf8')`) corrupts any
    // multi-byte character that straddles a chunk boundary — it becomes U+FFFD.
    // With Arabic that is every character, so a bulk pull silently loses text:
    // measured at 1,929 of 9,192 Drupal bodies before this was fixed. Small
    // queries never show it because their reply fits in a single chunk.
    const outChunks = [], errChunks = [];
    const t = setTimeout(() => rej(new Error('SSH timeout')), timeoutMs);
    conn.exec(cmd, (e, stream) => {
      if (e) { clearTimeout(t); return rej(e); }
      stream.on('data', d => outChunks.push(d));
      stream.stderr.on('data', d => errChunks.push(d));
      stream.on('close', () => {
        clearTimeout(t);
        const out = Buffer.concat(outChunks).toString('utf8');
        const err = Buffer.concat(errChunks).toString('utf8');
        if (!out && err) return rej(new Error('remote stderr: ' + err.slice(0, 400)));
        res(out);
      });
    });
  });
}

// ── MariaDB (Drupal) ─────────────────────────────────────────────────────────
// Rows come back as one JSON object per line via JSON_OBJECT(), so no TSV
// escaping is involved at any point.
export async function drupalJson(conn, sql, timeoutMs = 180000) {
  const oneline = sql.replace(/\s+/g, ' ').trim();
  const escaped = oneline.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const cmd = `"C:\\Program Files\\MariaDB 10.11\\bin\\mysql.exe" -u root -p"${process.env.DRUPAL_DB_PASS}" --default-character-set=utf8mb4 ${process.env.DRUPAL_DB_NAME} --batch --skip-column-names --raw -e "${escaped}" 2>nul`;
  const raw = await sshRun(conn, cmd, timeoutMs);
  const rows = [];
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s || s[0] !== '{') continue;
    try { rows.push(JSON.parse(s)); }
    catch { warn(`unparseable drupal row: ${s.slice(0, 120)}`); }
  }
  return rows;
}

export async function drupalScalar(conn, sql) {
  const r = await drupalJson(conn, sql);
  return r[0] ? Object.values(r[0])[0] : null;
}

// ── SQL Server (awalan) ──────────────────────────────────────────────────────
// PowerShell serialises each batch with ConvertTo-Json, which escapes newlines
// and quotes correctly instead of destroying them.
export async function awalanJson(conn, sql, timeoutMs = 240000) {
  const ps = sql.replace(/\s+/g, ' ').trim().replace(/'/g, "''").replace(/`/g, '``');
  const connStr = `Data Source=localhost,1434;Initial Catalog=${process.env.AWALAN_DB_NAME};User ID=${process.env.AWALAN_DB_USER};Password=${process.env.AWALAN_DB_PASS};`;
  // A failed query must surface as an exception, never as an empty result set —
  // that confusion is what silently dropped tables from the last migration.
  const script = [
    `$OutputEncoding=[System.Text.Encoding]::UTF8`,
    `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8`,
    `try{`,
    `$c=New-Object System.Data.SqlClient.SqlConnection('${connStr}')`,
    `$c.Open()`,
    `$q=$c.CreateCommand()`,
    `$q.CommandText='${ps}'`,
    `$q.CommandTimeout=300`,
    `$t=New-Object System.Data.DataTable`,
    `$t.Load($q.ExecuteReader())`,
    `$rows=@()`,
    `foreach($r in $t.Rows){$o=@{};foreach($col in $t.Columns){$v=$r[$col];if($v -is [DBNull]){$o[$col.ColumnName]=$null}else{$o[$col.ColumnName]=[string]$v}};$rows+=New-Object PSObject -Property $o}`,
    `Write-Output ('<<<JSON' + ($rows | ConvertTo-Json -Compress -Depth 3) + 'JSON>>>')`,
    `$c.Close()`,
    `}catch{Write-Output ('<<<SQLERR' + $_.Exception.Message + 'SQLERR>>>')}`,
  ].join(';');
  const raw = await sshRun(conn, `powershell -NoProfile -Command "${script}"`, timeoutMs);
  const errMatch = raw.match(/<<<SQLERR([\s\S]*?)SQLERR>>>/);
  if (errMatch) throw new Error(`awalan SQL error: ${errMatch[1].trim()}`);
  const m = raw.match(/<<<JSON([\s\S]*)JSON>>>/);
  if (!m) throw new Error('awalan: no JSON envelope returned. head=' + raw.slice(0, 300));
  const body = m[1].trim();
  if (!body || body === 'null') return [];
  const parsed = JSON.parse(body);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function awalanScalar(conn, sql) {
  const r = await awalanJson(conn, sql);
  return r[0] ? Object.values(r[0])[0] : null;
}

// ── NDJSON sink ──────────────────────────────────────────────────────────────
export function ndjsonWriter(name) {
  const path = resolve(DATA_DIR, `${name}.ndjson`);
  const stream = createWriteStream(path, { flags: 'w' });
  let n = 0;
  return {
    path,
    write(rows) { for (const r of rows) { stream.write(JSON.stringify(r) + '\n'); n++; } },
    get count() { return n; },
    close() { return new Promise(res => stream.end(res)); },
  };
}

export function readNdjson(name) {
  const path = resolve(DATA_DIR, `${name}.ndjson`);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}

// ── the guard that would have caught the lost newsletter list ────────────────
export function assertCount(label, actual, expected, tolerance = 0) {
  const lo = expected - tolerance;
  if (actual < lo) {
    throw new Error(
      `EXTRACT FAILED — ${label}: got ${actual} rows, expected at least ${lo}. ` +
      `Refusing to continue with a partial extract.`
    );
  }
  log(`  ✓ ${label}: ${actual} rows (expected ${expected})`);
}

// ── manifest: what we pulled, when, and whether counts reconciled ────────────
export function writeManifest(entries, name = 'manifest') {
  const path = resolve(DATA_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(entries, null, 2));
  log(`manifest written: ${path}`);
}
