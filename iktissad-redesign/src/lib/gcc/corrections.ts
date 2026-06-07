/**
 * Corrections subsystem (plan v4 §2 trust layer; research appendix §3 newsflow
 * CorrectionTicket + correction templates).
 *
 * A published article is corrected by opening a ticket, which reopens the
 * generated article back into the pipeline (status → needs_changes), re-drafts,
 * re-verifies, re-approves via Telegram, and republishes with a templated
 * Arabic correction note appended.
 */

export type CorrectionKind = 'factual_error' | 'missing_context' | 'retraction';

export interface CorrectionDetails {
  /** what was wrong / what changed */
  summary: string;
  /** ISO date the correction was issued (caller stamps it — no Date in lib) */
  issuedAt?: string;
}

/** Arabic correction note templates (translate of newsflow's three templates). */
const TEMPLATES: Record<CorrectionKind, (d: CorrectionDetails) => string> = {
  factual_error: (d) =>
    `【تصحيح】 تتضمن النسخة الأصلية من هذا التقرير خطأً وقائعياً. ${d.summary} ` +
    `وقد جرى تصحيح النص. تعتذر هيئة التحرير عن الخطأ.`,
  missing_context: (d) =>
    `【استكمال】 جرى تحديث هذا التقرير بمعلومات إضافية لاستكمال السياق. ${d.summary}`,
  retraction: (d) =>
    `【توضيح وسحب】 تم سحب الادعاء الوارد في النسخة الأصلية من هذا التقرير. ${d.summary} ` +
    `وتؤكد هيئة التحرير التزامها بدقة ما تنشره.`,
};

/** Build the Arabic correction note to append to the republished article. */
export function buildCorrectionNote(kind: CorrectionKind, details: CorrectionDetails): string {
  return TEMPLATES[kind](details);
}

/** Map a correction kind to the impact_scope stored on the ticket. */
export const IMPACT_SCOPE: Record<CorrectionKind, string> = {
  factual_error: 'factual_error',
  missing_context: 'missing_context',
  retraction: 'retraction',
};

export const CORRECTION_KINDS: CorrectionKind[] = ['factual_error', 'missing_context', 'retraction'];
