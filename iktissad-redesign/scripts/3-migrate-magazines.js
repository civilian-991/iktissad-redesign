/**
 * Script 3: Migrate magazine issues from Drupal MySQL → Supabase
 * Run locally: node scripts/3-migrate-magazines.js
 */

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

const DB = {
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'migrate123',
  database: 'iktissad',
  charset: 'utf8mb4',
};

const supabase = createClient(
  'https://vqdxinosmzezjveliemb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZHhpbm9zbXplemp2ZWxpZW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY2NDgyNiwiZXhwIjoyMDg5MjQwODI2fQ.3JWT3VDRYvxLjxdTCXcLmeBqpV_tBru40jLTw9l4Pz0'
);

async function main() {
  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection(DB);

  const [issues] = await conn.query(`
    SELECT
      ii.nid,
      n.title,
      n.status,
      ii.issueNumber,
      ii.publishingDate,
      ii.numberOfPages,
      fmcover.uri      AS cover_uri,
      fmcover.filename AS cover_filename,
      fmpdf.uri        AS pdf_uri
    FROM ikt_issue ii
    JOIN node n ON n.nid = ii.nid
    LEFT JOIN field_data_field_issue_image img ON img.entity_id = ii.nid
    LEFT JOIN file_managed fmcover ON fmcover.fid = img.field_issue_image_fid
    LEFT JOIN field_data_iktissue_pdf pdf ON pdf.entity_id = ii.nid
    LEFT JOIN file_managed fmpdf ON fmpdf.fid = pdf.iktissue_pdf_fid
    ORDER BY ii.issueNumber DESC
  `);

  await conn.end();
  console.log(`Found ${issues.length} magazine issues`);

  let success = 0, skipped = 0;

  for (const issue of issues) {
    // cover_image: will be updated later when images are uploaded from Windows server
    const coverImage = issue.cover_uri
      ? `https://www.iktissadonline.com/sites/default/files/${issue.cover_uri.replace('public://', '')}`
      : '';

    const pdfUrl = issue.pdf_uri
      ? `https://www.iktissadonline.com/sites/default/files/${issue.pdf_uri.replace('public://', '')}`
      : '';

    const row = {
      issue_number: issue.issueNumber,
      title: issue.title || `العدد ${issue.issueNumber}`,
      title_en: `Issue ${issue.issueNumber}`,
      subtitle: '',
      cover_image: coverImage,
      publish_date: issue.publishingDate,
      pdf_url: pdfUrl,
      pages: issue.numberOfPages || 0,
      views: 0,
      downloads: 0,
      featured: false,
      status: issue.status === 1 ? 'published' : 'draft',
      highlights: [],
    };

    const { error } = await supabase
      .from('magazine_issues')
      .upsert(row, { onConflict: 'issue_number' });

    if (error) {
      console.warn(`  ⚠ Issue ${issue.issueNumber}: ${error.message}`);
      skipped++;
    } else {
      success++;
      process.stdout.write(`\r  Migrated: ${success} | Skipped: ${skipped}`);
    }
  }

  console.log(`\n\n✅ Done! ${success} magazine issues migrated to Supabase.`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
