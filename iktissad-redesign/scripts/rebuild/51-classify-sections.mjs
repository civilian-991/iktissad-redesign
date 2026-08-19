/**
 * 51 — Assign a section to articles that have none.
 *
 * 7,239 published articles carry no section, so they are unreachable through
 * section navigation. Everything deterministic has already been applied: the
 * awalan categories that remain are layout flags ("Home Top 4 Columns") and
 * masthead labels, not subjects.
 *
 * Constraints, enforced structurally rather than by prompt wording:
 *   - The allowed values are READ FROM THE LIVE `sections` TABLE at runtime.
 *     A returned value that is not in that table is rejected, never written.
 *     The previous classifier hard-coded its enum, drifted out of sync, and
 *     silently discarded 25% of its own output (it emitted `energy-innovation`,
 *     which has never existed, and could not emit `oil-gaz`, our second-largest
 *     sector).
 *   - "unset" is always allowed, so the model is never forced to guess.
 *   - Results are cached by content hash, so re-runs are free and a crash costs
 *     nothing.
 *
 * Usage:
 *   node scripts/rebuild/51-classify-sections.mjs --dry-run --limit 20
 *   node scripts/rebuild/51-classify-sections.mjs --limit 500
 *   node scripts/rebuild/51-classify-sections.mjs
 */
import { DATA_DIR, log, warn } from './lib.mjs';
import { stripMarkup } from './slug.mjs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { generateObject } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1], 10) : null; })();
const CONCURRENCY = 6;
const CACHE_FILE = resolve(DATA_DIR, 'section-classifications.json');

// ── allowed values come from the DATABASE, never from a literal ─────────────
const { data: sectionRows, error: secErr } = await supabase
  .from('sections').select('id, slug, name').order('slug');
if (secErr) throw new Error(secErr.message);
const sectionIdBySlug = new Map(sectionRows.map(r => [r.slug, r.id]));
const SLUGS = sectionRows.map(r => r.slug);
log(`sections available (${SLUGS.length}): ${SLUGS.join(', ')}`);

const schema = z.object({
  section: z.enum([...SLUGS, 'unset']),
  confidence: z.enum(['high', 'medium', 'low']),
});

const guide = sectionRows.map(r => `- ${r.slug} (${r.name})`).join('\n');

const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
log(`cached classifications: ${Object.keys(cache).length}`);

// ── the work list ───────────────────────────────────────────────────────────
const todo = [];
{
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('articles')
      .select('id, slug, title, excerpt, content, tags, sector_id')
      .eq('status', 'published').is('section_id', null)
      .order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data.length) break;
    // profiles are people, not articles — they legitimately have no section
    todo.push(...data.filter(r => !(r.tags || []).includes('profile')));
    if (data.length < 1000) break;
    from += 1000;
  }
}
log(`articles needing a section: ${todo.length}`);
const work = LIMIT ? todo.slice(0, LIMIT) : todo;

const hashOf = (a) => createHash('sha1')
  .update(stripMarkup(a.title) + '|' + stripMarkup(a.excerpt || '').slice(0, 200)).digest('hex').slice(0, 16);

async function classify(a) {
  const key = hashOf(a);
  if (cache[key]) return cache[key];

  const title = stripMarkup(a.title).slice(0, 200);
  const body = stripMarkup(a.excerpt || a.content || '').replace(/\s+/g, ' ').slice(0, 700);
  if (!title && !body) return null;

  try {
    const { object } = await generateObject({
      // Routed through the Vercel AI Gateway (AI_GATEWAY_API_KEY): a plain
      // "provider/model" string is resolved by the gateway, so there is no
      // direct provider account or per-provider rate limit to manage.
      model: 'openai/gpt-5-mini',
      schema,
      system:
`You assign an Arabic business-news article to exactly one section of a financial news site.

The ONLY permitted values are:
${guide}
…or "unset".

Rules:
- Choose the section a reader would expect to browse this story under.
- "unset" is a correct answer. Use it whenever no section clearly fits — never stretch to make one fit.
- Report confidence honestly: "high" only when the fit is obvious.
- Do not invent a section. Values outside the list above are rejected.`,
      prompt: `Title: ${title}\n\nOpening: ${body}`,
    });
    cache[key] = object;
    return object;
  } catch (e) {
    warn(`classify ${a.slug?.slice(0, 40)}: ${e.message.slice(0, 70)}`);
    return null;
  }
}

// ── run ─────────────────────────────────────────────────────────────────────
log(`\nclassifying ${work.length} articles (concurrency ${CONCURRENCY})…`);
const decisions = [];
let done = 0, cursor = 0;

async function worker() {
  for (;;) {
    const i = cursor++;
    if (i >= work.length) return;
    const a = work[i];
    const res = await classify(a);
    done++;
    if (res) decisions.push({ id: a.id, slug: a.slug, ...res });
    if (done % 100 === 0) {
      writeFileSync(CACHE_FILE, JSON.stringify(cache));
      log(`  ${done}/${work.length}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
writeFileSync(CACHE_FILE, JSON.stringify(cache));

const tally = decisions.reduce((m, d) => { m[d.section] = (m[d.section] || 0) + 1; return m; }, {});
const byConf = decisions.reduce((m, d) => { m[d.confidence] = (m[d.confidence] || 0) + 1; return m; }, {});
log('');
log(`classified: ${decisions.length}`);
log('sections chosen:');
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) log(`  ${String(v).padStart(5)}  ${k}`);
log(`confidence: ${JSON.stringify(byConf)}`);

// Only high and medium are applied. Low-confidence stays unset and is exported
// for editors — a wrong section is worse than none, because it puts the article
// in front of the wrong readers.
const applying = decisions.filter(d => d.section !== 'unset' && d.confidence !== 'low');
const held = decisions.filter(d => d.section !== 'unset' && d.confidence === 'low');
log('');
log(`will apply (high/medium): ${applying.length}`);
log(`held for review (low):    ${held.length}`);
log(`model chose "unset":      ${decisions.filter(d => d.section === 'unset').length}`);

writeFileSync(resolve(DATA_DIR, 'section-review.json'), JSON.stringify(held, null, 1));

if (DRY) {
  log('\n--dry-run: nothing written');
  applying.slice(0, 12).forEach(d => log(`  ${d.section.padEnd(12)} ${d.confidence.padEnd(7)} ${d.slug.slice(0, 55)}`));
  process.exit(0);
}

let updated = 0, rejected = 0;
for (let i = 0; i < applying.length; i += 200) {
  const chunk = applying.slice(i, i + 200);
  await Promise.all(chunk.map(async d => {
    const sid = sectionIdBySlug.get(d.section);
    if (!sid) { rejected++; return; }          // structural guard, not a prompt rule
    const { error } = await supabase.from('articles').update({ section_id: sid }).eq('id', d.id);
    if (!error) updated++;
  }));
  if (i % 1000 === 0 && i) log(`  applied ${updated}…`);
}
log('');
log(`sections applied: ${updated}`);
log(`rejected (slug not in the sections table): ${rejected}`);
