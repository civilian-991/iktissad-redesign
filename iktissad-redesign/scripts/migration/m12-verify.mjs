/**
 * M12 — Verification report
 * Runs checks against Supabase and prints a full migration health report
 * Usage: node scripts/migration/m12-verify.mjs
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function section(title) {
  console.log('\n' + '═'.repeat(60));
  console.log('  ' + title);
  console.log('═'.repeat(60));
}

function row(label, value, warn = false) {
  const icon = warn ? '⚠️ ' : '  ';
  console.log(`${icon}${label.padEnd(40)} ${value}`);
}

section('ARTICLES');
const { count: totalArts } = await supabase.from('articles').select('*', { count: 'exact', head: true });
const { count: iktArts } = await supabase.from('articles').select('*', { count: 'exact', head: true }).eq('source_site', 'iktissad');
const { count: awArts } = await supabase.from('articles').select('*', { count: 'exact', head: true }).eq('source_site', 'awalan');
const { count: nullSector } = await supabase.from('articles').select('*', { count: 'exact', head: true }).is('sector_id', null);
const { count: nullCountry } = await supabase.from('articles').select('*', { count: 'exact', head: true }).is('country_id', null);
const { count: nullAuthor } = await supabase.from('articles').select('*', { count: 'exact', head: true }).is('author_id', null);
const { count: nullImage } = await supabase.from('articles').select('*', { count: 'exact', head: true }).is('featured_image', null);
const { count: oldImages } = await supabase.from('articles').select('*', { count: 'exact', head: true }).like('featured_image', '%iktissadonline.com%');
const { count: awOldImages } = await supabase.from('articles').select('*', { count: 'exact', head: true }).like('featured_image', '%api.awalan.com%');

row('Total articles', totalArts);
row('  iktissad articles', `${iktArts} / 8,121 expected`);
row('  awalan articles', `${awArts} / 17,368 expected`);
row('NULL sector_id', nullSector, nullSector > totalArts * 0.3);
row('NULL country_id', nullCountry, nullCountry > totalArts * 0.5);
row('NULL author_id', nullAuthor, nullAuthor > totalArts * 0.9);
row('NULL featured_image', nullImage);
row('Still on old iktissad URLs', oldImages, oldImages > 0);
row('Still on api.awalan.com URLs', awOldImages, awOldImages > 0);

section('TAXONOMY');
const { count: sectorCount } = await supabase.from('sectors').select('*', { count: 'exact', head: true });
const { count: countryCount } = await supabase.from('countries').select('*', { count: 'exact', head: true });
const { count: sectionCount } = await supabase.from('sections').select('*', { count: 'exact', head: true });

row('Sectors', `${sectorCount} (expect 19+)`);
row('Countries', `${countryCount} (expect 241+)`);
row('Sections', `${sectionCount} (expect 78+)`);

section('MAGAZINES');
const { count: magCount } = await supabase.from('magazine_issues').select('*', { count: 'exact', head: true });
const { count: magLinks } = await supabase.from('magazine_articles').select('*', { count: 'exact', head: true });
row('Magazine issues', `${magCount} (expect 201)`);
row('Magazine–article links', magLinks);

section('USERS & SUBSCRIBERS');
const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
let nlCount = 0;
try { ({ count: nlCount } = await supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true })); } catch { nlCount = 'table missing'; }

row('Users/authors', userCount);
row('Newsletter subscribers', `${nlCount} (expect 369)`);

section('SPOT CHECK — 5 random articles');
const { data: samples } = await supabase
  .from('articles')
  .select('title, slug, sector_id, country_id, author_id, featured_image, source_site, published_at')
  .not('content', 'is', null)
  .limit(5)
  .order('published_at', { ascending: false });

for (const a of samples || []) {
  console.log(`\n  [${a.source_site}] ${a.title?.slice(0, 50)}`);
  console.log(`    slug:    ${a.slug}`);
  console.log(`    sector:  ${a.sector_id || 'NULL ⚠️'}`);
  console.log(`    country: ${a.country_id || 'NULL'}`);
  console.log(`    author:  ${a.author_id || 'NULL'}`);
  console.log(`    image:   ${a.featured_image ? a.featured_image.slice(0, 60) : 'NULL'}`);
  console.log(`    date:    ${a.published_at}`);
}

section('SUMMARY');
const issuesFound = [];
if (iktArts < 8000) issuesFound.push(`Only ${iktArts} iktissad articles (expect 8,121)`);
if (awArts < 17000) issuesFound.push(`Only ${awArts} awalan articles (expect 17,368)`);
if (magCount < 200) issuesFound.push(`Only ${magCount} magazine issues (expect 201)`);
if (oldImages > 0) issuesFound.push(`${oldImages} articles still have old iktissad image URLs — run m10`);
if (awOldImages > 0) issuesFound.push(`${awOldImages} articles still have awalan API image URLs — run m11`);
if (nlCount < 350) issuesFound.push(`Only ${nlCount} newsletter subscribers (expect 369)`);

if (issuesFound.length === 0) {
  console.log('\n✅ All checks passed! Migration looks complete.');
} else {
  console.log('\n⚠️  Issues to fix:');
  issuesFound.forEach(i => console.log('  - ' + i));
}
