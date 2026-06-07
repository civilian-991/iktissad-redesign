/**
 * Regression harness — golden disclosures + the banned-phrase guard
 * (plan v4 §2.5; research appendix §4 FinSight keyword/rule eval).
 *
 * Deterministic and network-free so it runs in CI as a gate. The full-pipeline
 * (LLM) eval lives in scripts/gcc-eval/run-live.ts (manual, needs an API key).
 */

export interface GoldenCase {
  id: string;
  category: string;
  disclosureText: string;
  /** figures the rule extractor MUST find (label → value). */
  requiredFigures: { label: string; value: number }[];
  /** phrases that must appear in a faithful draft (names, key facts). */
  requiredPhrases?: string[];
}

/**
 * Absolutist / promotional Arabic phrasing that must never appear in a financial
 * draft (the "hallucinationRisk" lexicon — research appendix §4). A draft
 * containing any of these fails the harness.
 */
export const BANNED_ABSOLUTIST: string[] = [
  'مضمون', 'مضمونة', 'أرباح مؤكدة', 'ربح مؤكد', 'بلا مخاطر', 'دون مخاطر',
  'نضمن', 'يضمن', 'نصيحة شراء', 'توصية شراء مؤكدة', 'فرصة العمر',
  'لا تفوّت', 'تضاعف مؤكد', 'ربح سريع', 'استثمار آمن 100',
];

export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'earnings-001',
    category: 'earnings',
    disclosureText:
      'أعلنت الشركة عن صافي الربح بلغ 4.2 مليار ريال للعام 2025، مقابل إيرادات بلغت 18.5 مليار ريال للفترة نفسها.',
    requiredFigures: [
      { label: 'net_profit', value: 4.2 },
      { label: 'revenue', value: 18.5 },
    ],
  },
  {
    id: 'dividend-001',
    category: 'dividend',
    disclosureText:
      'أوصى مجلس الإدارة بتوزيع أرباح نقدية بواقع 1.5 ريال للسهم عن النصف الأول من عام 2026.',
    requiredFigures: [{ label: 'dividend_per_share', value: 1.5 }],
  },
  {
    id: 'board-001',
    category: 'board',
    disclosureText:
      'أعلنت الشركة تعيين المهندس خالد العتيبي رئيساً تنفيذياً اعتباراً من بداية الربع الثالث 2026.',
    requiredFigures: [],
    requiredPhrases: ['خالد العتيبي'],
  },
];

/** Count banned absolutist phrases in a text (0 = clean). */
export function countBannedPhrases(text: string): { phrase: string; count: number }[] {
  const hits: { phrase: string; count: number }[] = [];
  for (const p of BANNED_ABSOLUTIST) {
    const n = text.split(p).length - 1;
    if (n > 0) hits.push({ phrase: p, count: n });
  }
  return hits;
}
