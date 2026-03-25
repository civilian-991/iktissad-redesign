/**
 * M07 — Migrate 201 Drupal magazine issues → Supabase magazine_issues table
 * Also links articles to issues via magazine_articles junction table
 */
import { sshConnect, drupalQuery, parseTSV, makeSlug, supabase, log, logErr } from './lib.mjs';

const conn = await sshConnect();
log('SSH connected');

// ── Fetch magazine issues ────────────────────────────────────────────────────
log('Fetching magazine issues...');
const raw = await drupalQuery(conn, `
  SELECT
    n.nid, n.title, n.status,
    ii.issueNumber, ii.issueType, ii.publishingDate, ii.numberOfPages, ii.publication,
    fmcover.uri as cover_uri,
    fmpdf.uri as pdf_uri,
    n.created, n.changed
  FROM node n
  JOIN ikt_issue ii ON ii.nid = n.nid
  LEFT JOIN field_data_field_issue_image fc ON fc.entity_id = n.nid
  LEFT JOIN file_managed fmcover ON fmcover.fid = fc.field_issue_image_fid
  LEFT JOIN field_data_iktissue_pdf fpdf ON fpdf.entity_id = n.nid
  LEFT JOIN file_managed fmpdf ON fmpdf.fid = fpdf.iktissue_pdf_fid
  WHERE n.type = 'iktissue' AND n.status = 1
  ORDER BY ii.publishingDate ASC;
`);

const issues = parseTSV(raw);
log(`Found ${issues.length} magazine issues`);

// Publication map: Drupal publication nid → name
// nid=2 = Al-Iktissad Wal-Aamal, nid=3 = Al-Lubnaniyah
const pubNames = { '2': 'Al-Iktissad Wal-Aamal', '3': 'Al-Lubnaniyah' };

let ok = 0, fail = 0;
const issueNidToSupabaseId = new Map();

for (const issue of issues) {
  if (!issue.nid || !issue.issueNumber) continue;

  const coverUrl = issue.cover_uri
    ? 'https://www.iktissadonline.com/sites/default/files/' + issue.cover_uri.replace('public://', '')
    : '';
  const pdfUrl = issue.pdf_uri
    ? 'https://www.iktissadonline.com/sites/default/files/' + issue.pdf_uri.replace('public://', '')
    : '';

  const record = {
    title: issue.title || '',
    issue_number: parseInt(issue.issueNumber),
    publish_date: issue.publishingDate || new Date().toISOString(),
    pages: issue.numberOfPages ? parseInt(issue.numberOfPages) : 0,
    cover_image: coverUrl,
    pdf_url: pdfUrl,
    status: issue.status === '1' ? 'published' : 'draft',
    created_at: issue.created && parseInt(issue.created) > 0 ? new Date(parseInt(issue.created) * 1000).toISOString() : new Date().toISOString(),
    updated_at: issue.changed && parseInt(issue.changed) > 0 ? new Date(parseInt(issue.changed) * 1000).toISOString() : new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('magazine_issues')
    .upsert(record, { onConflict: 'issue_number' })
    .select('id')
    .single();

  if (error) { logErr(`Issue nid=${issue.nid}: ${issue.title}`, error); fail++; continue; }
  if (data) issueNidToSupabaseId.set(issue.nid, data.id);
  ok++;
}

log(`✅ Magazine issues: ${ok} ok, ${fail} failed`);

// ── Link articles to issues ──────────────────────────────────────────────────
log('Linking articles to magazine issues...');

// Drupal stores article→issue link via ikt_article.issue field (nid reference)
// Also via field_data_iktissue_articles or similar
const linkRaw = await drupalQuery(conn, `
  SELECT ia.nid as article_nid, ia.issue as issue_text
  FROM ikt_article ia
  WHERE ia.issue IS NOT NULL AND ia.issue != ''
  LIMIT 5000;
`);
const links = parseTSV(linkRaw);
log(`  Found ${links.length} article→issue links`);

// We need article Supabase IDs
let linkedOk = 0, linkedFail = 0;

for (const link of links) {
  const issueNid = link.issue_text?.trim();
  if (!issueNid || !issueNidToSupabaseId.has(issueNid)) continue;

  const issueId = issueNidToSupabaseId.get(issueNid);

  // Find the article in Supabase by source_id
  const { data: artData } = await supabase
    .from('articles')
    .select('id')
    .eq('source_id', parseInt(link.article_nid))
    .eq('source_site', 'iktissad')
    .maybeSingle();

  if (!artData) continue;

  const { error } = await supabase
    .from('magazine_articles')
    .upsert({ magazine_id: issueId, article_id: artData.id }, { onConflict: 'magazine_id,article_id' });

  if (error) linkedFail++;
  else linkedOk++;
}

log(`✅ Magazine article links: ${linkedOk} ok, ${linkedFail} failed`);
conn.end();
