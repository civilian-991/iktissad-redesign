/**
 * M17 — Page Images from Drupal XML
 *
 * Single Drupal query fetches all issue XMLs (HEX-encoded, TSV-safe).
 * Parses ordered page image URLs and stores them in Supabase — no downloads,
 * images load directly from iktissadonline.com.
 *
 * Updates:
 *   - pages_images TEXT[]  — ordered array of high-res JPG URLs
 *   - pages_ready  BOOLEAN — set to true
 *   - pages        INT     — actual count from XML (corrects any 0 values)
 *
 * Run with: node scripts/migration/m17-page-images.mjs
 */
import { sshConnect, drupalQuery, parseTSV, supabase, log, logErr } from './lib.mjs';

const BASE_URL = 'https://www.iktissadonline.com';

// ── XML parser ───────────────────────────────────────────────────────────────

function parsePageUrls(xml) {
  const highdirM = xml.match(/highdir='([^']*)'/);
  if (!highdirM) return [];
  const highdir = highdirM[1];

  const pageRe = /<page\s([^>]*)\/>/g;
  const pages = [];
  let m;
  while ((m = pageRe.exec(xml)) !== null) {
    const attrs = m[1];
    const fidM = attrs.match(/fid='(\d+)'/);
    const imgM = attrs.match(/imageName='([^']*)'/);
    if (fidM && imgM && imgM[1]) {
      pages.push({ fid: parseInt(fidM[1]), imageName: imgM[1] });
    }
  }

  pages.sort((a, b) => a.fid - b.fid);
  return pages.map(p => `${BASE_URL}/${highdir}/${p.imageName}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const conn = await sshConnect();
log('SSH connected');

log('Fetching all issues + XML from Drupal (single query)...');
const raw = await drupalQuery(conn, `
  SELECT n.nid, ii.issueNumber, ii.rkvid, ii.numberOfPages,
         HEX(ii.xml) as xml_hex
  FROM node n
  JOIN ikt_issue ii ON ii.nid = n.nid
  WHERE n.type = 'iktissue' AND n.status = 1
  ORDER BY ii.issueNumber ASC
`);
conn.end();

const issues = parseTSV(raw);
log(`Found ${issues.length} issues`);

// Load Supabase records
const { data: sbIssues, error: sbErr } = await supabase
  .from('magazine_issues')
  .select('id, issue_number, pages, pages_ready')
  .order('issue_number');

if (sbErr) { logErr('Failed to load Supabase issues', sbErr); process.exit(1); }
const sbByIssueNumber = new Map(sbIssues.map(r => [r.issue_number, r]));

let done = 0, skipped = 0, failed = 0, noXml = 0;

for (const issue of issues) {
  const issueNum = parseInt(issue.issueNumber);
  const sbRecord = sbByIssueNumber.get(issueNum);

  if (!sbRecord) { skipped++; continue; }
  if (sbRecord.pages_ready) { skipped++; continue; }

  if (!issue.xml_hex) {
    log(`  [NO XML] Issue ${issueNum} (${issue.rkvid})`);
    noXml++;
    continue;
  }

  let pageUrls = [];
  try {
    const xml = Buffer.from(issue.xml_hex, 'hex').toString('utf8');
    pageUrls = parsePageUrls(xml);
  } catch (err) {
    logErr(`  XML parse error for issue ${issueNum}`, err);
  }

  if (pageUrls.length === 0) {
    log(`  [EMPTY XML] Issue ${issueNum} (${issue.rkvid})`);
    noXml++;
    continue;
  }

  const updateData = {
    pages_images: pageUrls,
    pages_ready: true,
  };
  if (!sbRecord.pages || sbRecord.pages === 0) {
    updateData.pages = pageUrls.length;
  }

  const { error } = await supabase
    .from('magazine_issues')
    .update(updateData)
    .eq('id', sbRecord.id);

  if (error) {
    logErr(`  ✗ Issue ${issueNum}`, error);
    failed++;
  } else {
    log(`  ✓ Issue ${issueNum} (${issue.rkvid}) — ${pageUrls.length} pages`);
    done++;
  }

  if ((done + failed) % 25 === 0 && done + failed > 0) {
    log(`Progress: ${done + skipped + failed + noXml}/${issues.length}`);
  }
}

log(`\n✅ Page images complete:`);
log(`   ${done} issues updated`);
log(`   ${skipped} skipped (already done or not in Supabase)`);
log(`   ${noXml} had no XML`);
log(`   ${failed} failed`);
log(`\nFlipper reader now loads pages from iktissadonline.com.`);
