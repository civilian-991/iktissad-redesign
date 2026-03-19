/**
 * Script 2: Migrate articles + images → Supabase
 * Run on Windows server (Amazon Lightsail):
 *   1. Copy this file + drupal-export.json to same folder (e.g. C:\migration\)
 *   2. npm install @supabase/supabase-js
 *   3. node 2-migrate-to-supabase.js
 *
 * Reads images directly from local disk — no downloading needed.
 * Resumes automatically if interrupted.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://vqdxinosmzezjveliemb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZHhpbm9zbXplemp2ZWxpZW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY2NDgyNiwiZXhwIjoyMDg5MjQwODI2fQ.3JWT3VDRYvxLjxdTCXcLmeBqpV_tBru40jLTw9l4Pz0';

// Base path where Drupal files live on this server
const DRUPAL_FILES_BASE = 'C:\\inetpub\\vhosts\\iktissadonline.com\\httpdocs\\sites\\default\\files';

const BATCH_SIZE = 20;        // parallel uploads (server has fast connection)
const PROGRESS_FILE = path.join(__dirname, 'migration-progress.json');
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return new Set(JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')));
  }
  return new Set();
}
function saveProgress(done) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
}

async function loadLookups() {
  const [{ data: sections }, { data: sectors }, { data: countries }] = await Promise.all([
    supabase.from('sections').select('id, slug'),
    supabase.from('sectors').select('id, slug'),
    supabase.from('countries').select('id, name'),
  ]);

  const sectionBySlug = {};
  sections?.forEach(s => { sectionBySlug[s.slug] = s.id; });

  const sectorBySlug = {};
  sectors?.forEach(s => { sectorBySlug[s.slug] = s.id; });

  const countryByName = {};
  countries?.forEach(c => { countryByName[c.name] = c.id; });

  return { sectionBySlug, sectorBySlug, countryByName };
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return types[ext] || 'image/jpeg';
}

// Read image from local disk and upload to Supabase storage
async function uploadImage(imageUri, filename) {
  if (!imageUri || !filename) return null;

  // Convert URI path to Windows path
  // imageUri = "sites/default/files/articles/images/thumbnail/file.jpg"
  const relativePath = imageUri.replace(/\//g, '\\');
  const localPath = path.join(DRUPAL_FILES_BASE, relativePath.replace('sites\\default\\files\\', ''));

  if (!fs.existsSync(localPath)) {
    // Try thumbnail subfolder as fallback
    const thumbPath = path.join(DRUPAL_FILES_BASE, 'articles', 'images', 'thumbnail', filename);
    if (!fs.existsSync(thumbPath)) return null;
    return uploadFromPath(thumbPath, filename);
  }

  return uploadFromPath(localPath, filename);
}

async function uploadFromPath(localPath, filename) {
  try {
    const buffer = fs.readFileSync(localPath);
    const contentType = getMimeType(filename);
    const storagePath = `articles/${filename}`;

    const { error } = await supabase.storage
      .from('media')
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (error) {
      console.warn(`\n  ⚠ Storage error for ${filename}: ${error.message}`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(storagePath);

    return publicUrl;
  } catch (err) {
    console.warn(`\n  ⚠ Failed to upload ${filename}: ${err.message}`);
    return null;
  }
}

async function upsertArticle(article, imageUrl, lookups) {
  const { sectionBySlug, sectorBySlug, countryByName } = lookups;

  let countryId = null;
  if (article.country_name) {
    countryId = countryByName[article.country_name];
    if (!countryId) {
      const key = Object.keys(countryByName).find(k =>
        k.includes(article.country_name) || article.country_name.includes(k)
      );
      if (key) countryId = countryByName[key];
    }
  }

  const row = {
    slug: article.slug,
    title: article.title,
    title_en: '',
    excerpt: article.excerpt || '',
    excerpt_en: '',
    content: article.content || '',
    content_en: '',
    featured_image: imageUrl || '',
    section_id: article.section_slug ? sectionBySlug[article.section_slug] || null : null,
    sector_id: article.sector_slug ? sectorBySlug[article.sector_slug] || null : null,
    country_id: countryId || null,
    tags: article.tags || [],
    status: article.status,
    published_at: article.status === 'published' ? article.published_at : null,
    created_at: article.published_at,
    updated_at: article.published_at,
  };

  const { error } = await supabase
    .from('articles')
    .upsert(row, { onConflict: 'slug' });

  if (error) {
    console.warn(`\n  ⚠ DB error for "${article.slug}": ${error.message}`);
    return false;
  }
  return true;
}

async function processBatch(batch, lookups, done) {
  await Promise.all(batch.map(async (article) => {
    if (done.has(String(article.nid))) return;

    const imageUrl = await uploadImage(article.image_uri, article.image_filename);
    const ok = await upsertArticle(article, imageUrl, lookups);

    if (ok) done.add(String(article.nid));
  }));
}

async function main() {
  const exportFile = path.join(__dirname, 'drupal-export.json');
  if (!fs.existsSync(exportFile)) {
    console.error('drupal-export.json not found. Place it in the same folder as this script.');
    process.exit(1);
  }

  console.log('Reading export...');
  const articles = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
  console.log(`Loaded ${articles.length} articles`);

  const done = loadProgress();
  console.log(`Resuming — ${done.size} already migrated`);

  const lookups = await loadLookups();
  console.log(`Supabase lookups ready\n`);

  const remaining = articles.filter(a => !done.has(String(a.nid)));
  console.log(`Migrating ${remaining.length} remaining articles with BATCH_SIZE=${BATCH_SIZE}...\n`);

  let processed = 0;
  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    await processBatch(batch, lookups, done);
    processed += batch.length;
    saveProgress(done);

    const pct = Math.round((processed / remaining.length) * 100);
    process.stdout.write(`\r  ${processed}/${remaining.length} (${pct}%) — done: ${done.size}`);
  }

  console.log(`\n\nDone! ${done.size}/${articles.length} articles migrated to Supabase.`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
