/**
 * Shared utilities for all migration scripts
 */
import { createRequire } from 'module';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });

const require = createRequire(import.meta.url);
const { Client: SSH2Client } = require('ssh2');
const mssql = require('mssql');

// ── Supabase ─────────────────────────────────────────────────────────────────
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── SSH Connection ────────────────────────────────────────────────────────────
export function sshConnect() {
  return new Promise((res, rej) => {
    const conn = new SSH2Client();
    conn.on('ready', () => res(conn));
    conn.on('error', rej);
    conn.connect({
      host: process.env.SSH_HOST,
      port: 22,
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD,
      readyTimeout: 30000,
    });
  });
}

// Run a command over SSH, returns stdout string
export function sshRun(conn, cmd, timeoutMs = 30000) {
  return new Promise((res, rej) => {
    let out = '', err = '';
    const t = setTimeout(() => rej(new Error('SSH timeout: ' + cmd.slice(0, 80))), timeoutMs);
    conn.exec(cmd, (e, stream) => {
      if (e) { clearTimeout(t); return rej(e); }
      stream.on('data', d => out += d.toString());
      stream.stderr.on('data', d => err += d.toString());
      stream.on('close', () => { clearTimeout(t); res(out.trim()); });
    });
  });
}

// ── MariaDB (Drupal) via SSH ──────────────────────────────────────────────────
export function drupalQuery(conn, sql, db = process.env.DRUPAL_DB_NAME) {
  // Collapse multiline SQL to single line before shell escaping
  const oneline = sql.replace(/\s+/g, ' ').trim();
  const escaped = oneline.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const cmd = `"C:\\Program Files\\MariaDB 10.11\\bin\\mysql.exe" -u root -p"${process.env.DRUPAL_DB_PASS}" --default-character-set=utf8mb4 ${db} --batch -e "${escaped}" 2>nul`;
  return sshRun(conn, cmd, 60000);
}

// Parse TSV from MySQL --batch output
export function parseTSV(raw) {
  if (!raw) return [];
  const lines = raw.split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).map(line => {
    const vals = line.split('\t');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] === 'NULL' ? null : vals[i]; });
    return obj;
  });
}

// ── SQL Server (awalan) via mssql ─────────────────────────────────────────────
let _sqlPool = null;

export async function getSqlPool() {
  if (_sqlPool) return _sqlPool;
  // SQL Server is localhost on the Windows server — need to connect via SSH tunnel
  // We expose it via port forwarding through SSH
  throw new Error('Use sshSqlQuery() for SQL Server — direct connection not available');
}

// Run sqlcmd with Unicode output via SSH
// We use -f 65001 (UTF-8) and query with CONVERT to get Arabic text
export function awQueryRaw(conn, sql) {
  // Use PowerShell + .NET SqlClient for proper Unicode (sqlcmd can't do it)
  // IMPORTANT: single-line only — Windows cmd.exe splits on newlines
  // Force UTF-8 console output so Arabic text survives the SSH stream
  // Strip CR/LF from field values so multi-line content doesn't break PSV line parsing
  const ps = sql.replace(/\s+/g, ' ').trim()
    .replace(/'/g, "''")
    .replace(/`/g, '``');
  // Use localhost,1434 (TCP port set after SQL Server restart)
  const connStr = `Data Source=localhost,1434;Initial Catalog=${process.env.AWALAN_DB_NAME};User ID=${process.env.AWALAN_DB_USER};Password=${process.env.AWALAN_DB_PASS};`;
  const cmd = `powershell -NoProfile -Command "$OutputEncoding=[System.Text.Encoding]::UTF8;[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;$c=New-Object System.Data.SqlClient.SqlConnection('${connStr}');$c.Open();$q=$c.CreateCommand();$q.CommandText='${ps}';$q.CommandTimeout=120;$r=$q.ExecuteReader();$h=@();for($i=0;$i -lt $r.FieldCount;$i++){$h+=$r.GetName($i)};Write-Output($h -join '|~|');while($r.Read()){$row=@();for($i=0;$i -lt $r.FieldCount;$i++){if($r.IsDBNull($i)){$row+='NULL'}else{$v=[string]$r.GetValue($i);$row+=($v -replace '\\r\\n',' ' -replace '\\r','' -replace '\\n',' ')}};Write-Output($row -join '|~|')};$c.Close()"`;
  return sshRun(conn, cmd, 120000);
}

// Parse pipe-delimited output from awQueryRaw
export function parsePSV(raw) {
  if (!raw) return [];
  const lines = raw.split('\n').filter(l => l.trim() && !l.startsWith('PS '));
  if (lines.length < 2) return [];
  const headers = lines[0].split('|~|').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split('|~|');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i]?.trim() === 'NULL' ? null : vals[i]?.trim() ?? null;
    });
    return obj;
  });
}

// ── HTML Cleaner ──────────────────────────────────────────────────────────────
const sanitizeHtml = require('sanitize-html');

export function cleanHtml(html, baseUrl = 'https://www.iktissadonline.com') {
  if (!html) return '';

  // Fix Drupal relative URLs
  let clean = html
    .replace(/src="\/sites\/default\/files\//gi, `src="${baseUrl}/sites/default/files/`)
    .replace(/href="\/[^"]*"/gi, m => {
      const path = m.slice(6, -1);
      if (path.startsWith('http')) return m;
      return `href="${baseUrl}${path}"`;
    });

  // Strip dangerous/broken elements, keep content
  clean = sanitizeHtml(clean, {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'a', 'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      '*': ['dir', 'lang'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Strip empty paragraphs, Drupal tokens, embedded scripts
    transformTags: {
      'script': () => ({ tagName: 'div', attribs: {}, text: '' }),
      'style': () => ({ tagName: 'div', attribs: {}, text: '' }),
      'iframe': (tagName, attribs) => {
        // Keep YouTube/Vimeo iframes as a placeholder comment
        const src = attribs.src || '';
        if (src.includes('youtube') || src.includes('vimeo')) {
          return { tagName: 'p', attribs: {}, text: `[Video: ${src}]` };
        }
        return { tagName: 'span', attribs: {} };
      },
    },
  });

  // Remove Drupal placeholder tokens like [[{"type":"media",...}]]
  clean = clean.replace(/\[\[{.*?}\]\]/g, '');

  // Collapse excessive whitespace
  clean = clean.replace(/\n{3,}/g, '\n\n').trim();

  return clean;
}

// ── Slugify ───────────────────────────────────────────────────────────────────
export function makeSlug(text, suffix = '') {
  if (!text) return suffix ? `item-${suffix}` : '';
  // Preserve Arabic letters
  const slug = text
    .toLowerCase().trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
  return suffix ? `${slug || 'item'}-${suffix}` : slug;
}

// ── Logger ────────────────────────────────────────────────────────────────────
export function log(msg) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
}

export function logErr(msg, err) {
  console.error(`[ERR] ${msg}`, err?.message || err);
}
