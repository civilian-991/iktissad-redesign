/**
 * Editorial feedback loop (plan v4 §2.4; research appendix §5 openclaw).
 *
 * Aggregates gcc_editorial_decisions into a per-category profile + blind-spot
 * report (the MANUAL_DRAFT signal: a category the editor seeks out more than the
 * scanner surfaces). Feedback-as-context, not fine-tuning — the profile is
 * injected into the classifier/drafting prompts. The heavier offline GEPA
 * optimization lives in scripts/gcc-gepa/.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface CategoryStat {
  category: string;
  approved: number;
  rejected: number;
  edited: number;
  manualDraft: number;
  screenedIn: number;
  screenedOut: number;
  /** approved / (approved + rejected) — quality of the scanner's picks. */
  approvalRate: number | null;
}

export interface BlindSpot {
  category: string;
  manualDraft: number;
  scannerCatches: number;
  note: string;
}

export interface EditorialProfile {
  asOf: string;
  totalDecisions: number;
  categories: CategoryStat[];
  blindSpots: BlindSpot[];
  markdown: string;
}

const ACTIONS = ['approved', 'rejected', 'edited', 'manual_draft', 'screened_in', 'screened_out'] as const;
type Action = (typeof ACTIONS)[number];

/** Compute the profile from the decision log. `asOf` is passed in (no Date in lib). */
export async function computeEditorialProfile(asOf: string, sinceISO?: string): Promise<EditorialProfile> {
  const admin = createAdminClient();
  let q = (admin.from('gcc_editorial_decisions') as any).select('category, action');
  if (sinceISO) q = q.gte('decided_at', sinceISO);
  const { data } = await q.limit(10_000);
  const rows = (data ?? []) as { category: string | null; action: Action }[];

  const byCat = new Map<string, CategoryStat>();
  for (const r of rows) {
    const cat = r.category ?? 'other';
    const s =
      byCat.get(cat) ??
      { category: cat, approved: 0, rejected: 0, edited: 0, manualDraft: 0, screenedIn: 0, screenedOut: 0, approvalRate: null };
    switch (r.action) {
      case 'approved': s.approved++; break;
      case 'rejected': s.rejected++; break;
      case 'edited': s.edited++; break;
      case 'manual_draft': s.manualDraft++; break;
      case 'screened_in': s.screenedIn++; break;
      case 'screened_out': s.screenedOut++; break;
    }
    byCat.set(cat, s);
  }

  const categories = [...byCat.values()].map((s) => {
    const denom = s.approved + s.rejected;
    s.approvalRate = denom > 0 ? Number((s.approved / denom).toFixed(2)) : null;
    return s;
  });
  categories.sort((a, b) => b.approved + b.manualDraft - (a.approved + a.manualDraft));

  // Blind spots: editor manually drafted more than the scanner caught (openclaw).
  const blindSpots: BlindSpot[] = categories
    .filter((s) => s.manualDraft > 0 && s.manualDraft > s.approved)
    .map((s) => ({
      category: s.category,
      manualDraft: s.manualDraft,
      scannerCatches: s.approved,
      note: s.approved === 0 ? 'الماسح لم يلتقط هذا الموضوع إطلاقاً.' : 'فكّر في إضافة مصادر/كلمات مفتاحية.',
    }))
    .sort((a, b) => b.manualDraft - a.manualDraft);

  return {
    asOf,
    totalDecisions: rows.length,
    categories,
    blindSpots,
    markdown: renderMarkdown(categories, blindSpots),
  };
}

function renderMarkdown(categories: CategoryStat[], blindSpots: BlindSpot[]): string {
  const lines: string[] = ['## إحصاءات قرارات التحرير'];
  for (const s of categories) {
    const rate = s.approvalRate == null ? '—' : `${Math.round(s.approvalRate * 100)}%`;
    lines.push(`- **${s.category}**: نُشر ${s.approved} · رُفض ${s.rejected} · عُدّل ${s.edited} · كتابة يدوية ${s.manualDraft} (نسبة القبول ${rate})`);
  }
  lines.push('', '## النقاط العمياء للماسح');
  if (!blindSpots.length) lines.push('- لا توجد نقاط عمياء واضحة.');
  for (const b of blindSpots) {
    lines.push(`- **${b.category}**: ${b.manualDraft} كتابة يدوية مقابل ${b.scannerCatches} التقاطاً. ${b.note}`);
  }
  return lines.join('\n');
}

/** Persist the profile into site_settings (key 'gcc_editorial_profile'). */
export async function saveEditorialProfile(profile: EditorialProfile): Promise<void> {
  const admin = createAdminClient();
  await (admin.from('site_settings') as any).upsert(
    { key: 'gcc_editorial_profile', value: profile },
    { onConflict: 'key' }
  );
}
