/**
 * M08 — Migrate newsletter subscribers from awalan (369 subscribers)
 * Drupal simplenews_subscriptions is empty — skip
 * Idempotent: upsert on email
 */
import { sshConnect, awQueryRaw, parsePSV, supabase, log, logErr } from './lib.mjs';

const conn = await sshConnect();
log('SSH connected');

log('Fetching awalan newsletter subscribers...');
const raw = await awQueryRaw(conn, `
  SELECT
    id, email, firstName, lastName, name, company,
    position, phone, mobile, industry, gender,
    dateCreated
  FROM NewsletterUser
  WHERE email IS NOT NULL AND email != ''
  ORDER BY dateCreated;
`);

const rows = parsePSV(raw);
log(`Found ${rows.length} newsletter subscribers`);

// Deduplicate by email
const seen = new Map();
for (const r of rows) {
  const email = r.email?.toLowerCase().trim();
  if (!email || email === 'null') continue;
  if (!seen.has(email)) {
    seen.set(email, {
      email,
      status: 'active',
      subscribed_at: r.dateCreated && r.dateCreated !== 'NULL' ? r.dateCreated : new Date().toISOString(),
    });
  }
}

const subscribers = [...seen.values()];
log(`Upserting ${subscribers.length} unique subscribers...`);

let ok = 0, fail = 0;

// Batch upsert
for (let i = 0; i < subscribers.length; i += 50) {
  const batch = subscribers.slice(i, i + 50);

  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert(batch, { onConflict: 'email' });

  if (error) {
    for (const s of batch) {
      const { error: e2 } = await supabase
        .from('newsletter_subscribers')
        .upsert({ email: s.email, status: 'active', subscribed_at: s.subscribed_at }, { onConflict: 'email' });
      if (e2) { logErr(`Subscriber: ${s.email}`, e2); fail++; }
      else ok++;
    }
  } else {
    ok += batch.length;
  }
}

log(`✅ Newsletter subscribers: ${ok} ok, ${fail} failed`);
conn.end();
