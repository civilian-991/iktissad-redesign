/**
 * Rule-based disclosure classification + risk tiering (plan v4 §2.1 Desk/Selector).
 *
 * Cheap, deterministic, runs before any LLM spend (research appendix §3 newsflow
 * "rules can only RAISE risk", §5 openclaw "coarse pre-rank"). Mirrors the logic
 * already live in the n8n Selector workflow, centralized here so the lib and the
 * workflow can share one source of truth.
 */

import type { DisclosureType } from './types';

export type RiskLevel = 'L0' | 'L1' | 'L2' | 'L3';

export interface Classification {
  category: DisclosureType;
  /** auto-skip obvious noise (AGM notices, admin) without bothering the editor. */
  noise: boolean;
  /** breaking → candidate for fast-track (future auto-draft). */
  breaking: boolean;
  riskLevel: RiskLevel;
}

// Category cues (Arabic). Order matters — first match wins.
const CATEGORY_RULES: { re: RegExp; category: DisclosureType; breaking?: boolean }[] = [
  { re: /تعليق (?:ال)?تداول|إيقاف (?:ال)?تداول/, category: 'halt', breaking: true },
  { re: /استقالة|تعيين|الرئيس التنفيذي|المدير المالي|مجلس (?:ال)?[إا]دارة/, category: 'board' },
  { re: /(?:ال)?نتائج (?:ال)?مالية|(?:ال)?قوائم (?:ال)?مالية|صافي (?:ال)?رب[حح]|(?:ال)?[إا]يرادات/, category: 'earnings' },
  { re: /توزيع(?:ات)? (?:ال)?[أا]رباح|رب[حح] (?:ال)?سهم/, category: 'dividend' },
  { re: /قضية|تعويض|غرامة|حكم قضائي|دعوى/, category: 'regulatory' },
  { re: /استحواذ|اتفاقية|ترسية|مذكرة تفاهم|عقد/, category: 'ownership' },
  { re: /رأس (?:ال)?مال|حقوق (?:ال)?[أا]ولوية|زيادة رأس/, category: 'capital_change' },
  { re: /(?:ال)?[إا]كتتاب|(?:ال)?[إا]دراج|طرح عام/, category: 'ipo_listing' },
  { re: /صكوك|سندات|تمويل|قرض/, category: 'debt_fund' },
];

// Noise: routine/admin announcements the editor never wants.
const NOISE_RE = /دعوة (?:ال)?جمعية|الجمعية العامة|اجتماع (?:ال)?مجلس|تغيير (?:ال)?[إا]سم|كسور (?:ال)?[أا]سهم|إلحاقي|نتائج (?:ال)?جمعية/;

// Risk escalators (monotonic — can only raise the tier).
const RISK_RULES: { re: RegExp; min: RiskLevel }[] = [
  { re: /تعليق (?:ال)?تداول|إيقاف (?:ال)?تداول/, min: 'L3' },
  { re: /قضية|غرامة|تعويض|دعوى|تحقيق/, min: 'L2' },
  { re: /استقالة|تعيين|الرئيس التنفيذي|المدير المالي/, min: 'L2' },
  { re: /استحواذ|اندماج|رأس (?:ال)?مال/, min: 'L2' },
  { re: /صافي (?:ال)?رب[حح]|(?:ال)?نتائج (?:ال)?مالية|توزيع/, min: 'L1' },
];

const RANK: Record<RiskLevel, number> = { L0: 0, L1: 1, L2: 2, L3: 3 };

export function classifyDisclosure(title: string): Classification {
  const t = title ?? '';

  let category: DisclosureType = 'other';
  let breaking = false;
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(t)) {
      category = rule.category;
      breaking = !!rule.breaking;
      break;
    }
  }

  const noise = NOISE_RE.test(t);

  let riskLevel: RiskLevel = 'L0';
  for (const r of RISK_RULES) {
    if (r.re.test(t) && RANK[r.min] > RANK[riskLevel]) riskLevel = r.min;
  }

  return { category, noise, breaking, riskLevel };
}
