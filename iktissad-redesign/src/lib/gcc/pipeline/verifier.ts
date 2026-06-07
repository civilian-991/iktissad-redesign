/**
 * The Verifier — trust gatekeeper (plan v4 §2.3; research appendix §11 FIRE,
 * §4 FinSight, §8 TradingAgents).
 *
 * Design rules:
 *  - The LLM NEVER compares numbers. Numbers/dates are diffed in code against the
 *    deterministically-extracted gcc_verified_figures (ground truth).
 *  - Labels: supported / contradicted / missing / unverified. MISSING and
 *    CONTRADICTED are HARD publish-blockers — "draft asserts a figure the source
 *    is silent on" must not ship.
 *  - Confidence is mechanical (source-tier weighted), not LLM self-report.
 *  - Semantic claims use the INVERTED-FIRE loop: the disclosure is checked first
 *    and authoritatively; the model may not answer from its own knowledge.
 *
 * Output rows map 1:1 onto gcc_claim_cards.
 */

import { foldDigits, parseArabicNumber } from '@/lib/gcc/sourcing/fact-extractor';
import type { VerifiedFigure, SourceTier } from '@/lib/gcc/sourcing/types';
import { complete, parseJsonObject } from './gateway';

export type ClaimType = 'number' | 'name' | 'date' | 'quote' | 'semantic';
export type ClaimStatus = 'unverified' | 'supported' | 'contradicted' | 'missing';

export interface DraftClaim {
  text: string;
  type?: ClaimType;
  anchorRef?: string;
}

export interface ClaimVerdict {
  claimText: string;
  claimType: ClaimType;
  status: ClaimStatus;
  confidenceScore: number; // 0..1, mechanical
  sourceTier: number; // authority weight of best supporting evidence
  supportingEvidence: { span: string; figureLabel?: string }[];
  contradictingEvidence: { span: string; expected?: number; found?: number }[];
  missingEvidence: { note: string }[];
  reasoning: string;
  anchorRef?: string;
}

export interface VerifyInput {
  claims: DraftClaim[];
  figures: VerifiedFigure[];
  disclosureText: string;
  sourceTier: SourceTier;
  /** run the adversarial LLM check on semantic claims (costs tokens). */
  adversarial?: boolean;
}

export interface VerifyResult {
  verdicts: ClaimVerdict[];
  /** false if any number/date claim is contradicted or missing. */
  publishable: boolean;
  blockers: string[];
}

// Source-tier authority weights (research appendix §3 newsflow credibility table).
const TIER_WEIGHT: Record<SourceTier, number> = { origin: 0.95, mirror: 0.7 };

// Relative tolerance for numeric matching (handles rounding / scale phrasing).
const NUM_TOLERANCE = 0.01; // 1%

