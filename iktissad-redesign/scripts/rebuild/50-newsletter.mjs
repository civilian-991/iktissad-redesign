/**
 * 50 — Recover the newsletter list from iktissadonline.com.
 *
 * 32,007 subscribers, 31,996 confirmed opt-in, segmented across 7 newsletters.
 * The original migration missed all of them: it read `simplenews_subscriptions`
 * (plural), got an empty result, recorded "empty — skip" and moved on. The real
 * table is `simplenews_subscriber`.
 *
 * The list dates from 2019-2020, so it is imported as UNCONFIRMED by default —
 * a six-year-old list must be re-permissioned before it is mailed, or it will
 * damage sending reputation. --confirmed overrides that.
 *
 * Usage:
 *   node scripts/rebuild/50-newsletter.mjs --dry-run
 *   node scripts/rebuild/50-newsletter.mjs                # imports as unconfirmed
 *   node scripts/rebuild/50-newsletter.mjs --confirmed
 */
import { sshConnect, drupalJson, DATA_DIR, log, warn } from './lib.mjs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY = process.argv.includes('--dry-run');
const AS_CONFIRMED = process.argv.includes('--confirmed');

const conn = await sshConnect();
log('SSH connected');

// ── the list, with its segment memberships ──────────────────────────────────
const subs = await drupalJson(conn, `
  SELECT JSON_OBJECT('snid', s.snid, 'mail', s.mail, 'activated', s.activated,
                     'created', s.created, 'language', s.language)
  FROM simplenews_subscriber s ORDER BY s.snid`, 300000);
log(`subscribers at source: ${subs.length}`);

const cats = await drupalJson(conn, `
  SELECT JSON_OBJECT('tid', c.tid, 'name', t.name)
  FROM simplenews_category c LEFT JOIN taxonomy_term_data t ON t.tid = c.tid`);
const catName = new Map(cats.map(c => [Number(c.tid), c.name]));

const subsc = await drupalJson(conn, `
  SELECT JSON_OBJECT('snid', snid, 'tid', tid, 'status', status)
  FROM simplenews_subscription WHERE status = 1 ORDER BY snid`, 300000);
log(`active subscriptions: ${subsc.length}`);
conn.end();

// ── assemble ────────────────────────────────────────────────────────────────
const segsOf = new Map();
for (const r of subsc) {
  const k = Number(r.snid);
  if (!segsOf.has(k)) segsOf.set(k, []);
  const n = catName.get(Number(r.tid));
  if (n) segsOf.get(k).push(n);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const seen = new Set();
const rows = [];
let invalid = 0, dupe = 0;

for (const s of subs) {
  const mail = String(s.mail || '').trim().toLowerCase();
  if (!EMAIL.test(mail)) { invalid++; continue; }
  if (seen.has(mail)) { dupe++; continue; }
  seen.add(mail);
  rows.push({
    email: mail,
    // Confirmed opt-in at source, but the list is ~6 years old. Importing as
    // 'unconfirmed' forces a re-permission step before anything is sent.
    status: AS_CONFIRMED ? 'active' : 'unconfirmed',
    subscribed_at: Number(s.created) > 0
      ? new Date(Number(s.created) * 1000).toISOString()
      : new Date('2020-01-01').toISOString(),
    segments: segsOf.get(Number(s.snid)) || [],
    was_activated: Number(s.activated) === 1,
  });
}

const bySeg = {};
for (const r of rows) for (const g of r.segments) bySeg[g] = (bySeg[g] || 0) + 1;

log('');
log(`valid + unique:      ${rows.length}`);
log(`  invalid address:   ${invalid}`);
log(`  duplicate address: ${dupe}`);
log(`  confirmed at source: ${rows.filter(r => r.was_activated).length}`);
log('');
log('segments:');
for (const [g, n] of Object.entries(bySeg).sort((a, b) => b[1] - a[1])) log(`  ${String(n).padStart(6)}  ${g}`);

// always write the export — this is the asset, independent of any import
const backup = resolve(DATA_DIR, 'newsletter-subscribers.json');
writeFileSync(backup, JSON.stringify(rows, null, 1));
log(`\nexport written: ${backup}`);

if (DRY) { log('\n--dry-run: nothing imported'); process.exit(0); }

// ── import ──────────────────────────────────────────────────────────────────
const { data: existingRows } = await supabase.from('newsletter_subscribers')
  .select('email').order('email', { ascending: true }).limit(50000);
const existing = new Set((existingRows || []).map(r => r.email.toLowerCase()));
log(`already subscribed here: ${existing.size}`);

const toInsert = rows.filter(r => !existing.has(r.email))
  .map(r => ({
    email: r.email,
    status: r.status,
    subscribed_at: r.subscribed_at,
    segments: r.segments,          // the targeting is half the value of the list
    source: 'iktissadonline-simplenews',
  }));
log(`to import: ${toInsert.length}`);

let ok = 0, failed = 0;
for (let i = 0; i < toInsert.length; i += 500) {
  const chunk = toInsert.slice(i, i + 500);
  const { error } = await supabase.from('newsletter_subscribers')
    .upsert(chunk, { onConflict: 'email', ignoreDuplicates: true });
  if (error) { failed += chunk.length; warn(`batch ${i}: ${error.message.slice(0, 100)}`); }
  else ok += chunk.length;
  if (i % 5000 === 0 && i) log(`  ${i}/${toInsert.length}`);
}
log('');
log(`imported: ${ok}`);
log(`failed:   ${failed}`);
