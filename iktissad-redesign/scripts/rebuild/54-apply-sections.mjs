import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { stripMarkup } from './slug.mjs';
config({ path: new URL('../../.env.local', import.meta.url) });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const cache = JSON.parse(readFileSync(new URL('./data/section-classifications.json', import.meta.url), 'utf8'));
const { data: sections } = await s.from('sections').select('id, slug');
const idBySlug = new Map(sections.map(r => [r.slug, r.id]));

const todo = [];
let from = 0;
for (;;) {
  const { data } = await s.from('articles').select('id, slug, title, excerpt, tags')
    .eq('status', 'published').is('section_id', null).order('id').range(from, from + 999);
  if (!data || !data.length) break;
  todo.push(...data.filter(r => !(r.tags || []).includes('profile')));
  if (data.length < 1000) break;
  from += 1000;
}
console.log('articles still without a section:', todo.length);

const hashOf = a => createHash('sha1')
  .update(stripMarkup(a.title) + '|' + stripMarkup(a.excerpt || '').slice(0, 200)).digest('hex').slice(0, 16);

let applied = 0, noCache = 0, lowOrUnset = 0, rejected = 0;
const batch = [];
for (const a of todo) {
  const c = cache[hashOf(a)];
  if (!c) { noCache++; continue; }
  if (c.section === 'unset' || c.confidence === 'low') { lowOrUnset++; continue; }
  const sid = idBySlug.get(c.section);
  if (!sid) { rejected++; continue; }   // structural guard
  batch.push({ id: a.id, sid });
}
console.log('have a cached decision:', batch.length, '| no cache yet:', noCache, '| unset/low:', lowOrUnset, '| rejected:', rejected);

for (let i = 0; i < batch.length; i += 200) {
  await Promise.all(batch.slice(i, i + 200).map(async b => {
    const { error } = await s.from('articles').update({ section_id: b.sid }).eq('id', b.id);
    if (!error) applied++;
  }));
  if (i % 2000 === 0 && i) console.log('  ', applied);
}
console.log('\nsections applied:', applied);
