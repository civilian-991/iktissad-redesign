/**
 * Deterministic figure extraction from Arabic disclosure text — NO LLM.
 *
 * This is the cornerstone of the Verifier (research appendix §2 meta-lesson 1,
 * §4 FinSight, §11 FIRE): the LLM must never invent or compare financial
 * numbers. Code pulls the numbers out of the disclosure into ground-truth rows;
 * the Verifier later diffs every number in a draft against these.
 *
 * v1 is rule-based on common Arabic financial labels. It is intentionally
 * conservative — it would rather miss a figure than emit a wrong one. Grow the
 * LABELS table as real disclosures reveal new phrasings.
 */

import { normalizeArabic } from '@/lib/i18n/arabic-normalize';
import type { FactExtractor, FetchedDisclosure, VerifiedFigure } from './types';

/** Fold Arabic-Indic / Persian digits to Western inside a numeric token. */
function foldDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (ch) => {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x0660 && cp <= 0x0669) return String(cp - 0x0660);
    return String(cp - 0x06f0);
  });
}

/**
 * Parse a numeric token that may use Arabic-Indic digits, thousands separators
 * (`,` `٬` space) and an Arabic/Western decimal mark (`.` or `٫`). Returns NaN
 * if it isn't a clean number.
 */
function parseArabicNumber(token: string): number {
  const western = foldDigits(token)
    .replace(/[\s,٬]/g, '')   // strip thousands separators
    .replace(/٫/g, '.');      // Arabic decimal separator → dot
  if (!/^-?\d+(\.\d+)?$/.test(western)) return NaN;
  return parseFloat(western);
}

type ScaleWord = { re: RegExp; scale: VerifiedFigure['scale'] };
const SCALES: ScaleWord[] = [
  { re: /ملي[او]ن/, scale: 'millions' }, // مليون / ملايين
  { re: /ملي[ا]?ر/, scale: 'billions' }, // مليار / مليارات
  { re: /[أا]لف/, scale: 'thousands' },
];

type UnitWord = { re: RegExp; unit: string };
const UNITS: UnitWord[] = [
  { re: /ريال|ر\.?س|sar/i, unit: 'SAR' },
  { re: /درهم|aed/i, unit: 'AED' },
  { re: /ريال قطري|qar/i, unit: 'QAR' },
  { re: /دينار|kwd|bhd/i, unit: 'KWD' },
  { re: /%|بالمئة|بالمائة|في ال?مئة/, unit: '%' },
];

/**
 * Known financial labels (Arabic) → canonical English label. Each is matched as
 * "<label> ... <number> <unit/scale>" within a short window after the label.
 */
const LABELS: { re: RegExp; canonical: string }[] = [
  { re: /صافي (?:ال)?رب[حح]/, canonical: 'net_profit' },
  { re: /(?:ال)?رب[حح] (?:ال)?صافي/, canonical: 'net_profit' },
  { re: /(?:ال)?خسائر|صافي (?:ال)?خسارة/, canonical: 'net_loss' },
  { re: /(?:ال)?[إا]يرادات|(?:ال)?مبيعات/, canonical: 'revenue' },
  { re: /(?:ال)?رب[حح] (?:ال)?تشغيلي/, canonical: 'operating_profit' },
  { re: /رب[حح](?:ية)? (?:ال)?سهم|العائد على السهم/, canonical: 'eps' },
  { re: /توزيع(?:ات)? (?:ال)?[أا]رباح|رب[حح] (?:ال)?سهم (?:ال)?موزع/, canonical: 'dividend_per_share' },
  { re: /(?:ال)?[أا]صول|إجمالي (?:ال)?[أا]صول/, canonical: 'total_assets' },
  { re: /(?:ال)?مطلوبات|(?:ال)?[إا]لتزامات/, canonical: 'total_liabilities' },
  { re: /(?:ال)?[أا]رباح (?:ال)?مبقاة/, canonical: 'retained_earnings' },
  { re: /رأس (?:ال)?مال/, canonical: 'capital' },
];

// A number with optional separators/decimals, Arabic or Western digits.
const NUMBER = /-?[\d٠-٩۰-۹][\d٠-٩۰-۹.,٬٫\s]*[\d٠-٩۰-۹]|-?[\d٠-٩۰-۹]/;

function detectScale(window: string): VerifiedFigure['scale'] {
  for (const s of SCALES) if (s.re.test(window)) return s.scale;
  return 'absolute';
}
function detectUnit(window: string): string | undefined {
  for (const u of UNITS) if (u.re.test(window)) return u.unit;
  return undefined;
}

/** Try to read a period like "الربع الأول 2026" / "Q1 2026" / "عام 2025". */
function detectPeriod(window: string): string | undefined {
  const q = window.match(/(?:الربع\s*(الأول|الثاني|الثالث|الرابع)|q([1-4]))/i);
  const year = foldDigits(window).match(/20\d{2}/);
  const qmap: Record<string, string> = { 'الأول': 'Q1', 'الثاني': 'Q2', 'الثالث': 'Q3', 'الرابع': 'Q4' };
  if (q) {
    const qn = q[1] ? qmap[q[1]] : `Q${q[2]}`;
    return year ? `${qn}-${year[0]}` : qn;
  }
  if (year) return `FY${year[0]}`;
  return undefined;
}

export class RuleFactExtractor implements FactExtractor {
  extract(fetched: FetchedDisclosure): VerifiedFigure[] {
    const text = `${fetched.bodyText ?? ''}\n${fetched.ref.title ?? ''}`;
    if (!text.trim()) return [];

    const figures: VerifiedFigure[] = [];
    const seen = new Set<string>();

    for (const { re, canonical } of LABELS) {
      const labelMatch = re.exec(text);
      if (!labelMatch) continue;
      const start = labelMatch.index + labelMatch[0].length;
      // Look at a short window after the label for the number + unit/scale.
      const window = text.slice(start, start + 80);
      const numMatch = NUMBER.exec(window);
      if (!numMatch) continue;
      const value = parseArabicNumber(numMatch[0]);
      if (!Number.isFinite(value)) continue;

      const ctx = text.slice(labelMatch.index, start + 80);
      const period = detectPeriod(ctx);
      const key = `${canonical}|${period ?? ''}`;
      if (seen.has(key)) continue; // first occurrence wins
      seen.add(key);

      figures.push({
        label: labelMatch[0].trim(),
        labelNormalized: normalizeArabic(canonical), // canonical key, language-neutral
        value,
        unit: detectUnit(ctx),
        scale: detectScale(window),
        period,
        sourceSpan: ctx.replace(/\s+/g, ' ').trim().slice(0, 160),
        extractionMethod: 'rule',
      });
    }

    return figures;
  }
}

export const ruleFactExtractor = new RuleFactExtractor();

/** Exposed for the Verifier's number-matching (same normalization both sides). */
export { parseArabicNumber, foldDigits };