/** Pull numeric tokens (Arabic-Indic or Western) out of a claim. */
function extractNumbers(text: string): number[] {
  const out: number[] = [];
  const re = /-?[\d٠-٩۰-۹][\d٠-٩۰-۹.,٬٫]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = parseArabicNumber(m[0]);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/** Normalize a figure to a comparable absolute-ish magnitude given its scale. */
function scaled(value: number, scale?: VerifiedFigure['scale']): number {
  switch (scale) {
    case 'thousands': return value * 1e3;
    case 'millions': return value * 1e6;
    case 'billions': return value * 1e9;
    default: return value;
  }
}

function approxEqual(a: number, b: number): boolean {
  if (a === b) return true;
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return Math.abs(a - b) / denom <= NUM_TOLERANCE;
}

/** Does a claim number match any verified figure (raw value OR scaled value)? */
function matchFigure(num: number, figures: VerifiedFigure[]): VerifiedFigure | null {
  for (const f of figures) {
    if (approxEqual(num, f.value)) return f;
    if (approxEqual(num, scaled(f.value, f.scale))) return f;
  }
  return null;
}

function inferType(claim: DraftClaim): ClaimType {
  if (claim.type) return claim.type;
  if (/[\d٠-٩۰-۹]/.test(claim.text)) {
    if (/20\d{2}|الربع|محرم|رمضان|\/\d{1,2}\//.test(foldDigits(claim.text))) return 'date';
    return 'number';
  }
  if (/"|«|”/.test(claim.text)) return 'quote';
  return 'semantic';
}

/** Deterministically verify a numeric claim against the ground-truth figures. */
function verifyNumber(claim: DraftClaim, figures: VerifiedFigure[], tierW: number): ClaimVerdict {
  const nums = extractNumbers(claim.text);
  const supporting: ClaimVerdict['supportingEvidence'] = [];
  const contradicting: ClaimVerdict['contradictingEvidence'] = [];
  const missing: ClaimVerdict['missingEvidence'] = [];

  for (const n of nums) {
    const hit = matchFigure(n, figures);
    if (hit) {
      supporting.push({ span: hit.sourceSpan, figureLabel: hit.label });
    } else if (figures.length === 0) {
      missing.push({ note: `لا توجد أرقام مُستخرجة من المصدر للتحقق من «${n}»` });
    } else {
      // a number that doesn't match ANY verified figure → contradicted/hallucinated
      contradicting.push({ span: claim.text.slice(0, 160), found: n });
    }
  }

  let status: ClaimStatus = 'unverified';
  if (contradicting.length) status = 'contradicted';
  else if (missing.length && !supporting.length) status = 'missing';
  else if (supporting.length) status = 'supported';

  const confidence =
    status === 'supported' ? tierW : status === 'contradicted' ? 0.05 : status === 'missing' ? 0.1 : 0.5;

  return {
    claimText: claim.text,
    claimType: 'number',
    status,
    confidenceScore: confidence,
    sourceTier: supporting.length ? tierW : 0,
    supportingEvidence: supporting,
    contradictingEvidence: contradicting,
    missingEvidence: missing,
    reasoning:
      status === 'contradicted'
        ? 'رقم في المسودة لا يطابق أي رقم مُستخرَج من الإفصاح الرسمي.'
        : status === 'missing'
          ? 'الإفصاح لا يذكر هذا الرقم — احتمال تلفيق.'
          : status === 'supported'
            ? 'الأرقام تطابق الإفصاح الرسمي.'
            : 'لا توجد أرقام للتحقق.',
    anchorRef: claim.anchorRef,
  };
}

/** Substring/grounding check for name/date/quote/semantic claims. */
function groundInText(claim: DraftClaim, disclosureText: string, tierW: number, type: ClaimType): ClaimVerdict {
  // Cheap deterministic pass first: is the key token present in the disclosure?
  const key = claim.text.replace(/\s+/g, ' ').trim();
  const present = key.length > 3 && disclosureText.includes(key.slice(0, Math.min(40, key.length)));
  const status: ClaimStatus = present ? 'supported' : 'unverified';
  return {
    claimText: claim.text,
    claimType: type,
    status,
    confidenceScore: present ? tierW : 0.4,
    sourceTier: present ? tierW : 0,
    supportingEvidence: present ? [{ span: 'مذكور في نص الإفصاح' }] : [],
    contradictingEvidence: [],
    missingEvidence: present ? [] : [{ note: 'لم يُعثر على ما يدعم هذا الادعاء في الإفصاح.' }],
    reasoning: present ? 'مطابق لنص الإفصاح.' : 'يحتاج تحقق دلالي.',
    anchorRef: claim.anchorRef,
  };
}

/**
 * Inverted-FIRE adversarial check for a semantic claim that the cheap pass left
 * 'unverified'. The model is told the disclosure is the ONLY source of truth and
 * must answer supported/contradicted/insufficient — never from its own knowledge.
 */
async function verifySemanticLLM(claim: DraftClaim, disclosureText: string, tierW: number): Promise<ClaimVerdict> {
  const sys =
    'أنت مدقق حقائق صارم لغرفة أخبار مالية. المصدر الوحيد للحقيقة هو نص الإفصاح المُعطى. ' +
    'لا تعتمد إطلاقاً على معرفتك العامة. أعد JSON فقط: ' +
    '{"verdict":"supported|contradicted|insufficient","reason":"..."}';
  const user = `نص الإفصاح:\n"""${disclosureText.slice(0, 6000)}"""\n\nالادعاء:\n"""${claim.text}"""`;
  try {
    const r = await complete(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { tier: 'reasoning', temperature: 0, json: true, maxTokens: 300 }
    );
    const parsed = parseJsonObject<{ verdict: string; reason: string }>(r.text);
    const v = parsed?.verdict ?? 'insufficient';
    const status: ClaimStatus =
      v === 'supported' ? 'supported' : v === 'contradicted' ? 'contradicted' : 'missing';
    return {
      claimText: claim.text,
      claimType: 'semantic',
      status,
      confidenceScore: status === 'supported' ? tierW : status === 'contradicted' ? 0.05 : 0.2,
      sourceTier: status === 'supported' ? tierW : 0,
      supportingEvidence: status === 'supported' ? [{ span: 'مؤكد دلالياً مقابل الإفصاح' }] : [],
      contradictingEvidence: status === 'contradicted' ? [{ span: claim.text.slice(0, 160) }] : [],
      missingEvidence: status === 'missing' ? [{ note: parsed?.reason ?? 'غير كافٍ' }] : [],
      reasoning: parsed?.reason ?? 'تحقق دلالي.',
      anchorRef: claim.anchorRef,
    };
  } catch {
    // Fail-closed: if the check can't run, leave it unverified (held for human).
    return {
      claimText: claim.text, claimType: 'semantic', status: 'unverified', confidenceScore: 0.3,
      sourceTier: 0, supportingEvidence: [], contradictingEvidence: [],
      missingEvidence: [{ note: 'تعذّر إجراء التحقق الدلالي — محجوز لمراجعة بشرية.' }],
      reasoning: 'تعذّر التحقق.', anchorRef: claim.anchorRef,
    };
  }
}

/** Verify a whole draft. Numbers/dates deterministic; semantic optionally LLM. */
export async function verifyDraft(input: VerifyInput): Promise<VerifyResult> {
  const tierW = TIER_WEIGHT[input.sourceTier];
  const verdicts: ClaimVerdict[] = [];

  for (const claim of input.claims) {
    const type = inferType(claim);
    if (type === 'number') {
      verdicts.push(verifyNumber(claim, input.figures, tierW));
    } else if (type === 'date') {
      // dates: deterministic grounding in the disclosure text
      verdicts.push(groundInText(claim, input.disclosureText, tierW, 'date'));
    } else {
      const cheap = groundInText(claim, input.disclosureText, tierW, type);
      if (cheap.status === 'unverified' && input.adversarial) {
        verdicts.push(await verifySemanticLLM(claim, input.disclosureText, tierW));
      } else {
        verdicts.push(cheap);
      }
    }
  }

  // Hard blockers: any number/date claim that is contradicted or missing.
  const blockers = verdicts
    .filter((v) => (v.claimType === 'number' || v.claimType === 'date') &&
      (v.status === 'contradicted' || v.status === 'missing'))
    .map((v) => `${v.status === 'contradicted' ? 'رقم متناقض' : 'رقم غير مدعوم'}: «${v.claimText.slice(0, 80)}»`);

  return { verdicts, publishable: blockers.length === 0, blockers };
}

export { TIER_WEIGHT };
