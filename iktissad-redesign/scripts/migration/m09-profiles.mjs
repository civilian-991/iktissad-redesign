/**
 * M09 — Migrate awalan HighProfile records (2,278 people profiles)
 * These are "People & Business" / executive profiles
 * Stored as articles with content_type = 'profile' + source_site = 'awalan'
 */
import { sshConnect, awQueryRaw, parsePSV, makeSlug, cleanHtml, supabase, log, logErr } from './lib.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = resolve(__dirname, 'progress-profiles.json');

let done = new Set();
if (existsSync(PROGRESS_FILE)) {
  done = new Set(JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')));
  log(`Resuming: ${done.size} profiles already migrated`);
}

const conn = await sshConnect();
log('SSH connected');

const BATCH = 200;

// Get all profile IDs
const idsRaw = await awQueryRaw(conn, `
  SELECT id FROM HighProfile WHERE isDeleted = 0 ORDER BY id;
`);
const allIds = parsePSV(idsRaw).map(r => r.id).filter(id => !done.has(id));
log(`Profiles to migrate: ${allIds.length}`);

let totalOk = 0, totalFail = 0;

for (let i = 0; i < allIds.length; i += BATCH) {
  const batch = allIds.slice(i, i + BATCH);
  const idList = batch.join(',');

  const raw = await awQueryRaw(conn, `
    SELECT
      hp.id, hp.fullName as name,
      hp.biography as bio,
      hp.imgSrc as image_url,
      hp.dateCreated as created_at,
      hp.dateModified as updated_at,
      hp.isFeatured as is_featured,
      hp.isPublished as is_published
    FROM HighProfile hp
    WHERE hp.id IN (${idList}) AND hp.isDeleted = 0
    ORDER BY hp.id;
  `);

  const profiles = parsePSV(raw);
  const toUpsert = [];

  for (const p of profiles) {
    if (!p.name || !p.id || isNaN(parseInt(p.id))) continue;

    const slug = makeSlug(p.name, `profile-${p.id}`);
    const imageUrl = p.image_url && p.image_url !== 'NULL'
      ? `https://api.awalan.com/Content/uploads/articles/${p.image_url}`
      : null;
    const createdAt = p.created_at && p.created_at !== 'NULL' ? p.created_at : null;
    const updatedAt = p.updated_at && p.updated_at !== 'NULL' ? p.updated_at : null;

    toUpsert.push({
      title: p.name,
      slug,
      excerpt: '',
      content: p.bio && p.bio !== 'NULL' ? cleanHtml(p.bio, 'https://awalan.com') : '',
      featured_image: imageUrl || '',
      status: p.is_published === 'True' ? 'published' : 'draft',
      published_at: createdAt,
      created_at: createdAt || new Date().toISOString(),
      updated_at: updatedAt || createdAt || new Date().toISOString(),
      featured: p.is_featured === 'True',
      source_site: 'awalan',
      source_id: parseInt(p.id),
      tags: ['profile'],
    });
  }

  if (toUpsert.length === 0) continue;

  const { error } = await supabase
    .from('articles')
    .upsert(toUpsert, { onConflict: 'slug' });

  if (error) {
    for (const p of toUpsert) {
      const safe = { ...p, slug: `${p.slug}-hp${p.source_id}`.slice(0, 200) };
      const { error: e2 } = await supabase.from('articles').upsert(safe, { onConflict: 'slug' });
      if (e2) { logErr(`Profile id=${p.source_id}`, e2); totalFail++; }
      else { done.add(p.source_id?.toString()); totalOk++; }
    }
  } else {
    toUpsert.forEach(p => done.add(p.source_id?.toString()));
    totalOk += toUpsert.length;
  }

  writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
  log(`Progress: ${totalOk + done.size} / ${allIds.length + done.size}`);
}

log(`✅ Profiles done: ${totalOk} ok, ${totalFail} failed`);
conn.end();
