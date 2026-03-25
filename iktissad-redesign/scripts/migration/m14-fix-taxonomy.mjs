/**
 * M14 — Fix sections and sectors taxonomy
 *
 * The migration imported Drupal taxonomy wholesale, creating 317 junk sections
 * and 38 messy sectors mixing editorial أبواب with industry قطاعات.
 *
 * This script:
 * 1. Inserts the correct 8 sections (أبواب) and 16 sectors (قطاعات) matching the nav
 * 2. Remaps articles from old sector names to correct new sections/sectors
 * 3. Deletes all old entries that are no longer referenced
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

// ─── Correct taxonomy (matches Header.tsx nav + ar.ts i18n) ─────────────────

const CORRECT_SECTIONS = [
  { slug: 'economy',           name: 'اقتصاد',        name_en: 'Economy',               description: 'أخبار وتحليلات اقتصادية شاملة' },
  { slug: 'companies',         name: 'شركات',          name_en: 'Companies',             description: 'أخبار الشركات والمؤسسات' },
  { slug: 'markets',           name: 'أسواق',          name_en: 'Markets',               description: 'أسواق المال والبورصات' },
  { slug: 'technology',        name: 'تكنولوجيا',      name_en: 'Technology',            description: 'التكنولوجيا والتحول الرقمي' },
  { slug: 'energy-innovation', name: 'طاقة وابتكار',  name_en: 'Energy & Innovation',   description: 'الطاقة والابتكار' },
  { slug: 'opinion',           name: 'رأي',            name_en: 'Opinion',               description: 'مقالات الرأي والتحليل' },
  { slug: 'files',             name: 'ملفات',          name_en: 'Files',                 description: 'ملفات وتحقيقات' },
  { slug: 'video',             name: 'فيديو',          name_en: 'Video',                 description: 'محتوى مرئي' },
];

const CORRECT_SECTORS = [
  { slug: 'industry',              name: 'صناعة',         name_en: 'Industry' },
  { slug: 'agriculture',           name: 'زراعة',         name_en: 'Agriculture' },
  { slug: 'trade',                 name: 'تجارة',         name_en: 'Trade' },
  { slug: 'finance',               name: 'مال ومصارف',   name_en: 'Banking & Finance' },
  { slug: 'investment',            name: 'استثمار',       name_en: 'Investment' },
  { slug: 'insurance',             name: 'تأمين',         name_en: 'Insurance' },
  { slug: 'real-estate',           name: 'عقار',          name_en: 'Real Estate' },
  { slug: 'transport',             name: 'نقل',           name_en: 'Transport' },
  { slug: 'automotive',            name: 'سيارات',        name_en: 'Automotive' },
  { slug: 'tourism-entertainment', name: 'سياحة وترفيه', name_en: 'Tourism & Entertainment' },
  { slug: 'education',             name: 'تعليم',         name_en: 'Education' },
  { slug: 'health',                name: 'صحة',           name_en: 'Health' },
  { slug: 'energy-environment',    name: 'طاقة وبيئة',   name_en: 'Energy & Environment' },
  { slug: 'entrepreneurship',      name: 'ريادة وابتكار', name_en: 'Entrepreneurship' },
  { slug: 'luxury',                name: 'رفاهية',        name_en: 'Luxury' },
  { slug: 'wealth',                name: 'ثروات',         name_en: 'Wealth' },
];

// Old sector slug → new target (type: 'section' | 'sector', slug: new slug)
const SECTOR_REMAP = [
  // اقتصاد عام → section: economy (general economic news = editorial, not industry)
  { oldSlug: 'اقتصاد-عام',          target: 'section', newSlug: 'economy' },
  // الطاقة → sector: energy-environment
  { oldSlug: 'طاقة',                target: 'sector',  newSlug: 'energy-environment' },
  // ساعات ورفاهية → sector: luxury
  { oldSlug: 'ساعات-ورفاهية',       target: 'sector',  newSlug: 'luxury' },
  // النقل واللوجستيات → sector: transport
  { oldSlug: 'النقل-واللوجستيات',   target: 'sector',  newSlug: 'transport' },
  // نفط وغاز → sector: energy-environment (grouped with طاقة)
  { oldSlug: 'نفط-وغاز',            target: 'sector',  newSlug: 'energy-environment' },
  // صحة → sector: health
  { oldSlug: 'صحة',                  target: 'sector',  newSlug: 'health' },
];

function log(msg) { console.log(`[m14] ${msg}`); }
function err(msg, e) { console.error(`[m14] ✗ ${msg}`, e?.message ?? e); }

// ─── Step 1: Upsert correct sections ────────────────────────────────────────

log('Upserting 8 correct sections...');
const { data: newSections, error: secErr } = await supabase
  .from('sections')
  .upsert(CORRECT_SECTIONS, { onConflict: 'slug' })
  .select('id, slug');

if (secErr) { err('Failed to upsert sections', secErr); process.exit(1); }

const sectionIdBySlug = Object.fromEntries(newSections.map(s => [s.slug, s.id]));
log(`Sections upserted: ${Object.keys(sectionIdBySlug).join(', ')}`);

// ─── Step 2: Upsert correct sectors ─────────────────────────────────────────

log('Upserting 16 correct sectors...');
const { data: newSectors, error: sectrErr } = await supabase
  .from('sectors')
  .upsert(CORRECT_SECTORS, { onConflict: 'slug' })
  .select('id, slug');

if (sectrErr) { err('Failed to upsert sectors', sectrErr); process.exit(1); }

const sectorIdBySlug = Object.fromEntries(newSectors.map(s => [s.slug, s.id]));
log(`Sectors upserted: ${Object.keys(sectorIdBySlug).join(', ')}`);

// ─── Step 3: Remap articles ──────────────────────────────────────────────────

log('Fetching old sector IDs to remap...');
const { data: allOldSectors } = await supabase
  .from('sectors')
  .select('id, slug, name');

const oldSectorBySlug = Object.fromEntries((allOldSectors ?? []).map(s => [s.slug, s]));

let totalRemapped = 0;

for (const remap of SECTOR_REMAP) {
  const oldSector = oldSectorBySlug[remap.oldSlug];
  if (!oldSector) {
    log(`  Old sector "${remap.oldSlug}" not found — skipping`);
    continue;
  }

  if (remap.target === 'section') {
    const newSectionId = sectionIdBySlug[remap.newSlug];
    if (!newSectionId) { err(`New section slug "${remap.newSlug}" not found`); continue; }

    const { count, error } = await supabase
      .from('articles')
      .update({ section_id: newSectionId, sector_id: null })
      .eq('sector_id', oldSector.id)
      .select('id', { count: 'exact', head: true });

    if (error) { err(`Remap ${remap.oldSlug} → section ${remap.newSlug}`, error); continue; }
    log(`  "${remap.oldSlug}" → section "${remap.newSlug}": ${count ?? '?'} articles`);
    totalRemapped += count ?? 0;
  } else {
    const newSectorId = sectorIdBySlug[remap.newSlug];
    if (!newSectorId) { err(`New sector slug "${remap.newSlug}" not found`); continue; }

    const { count, error } = await supabase
      .from('articles')
      .update({ sector_id: newSectorId })
      .eq('sector_id', oldSector.id)
      .select('id', { count: 'exact', head: true });

    if (error) { err(`Remap ${remap.oldSlug} → sector ${remap.newSlug}`, error); continue; }
    log(`  "${remap.oldSlug}" → sector "${remap.newSlug}": ${count ?? '?'} articles`);
    totalRemapped += count ?? 0;
  }
}

log(`Total articles remapped: ${totalRemapped}`);

// ─── Step 4: Null out remaining article refs to old sections ─────────────────
// Some iktissad articles may have section_id pointing to old junk sections.
// Null them out so we can safely delete those sections.

log('Nulling article refs to old sections (not in correct 8)...');
const keepSectionSlugs = CORRECT_SECTIONS.map(s => s.slug);

// Fetch all old section IDs that are NOT in our keep list
const { data: oldSections } = await supabase
  .from('sections')
  .select('id, slug')
  .not('slug', 'in', `(${keepSectionSlugs.map(s => `"${s}"`).join(',')})`);

const oldSectionIds = (oldSections ?? []).map(s => s.id);
log(`  Found ${oldSectionIds.length} old sections to clean up`);

if (oldSectionIds.length > 0) {
  // Batch null out in chunks of 100 IDs
  for (let i = 0; i < oldSectionIds.length; i += 100) {
    const batch = oldSectionIds.slice(i, i + 100);
    await supabase
      .from('articles')
      .update({ section_id: null })
      .in('section_id', batch);
  }
  log('  Article section_id refs nulled out');
}

// ─── Step 5: Delete old junk entries ────────────────────────────────────────

log('Deleting old junk sections...');
const keepSectionIds = Object.values(sectionIdBySlug);
const { error: delSecErr } = await supabase
  .from('sections')
  .delete()
  .not('id', 'in', `(${keepSectionIds.join(',')})`);

if (delSecErr) err('Delete old sections', delSecErr);
else log(`  Old sections deleted`);

log('Deleting old junk sectors...');
const keepSectorIds = Object.values(sectorIdBySlug);

// First null out any remaining sector_id refs to old sectors
const { data: oldSectorsToDelete } = await supabase
  .from('sectors')
  .select('id, slug')
  .not('id', 'in', `(${keepSectorIds.join(',')})`);

const oldSectorIdsToDelete = (oldSectorsToDelete ?? []).map(s => s.id);
if (oldSectorIdsToDelete.length > 0) {
  for (let i = 0; i < oldSectorIdsToDelete.length; i += 100) {
    const batch = oldSectorIdsToDelete.slice(i, i + 100);
    await supabase
      .from('articles')
      .update({ sector_id: null })
      .in('sector_id', batch);
  }

  const { error: delSectrErr } = await supabase
    .from('sectors')
    .delete()
    .not('id', 'in', `(${keepSectorIds.join(',')})`);

  if (delSectrErr) err('Delete old sectors', delSectrErr);
  else log(`  Deleted ${oldSectorIdsToDelete.length} old sectors`);
}

// ─── Step 6: Verify ─────────────────────────────────────────────────────────

log('Verifying...');
const { data: finalSections } = await supabase.from('sections').select('slug, name');
const { data: finalSectors } = await supabase.from('sectors').select('slug, name');

log(`Final sections (${finalSections?.length}): ${finalSections?.map(s => s.name).join(', ')}`);
log(`Final sectors (${finalSectors?.length}): ${finalSectors?.map(s => s.name).join(', ')}`);

// Quick article count check
const { count: economyCount } = await supabase
  .from('articles')
  .select('id', { count: 'exact', head: true })
  .eq('section_id', sectionIdBySlug['economy']);

const { count: energyCount } = await supabase
  .from('articles')
  .select('id', { count: 'exact', head: true })
  .eq('sector_id', sectorIdBySlug['energy-environment']);

const { count: luxuryCount } = await supabase
  .from('articles')
  .select('id', { count: 'exact', head: true })
  .eq('sector_id', sectorIdBySlug['luxury']);

log(`Article counts after remap:`);
log(`  section economy (اقتصاد): ${economyCount}`);
log(`  sector energy-environment (طاقة وبيئة): ${energyCount}`);
log(`  sector luxury (رفاهية): ${luxuryCount}`);

log('✅ Taxonomy migration complete');
