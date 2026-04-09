/**
 * M06C — Patch video_url for awalan articles from Article.videoUrl column
 *
 * Usage:
 *   node scripts/migration/m06c-video-urls.mjs --dry-run
 *   node scripts/migration/m06c-video-urls.mjs
 */
import { sshConnect, awQueryRaw, parsePSV, supabase, log, logErr } from './lib.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const conn = await sshConnect();
log('SSH connected');

// ── Fetch all articles with a videoUrl or videoSrc ────────────────────────────
log('Fetching video URLs from Article table...');
const raw = await awQueryRaw(conn, `
  SELECT id, videoSrc, videoUrl
  FROM Article
  WHERE (videoUrl IS NOT NULL AND videoUrl <> '')
     OR (videoSrc IS NOT NULL AND videoSrc <> '')
  ORDER BY id
`);
const rows = parsePSV(raw).filter(r => r.id);
log(`Found ${rows.length} articles with video`);

if (DRY_RUN) {
  log('[DRY RUN] Sample rows:');
  rows.slice(0, 10).forEach(r => log(`  id=${r.id}  videoUrl=${r.videoUrl}  videoSrc=${r.videoSrc}`));
  conn.end();
  process.exit(0);
}

// ── Build canonical video URL ─────────────────────────────────────────────────
function buildVideoUrl(videoUrl, videoSrc) {
  const raw = (videoUrl || videoSrc || '').trim();
  if (!raw || raw === 'NULL') return null;
  // Must be a valid URL
  if (!raw.startsWith('http')) return null;
  // Basic URL validation
  try { new URL(raw); } catch { return null; }
  return raw;
}

// ── Update Supabase ────────────────────────────────────────────────────────────
let ok = 0, skip = 0, fail = 0;

for (const row of rows) {
  const sourceId = parseInt(row.id);
  const videoUrl = buildVideoUrl(row.videoUrl, row.videoSrc);
  if (!videoUrl) { skip++; continue; }

  const { error } = await supabase
    .from('articles')
    .update({ video_url: videoUrl })
    .eq('source_site', 'awalan')
    .eq('source_id', sourceId);

  if (error) {
    logErr(`  source_id=${sourceId}`, error);
    fail++;
  } else {
    ok++;
  }
}

log(`✅ Done: ${ok} updated, ${skip} skipped, ${fail} failed`);
conn.end();
