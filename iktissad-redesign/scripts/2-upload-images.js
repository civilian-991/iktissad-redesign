/**
 * Script 2: Upload article images to Supabase storage
 * Run on Windows server — no other files needed.
 *
 * 1. Copy ONLY this file to the server (e.g. C:\migration\)
 * 2. npm install @supabase/supabase-js
 * 3. node 2-upload-images.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://vqdxinosmzezjveliemb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZHhpbm9zbXplemp2ZWxpZW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY2NDgyNiwiZXhwIjoyMDg5MjQwODI2fQ.3JWT3VDRYvxLjxdTCXcLmeBqpV_tBru40jLTw9l4Pz0';

const IMAGES_FOLDER = 'C:\\inetpub\\vhosts\\iktissadonline.com\\httpdocs\\sites\\default\\files\\articles\\images\\thumbnail';
const BATCH_SIZE = 20;
const PROGRESS_FILE = path.join(__dirname, 'upload-progress.json');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MIME_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png',  '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

const MAPPING_FILE = path.join(__dirname, 'filename-mapping.json');

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) return new Set(JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')));
  return new Set();
}
function saveProgress(done) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
}

function loadMapping() {
  if (fs.existsSync(MAPPING_FILE)) return JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
  return {};
}
function saveMapping(mapping) {
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
}

// Sanitize filename to only ASCII-safe characters for Supabase storage
function sanitizeFilename(filename) {
  const ext = path.extname(filename).toLowerCase().replace(/[^a-z.]/g, '');
  const base = path.basename(filename, path.extname(filename));
  const safe = base
    .replace(/[^a-zA-Z0-9\-_\.]/g, '-')  // replace anything non-ASCII-safe with -
    .replace(/-+/g, '-')                   // collapse multiple dashes
    .replace(/^-|-$/g, '')                 // trim leading/trailing dashes
    .substring(0, 100)                     // max length
    || 'image';                            // fallback if all chars stripped
  return `${safe}${ext}`;
}

async function uploadFile(filename, mapping) {
  const localPath = path.join(IMAGES_FOLDER, filename);
  const safeFilename = sanitizeFilename(filename);
  const storagePath = `articles/${safeFilename}`;
  const contentType = MIME_TYPES[path.extname(filename).toLowerCase()] || 'image/jpeg';

  // Track original → sanitized mapping (needed to update DB URLs)
  mapping[filename] = safeFilename;

  try {
    const buffer = fs.readFileSync(localPath);
    const { error } = await supabase.storage
      .from('media')
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (error) { console.warn(`\n  ⚠ ${filename}: ${error.message}`); return false; }
    return true;
  } catch (err) {
    console.warn(`\n  ⚠ ${filename}: ${err.message}`);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(IMAGES_FOLDER)) {
    console.error(`Folder not found: ${IMAGES_FOLDER}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(IMAGES_FOLDER)
    .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f));

  console.log(`Found ${allFiles.length} images in folder`);

  const done = loadProgress();
  const mapping = loadMapping();
  console.log(`Resuming — ${done.size} already uploaded`);

  const remaining = allFiles.filter(f => !done.has(f));
  console.log(`Uploading ${remaining.length} remaining...\n`);

  let success = 0, failed = 0;

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (filename) => {
      const ok = await uploadFile(filename, mapping);
      if (ok) { done.add(filename); success++; }
      else failed++;
    }));

    saveProgress(done);
    saveMapping(mapping);
    const pct = Math.round(((i + batch.length) / remaining.length) * 100);
    process.stdout.write(`\r  ${i + batch.length}/${remaining.length} (${pct}%) — ✅ ${success} | ❌ ${failed}`);
  }

  console.log(`\n\nDone! ${success} uploaded, ${failed} failed.`);
  console.log(`Mapping saved to filename-mapping.json — copy it back to your Mac to update the DB.`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
