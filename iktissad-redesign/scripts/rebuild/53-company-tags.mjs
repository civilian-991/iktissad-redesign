/**
 * 53 — Preserve awalan's company entity data as tags.
 *
 * awalan tracked 2,195 live companies with 11,675 article links (Aramco, ADNOC,
 * the Saudi and UAE central banks, PIF…). None of it was migrated.
 *
 * IMPORTANT correction to an earlier assessment: these are NOT public pages.
 * /Company/<id>, /Companies/<id> and /company/<id> all 404 on awalan, and the
 * homepage links to none — companies are internal entity metadata, not a
 * browsable section. So they were never a shutdown blocker; nothing 404s on
 * decommissioning because no company URL was ever served.
 *
 * They are still worth keeping: "every article about Aramco" is real editorial
 * navigation. They go into the EXISTING tags vocabulary rather than a new
 * section or sector, honouring the rule that the migration never invents a
 * category.
 *
 * Only companies with >= 3 articles are added: 762 companies covering 9,987 of
 * the 11,675 links (86%). The 1,354 with one or two articles would create thin
 * tag pages that are an SEO liability, not an asset.
 *
 * Usage:
 *   node scripts/rebuild/53-company-tags.mjs --dry-run
 *   node scripts/rebuild/53-company-tags.mjs
 */
import { readNdjson, log, warn } from './lib.mjs';
import { makeSlug } from './slug.mjs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY = process.argv.includes('--dry-run');
const MIN_ARTICLES = 3;

const companies = new Map(readNdjson('awalan_companies')
  .filter(c => c.isDeleted !== 'True' && c.isPublished === 'True')
  .map(c => [Number(c.id), String(c.title || '').trim()]));
const links = readNdjson('awalan_company_items');

const perCompany = new Map();
for (const l of links) {
  const cid = Number(l.companyId);
  if (!companies.has(cid) || !companies.get(cid)) continue;
  if (!perCompany.has(cid)) perCompany.set(cid, []);
  perCompany.get(cid).push(Number(l.articleId));
}
const keep = [...perCompany.entries()].filter(([, arts]) => arts.length >= MIN_ARTICLES);
log(`live companies: ${companies.size}`);
log(`companies with >= ${MIN_ARTICLES} articles: ${keep.length}`);

// awalan article id -> our article
const bySourceId = new Map();
{
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('articles')
      .select('id, source_id, tags').eq('source_site', 'awalan').not('source_id', 'is', null)
      .order('source_id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data.length) break;
    for (const r of data) if (!(r.tags || []).includes('profile')) bySourceId.set(Number(r.source_id), r);
    if (data.length < 1000) break;
    from += 1000;
  }
}
log(`awalan articles here: ${bySourceId.size}`);

// build: article -> company names to add
const toAdd = new Map();
let matched = 0, unmatched = 0;
for (const [cid, arts] of keep) {
  const name = companies.get(cid);
  for (const aid of arts) {
    const row = bySourceId.get(aid);
    if (!row) { unmatched++; continue; }
    matched++;
    if (!toAdd.has(row.id)) toAdd.set(row.id, { current: row.tags || [], add: new Set() });
    if (!(row.tags || []).includes(name)) toAdd.get(row.id).add.add(name);
  }
}
const willChange = [...toAdd.entries()].filter(([, v]) => v.add.size);
log(`links resolved to an article here: ${matched} (unmatched ${unmatched})`);
log(`articles gaining at least one company tag: ${willChange.length}`);

const tagNames = [...new Set(keep.map(([cid]) => companies.get(cid)))];
log(`distinct company tags: ${tagNames.length}`);

if (DRY) {
  log('\n--dry-run: nothing written');
  keep.sort((a, b) => b[1].length - a[1].length).slice(0, 8)
    .forEach(([cid, arts]) => log(`  ${String(arts.length).padStart(4)}  ${companies.get(cid).slice(0, 46)}`));
  process.exit(0);
}

// ── register in the managed vocabulary ──────────────────────────────────────
const { data: existingTags } = await supabase.from('tags').select('name').limit(20000);
const known = new Set((existingTags || []).map(t => t.name));
const newTags = tagNames.filter(n => !known.has(n))
  .map(n => ({ name: n, name_en: '', slug: makeSlug(n) || null, description: 'شركة' }));

let tagsAdded = 0;
for (let i = 0; i < newTags.length; i += 200) {
  const chunk = newTags.slice(i, i + 200);
  const { error } = await supabase.from('tags').upsert(chunk, { onConflict: 'name', ignoreDuplicates: true });
  if (error) warn(`tags: ${error.message.slice(0, 90)}`);
  else tagsAdded += chunk.length;
}
log(`tags registered: ${tagsAdded}`);

// ── apply to articles ───────────────────────────────────────────────────────
let updated = 0;
for (let i = 0; i < willChange.length; i += 200) {
  const chunk = willChange.slice(i, i + 200);
  await Promise.all(chunk.map(async ([id, v]) => {
    const merged = [...new Set([...v.current, ...v.add])].slice(0, 40);
    const { error } = await supabase.from('articles').update({ tags: merged }).eq('id', id);
    if (!error) updated++;
  }));
  if (i % 2000 === 0 && i) log(`  ${updated}/${willChange.length}`);
}
log('');
log(`articles updated: ${updated}`);
