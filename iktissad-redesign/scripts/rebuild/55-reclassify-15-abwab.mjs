/**
 * 55 — Refile the archive against the 15-باب information architecture.
 *
 * Migration 050 renamed six sections and added five that never existed
 * (عمق، حركة الأعمال، قيادات، بالأرقام، على الساحة). Renames carry their
 * articles along for free; the five new أبواب start empty and have to win
 * their articles from the existing pool. That is what this does.
 *
 * It is deliberately more conservative than 51-classify-sections, because the
 * inputs are different: 51 filed articles that had NO section, where any
 * confident answer beats nothing. This one MOVES articles that are already
 * filed somewhere plausible, so a wrong answer is a regression, not a gap.
 *
 *   - A move needs "high" confidence. Medium keeps the current section.
 *   - Staying put is always available and is the model's default.
 *   - The allowed values are read from the live `sections` table; anything
 *     outside it is rejected before it can be written (same guard as 51).
 *   - The cache key includes a fingerprint of the section vocabulary, so the
 *     old cache from 51 — computed against the pre-rename list — can never be
 *     replayed into the new one.
 *   - --apply first snapshots every current section_id into
 *     article_section_backup_050, so the whole pass is revertible with one
 *     UPDATE ... FROM.
 *
 * Usage:
 *   node scripts/rebuild/55-reclassify-15-abwab.mjs --limit 200          # sample, no writes
 *   node scripts/rebuild/55-reclassify-15-abwab.mjs                      # full run, no writes
 *   node scripts/rebuild/55-reclassify-15-abwab.mjs --apply              # full run, writes
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
const APPLY = args.includes('--apply');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1], 10) : null; })();
const CONCURRENCY = 20;
const CACHE_FILE = resolve(DATA_DIR, 'section-classifications-15.json');

// ── allowed values come from the DATABASE, never from a literal ─────────────
const { data: sectionRows, error: secErr } = await supabase
  .from('sections').select('id, slug, name').order('slug');
if (secErr) throw new Error(secErr.message);
const sectionIdBySlug = new Map(sectionRows.map(r => [r.slug, r.id]));
const sectionSlugById = new Map(sectionRows.map(r => [r.id, r.slug]));
const SLUGS = sectionRows.map(r => r.slug);
log(`sections available (${SLUGS.length}): ${SLUGS.join(', ')}`);

// Cache entries are only valid for the vocabulary they were produced against.
const VOCAB = createHash('sha1').update(SLUGS.join(',')).digest('hex').slice(0, 8);
log(`vocabulary fingerprint: ${VOCAB}`);

// What each باب means editorially. Without this the model cannot tell عمق from
// المشهد الاقتصادي, or قيادات from عالم الشركات — the names alone do not carry
// the distinction.
const GUIDE = {
  economy:    'الاقتصاد الكلي: ناتج محلي، تضخم، موازنات، سياسة نقدية ومالية، بنوك مركزية، اتفاقيات اقتصادية بين الدول.',
  markets:    'الأسواق المالية: بورصات ومؤشرات، أسهم، سندات، عملات، ذهب وسلع، أسعار النفط كسعر لا كصناعة.',
  companies:  'خبر عن شركة بعينها: نتائج مالية، منتجات، إعلانات، أداء تشغيلي.',
  business:   'حركة الأعمال: صفقات واستحواذات واندماجات، توسّع وعقود واستثمارات، دخول أسواق جديدة. الصفقة هي الخبر.',
  analysis:   'تحليل معمّق: قراءة تفسيرية أو استشرافية، دراسة، تقرير مطوّل يشرح "لماذا" لا "ماذا حدث".',
  leaders:    'الشخصية هي الخبر: بروفايل، مقابلة، تعيين قيادي، تكريم، مسيرة مهنية.',
  numbers:    'البيانات هي الخبر: إحصاءات ومؤشرات وتصنيفات وأرقام مقارنة كموضوع أساسي للمادة.',
  opinion:    'مقال رأي بقلم كاتب، افتتاحية، وجهة نظر شخصية.',
  events:     'فعاليات ونشاطات: مؤتمرات، معارض، منتديات، ورش، توقيع اتفاقيات في مناسبة، حفلات إطلاق.',
  society:    'مجتمع الأعمال: مسؤولية اجتماعية، مبادرات مجتمعية، تعليم وصحة وثقافة من زاوية اقتصادية.',
  files:      'ملف خاص أو سلسلة تحقيقية مطوّلة تُنشر كوحدة واحدة.',
  videos:     'مادة الفيديو هي المحتوى الأساسي.',
  technology: 'التقنية: برمجيات، ذكاء اصطناعي، اتصالات، تحوّل رقمي، شركات تقنية من زاوية التقنية نفسها.',
  energy:     'الطاقة كصناعة: نفط وغاز واستخراج وتكرير، كهرباء، طاقة متجددة ومشاريعها.',
  innovation: 'الابتكار وريادة الأعمال: شركات ناشئة، تمويل جريء، حاضنات، براءات اختراع.',
};

const guideText = sectionRows
  .map(r => `- ${r.slug} (${r.name}): ${GUIDE[r.slug] ?? r.name}`)
  .join('\n');

const schema = z.object({
  section: z.enum([...SLUGS, 'keep']),
  confidence: z.enum(['high', 'medium', 'low']),
});

const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
log(`cached classifications: ${Object.keys(cache).length}`);

// ── the work list: every published article ──────────────────────────────────
const todo = [];
{
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('articles')
      .select('id, slug, title, excerpt, content, tags, section_id')
      .eq('status', 'published')
      .order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data.length) break;
    // profiles are people records, not articles — they have their own surface
    todo.push(...data.filter(r => !(r.tags || []).includes('profile')));
    if (data.length < 1000) break;
    from += 1000;
  }
}
log(`published articles: ${todo.length}`);

// فيديو and ملفات are format أبواب, not subject أبواب: a video about a CEO is
// still a video, and a special file stays a file whatever it covers. A subject
// classifier will always find a "better" subject باب for them and empty the
// two out — it pulled 45 videos and 15 files before this guard existed. They
// are neither reclassified nor available as a destination.
const FORMAT_ABWAB = new Set(['videos', 'files']);
const parked = todo.filter(a => FORMAT_ABWAB.has(sectionSlugById.get(a.section_id)));
const classifiable = todo.filter(a => !FORMAT_ABWAB.has(sectionSlugById.get(a.section_id)));
if (parked.length) log(`left alone (format أبواب): ${parked.length}`);

const work = LIMIT ? classifiable.slice(0, LIMIT) : classifiable;

const hashOf = (a) => createHash('sha1')
  .update(VOCAB + '|' + stripMarkup(a.title) + '|' + stripMarkup(a.excerpt || '').slice(0, 200))
  .digest('hex').slice(0, 16);

async function classify(a) {
  const key = hashOf(a);
  if (cache[key]) return cache[key];

  const title = stripMarkup(a.title).slice(0, 200);
  const body = stripMarkup(a.excerpt || a.content || '').replace(/\s+/g, ' ').slice(0, 700);
  if (!title && !body) return null;

  const current = sectionSlugById.get(a.section_id) ?? null;

  try {
    const { object } = await generateObject({
      // Routed through the Vercel AI Gateway (AI_GATEWAY_API_KEY).
      model: 'openai/gpt-5-mini',
      schema,
      system:
`You file an Arabic business-news article into exactly one باب of a financial news site.

The ONLY permitted values are:
${guideText}
…or "keep", meaning leave it where it is.

Rules:
- Pick the باب a reader would expect to browse this story under.
- Several أبواب can look plausible. Decide by what the story is ABOUT, not what
  it mentions: a merger is business even when it names a company; a CEO profile
  is leaders even when it names a company; an inflation reading is numbers only
  if the data itself is the subject, otherwise economy.
- "keep" is a correct and expected answer. Prefer it whenever the current
  section is defensible — never move an article merely because another باب is
  slightly better.
- Report confidence honestly: "high" only when the fit is obvious. Only
  high-confidence answers are acted on.
- Do not invent a باب. Values outside the list above are rejected.`,
      prompt:
`Current section: ${current ?? '(none)'}
Title: ${title}

Opening: ${body}`,
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
    if (res) {
      decisions.push({
        id: a.id,
        slug: a.slug,
        title: stripMarkup(a.title).slice(0, 70),
        from: sectionSlugById.get(a.section_id) ?? null,
        ...res,
      });
    }
    if (done % 200 === 0) {
      writeFileSync(CACHE_FILE, JSON.stringify(cache));
      log(`  ${done}/${work.length}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
writeFileSync(CACHE_FILE, JSON.stringify(cache));

// A move is a high-confidence decision that names a different section.
const moves = decisions.filter(d =>
  d.section !== 'keep' && d.section !== d.from && d.confidence === 'high'
  && !FORMAT_ABWAB.has(d.section));
const softMoves = decisions.filter(d =>
  d.section !== 'keep' && d.section !== d.from && d.confidence !== 'high');

const tally = moves.reduce((m, d) => {
  const k = `${d.from ?? '(none)'} → ${d.section}`;
  m[k] = (m[k] || 0) + 1; return m;
}, {});
const landing = moves.reduce((m, d) => { m[d.section] = (m[d.section] || 0) + 1; return m; }, {});

log('');
log(`classified:            ${decisions.length}`);
log(`stay put:              ${decisions.length - moves.length - softMoves.length}`);
log(`moves (high conf):     ${moves.length}`);
log(`held back (med/low):   ${softMoves.length}`);
log('');
log('landing in:');
for (const [k, v] of Object.entries(landing).sort((a, b) => b[1] - a[1])) log(`  ${String(v).padStart(5)}  ${k}`);
log('');
log('top transitions:');
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 20)) log(`  ${String(v).padStart(5)}  ${k}`);

writeFileSync(resolve(DATA_DIR, 'section-moves-15.json'), JSON.stringify(moves, null, 1));
writeFileSync(resolve(DATA_DIR, 'section-held-15.json'), JSON.stringify(softMoves, null, 1));

if (!APPLY) {
  log('\nno --apply: nothing written. Sample of proposed moves:');
  moves.slice(0, 20).forEach(d =>
    log(`  ${String(d.from ?? 'none').padEnd(11)} → ${d.section.padEnd(11)} ${d.title}`));
  process.exit(0);
}

// ── refuse to write without a snapshot to revert to ─────────────────────────
// The snapshot is DDL, which PostgREST will not run, so it is created out of
// band. Verifying it here rather than creating it means --apply can never
// proceed on an unprotected table.
const { count: snapCount, error: snapErr } = await supabase
  .from('article_section_backup_050')
  .select('id', { count: 'exact', head: true });
if (snapErr) {
  warn(`no snapshot table: ${snapErr.message}`);
  warn('create it in the SQL editor first, then re-run with --apply:');
  warn('  create table article_section_backup_050 as');
  warn('    select id, section_id, now() as snapshot_at from articles;');
  process.exit(1);
}
log(`\nsnapshot present: ${snapCount} rows in article_section_backup_050`);

let updated = 0, rejected = 0;
for (let i = 0; i < moves.length; i += 200) {
  const chunk = moves.slice(i, i + 200);
  await Promise.all(chunk.map(async d => {
    const sid = sectionIdBySlug.get(d.section);
    if (!sid) { rejected++; return; }          // structural guard, not a prompt rule
    const { error } = await supabase.from('articles').update({ section_id: sid }).eq('id', d.id);
    if (!error) updated++;
  }));
  if (i && i % 1000 === 0) log(`  applied ${updated}…`);
}
log('');
log(`moved: ${updated}`);
log(`rejected (slug not in the sections table): ${rejected}`);
log('revert with:  update articles a set section_id = b.section_id from article_section_backup_050 b where b.id = a.id;');
