/**
 * M16 — Cover Rescue
 *
 * For all 201 magazine issues:
 *   1. Single Drupal query fetches all issues + HEX(xml) in one SSH call
 *   2. Parse FC (front cover) page image URL from each XML
 *   3. Download high-res JPG from iktissadonline.com
 *   4. Upload to Supabase Storage: magazines/covers/issue-{N}.jpg
 *   5. Update cover_image in magazine_issues
 *
 * Issues already in Supabase Storage are skipped.
 * Run with: node scripts/migration/m16-cover-rescue.mjs
 */
import { sshConnect, drupalQuery, parseTSV, supabase, log, logErr } from './lib.mjs';

const BASE_URL = 'https://www.iktissadonline.com';
const STORAGE_BUCKET = 'magazines';
const CONCURRENCY = 4;

// ── XML helpers ──────────────────────────────────────────────────────────────

function parseHighdir(xml) {
  const m = xml.match(/highdir='([^']*)'/);
  return m ? m[1] : null;
}

function parseFcImageName(xml) {
  const pageRe = /<page\s[^>]*/g;
  let match;
  while ((match = pageRe.exec(xml)) !== null) {
    const tag = match[0];
    if (tag.includes("page_number='FC'")) {
      const imgM = tag.match(/imageName='([^']*)'/);
      return imgM ? imgM[1] : null;
    }
  }
  return null;
}

// ── Download helper ──────────────────────────────────────────────────────────

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IktissadMigration/1.0)' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Main ─────────────────────────────────────────────────────────────────────

const conn = await sshConnect();
log('SSH connected');

log('Fetching all issues + XML from Drupal (single query)...');
// HEX(xml) produces hex-only output — no tabs/newlines, TSV-safe
const raw = await drupalQuery(conn, `
  SELECT n.nid, ii.issueNumber, ii.rkvid,
         fmcover.uri as cover_uri,
         HEX(ii.xml) as xml_hex
  FROM node n
  JOIN ikt_issue ii ON ii.nid = n.nid
  LEFT JOIN field_data_field_issue_image fc ON fc.entity_id = n.nid
  LEFT JOIN file_managed fmcover ON fmcover.fid = fc.field_issue_image_fid
  WHERE n.type = 'iktissue' AND n.status = 1
  ORDER BY ii.issueNumber ASC
`);
conn.end();

const issues = parseTSV(raw);
log(`Found ${issues.length} issues in Drupal`);

// Load Supabase records
const { data: sbIssues, error: sbErr } = await supabase
  .from('magazine_issues')
  .select('id, issue_number, cover_image')
  .order('issue_number');

if (sbErr) { logErr('Failed to load Supabase issues', sbErr); process.exit(1); }
const sbByIssueNumber = new Map(sbIssues.map(r => [r.issue_number, r]));
log(`Loaded ${sbIssues.length} issues from Supabase`);

// ── Process each issue ───────────────────────────────────────────────────────

let done = 0, skipped = 0, failed = 0;

async function processIssue(issue) {
  const issueNum = parseInt(issue.issueNumber);
  const sbRecord = sbByIssueNumber.get(issueNum);

  if (!sbRecord) { skipped++; return; }

  // Skip if already in Supabase Storage
  if (sbRecord.cover_image && sbRecord.cover_image.includes('supabase')) {
    skipped++;
    return;
  }

  let imageUrl = null;

  // Parse FC from XML
  if (issue.xml_hex) {
    try {
      const xml = Buffer.from(issue.xml_hex, 'hex').toString('utf8');
      const highdir = parseHighdir(xml);
      const fcName = parseFcImageName(xml);
      if (highdir && fcName) {
        imageUrl = `${BASE_URL}/${highdir}/${fcName}`;
      }
    } catch { /* fall through */ }
  }

  // Fallback: stored cover_uri
  if (!imageUrl && issue.cover_uri) {
    imageUrl = `${BASE_URL}/sites/default/files/${issue.cover_uri.replace('public://', '')}`;
  }

  // Fallback: existing external cover_image
  if (!imageUrl && sbRecord.cover_image?.startsWith('http')) {
    imageUrl = sbRecord.cover_image;
  }

  if (!imageUrl) {
    log(`  [NO SOURCE] Issue ${issueNum} (${issue.rkvid})`);
    skipped++;
    return;
  }

  try {
    const imgBuf = await downloadImage(imageUrl);
    const storagePath = `covers/issue-${issueNum}.jpg`;

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, imgBuf, { contentType: 'image/jpeg', upsert: true });

    if (upErr) throw new Error(`Storage: ${upErr.message}`);

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const { error: updErr } = await supabase
      .from('magazine_issues')
      .update({ cover_image: urlData.publicUrl })
      .eq('id', sbRecord.id);

    if (updErr) throw new Error(`DB: ${updErr.message}`);

    log(`  ✓ Issue ${issueNum} (${issue.rkvid}) — ${(imgBuf.length / 1024).toFixed(0)}KB`);
    done++;
  } catch (err) {
    logErr(`  ✗ Issue ${issueNum} (${issue.rkvid})`, err);
    failed++;
  }
}

// Process with limited concurrency to avoid hammering old server
for (let i = 0; i < issues.length; i += CONCURRENCY) {
  await Promise.all(issues.slice(i, i + CONCURRENCY).map(processIssue));
  if (i > 0 && i % 20 === 0) {
    log(`Progress: ${i}/${issues.length} — ✓${done} skip${skipped} ✗${failed}`);
  }
}

log(`\n✅ Cover rescue complete: ${done} uploaded, ${skipped} skipped, ${failed} failed`);
