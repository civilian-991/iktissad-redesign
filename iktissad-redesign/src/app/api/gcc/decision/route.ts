/**
 * POST /api/gcc/decision — log an editor decision (plan v4 §2.4 feedback loop).
 *
 * Called by the n8n Responder on every Telegram tap (✅/✏️/❌) and by the
 * Selector on screen in/out. Writes the feedback corpus (gcc_editorial_decisions
 * — the edit_diff is the highest-signal training data), advances the
 * generated-article + active review-bundle status (the staleness guard), and
 * appends an immutable audit-log entry. Secret-header auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkGccSecret } from '@/lib/gcc/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  action: z.enum(['screened_in', 'screened_out', 'approved', 'rejected', 'edited', 'manual_draft']),
  generatedArticleId: z.string().uuid().optional(),
  disclosureEventId: z.string().uuid().optional(),
  category: z.string().optional(),
  editDiff: z.unknown().optional(),
  reason: z.string().optional(),
  decidedBy: z.string().optional(),
});

const STATUS_BY_ACTION: Record<string, string | undefined> = {
  approved: 'approved',
  rejected: 'spiked',
  edited: 'needs_changes',
};
const BUNDLE_STATUS_BY_ACTION: Record<string, string | undefined> = {
  approved: 'approved',
  rejected: 'rejected',
};

export async function POST(request: NextRequest) {
  const denied = checkGccSecret(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const admin = createAdminClient();

  // 1. Log the decision (the feedback corpus).
  const { error: decErr } = await (admin.from('gcc_editorial_decisions') as any).insert({
    generated_article_id: d.generatedArticleId ?? null,
    disclosure_event_id: d.disclosureEventId ?? null,
    category: d.category ?? null,
    action: d.action,
    edit_diff: d.editDiff ?? null,
    reason: d.reason ?? null,
    decided_by: d.decidedBy ?? null,
  });
  if (decErr) {
    return NextResponse.json({ error: `decision log failed: ${decErr.message}` }, { status: 500 });
  }

  // 2a. On 'edited', persist the editor's text into the stored draft and mark it
  //     human-verified (the human edit IS the verification → passes the gate).
  if (d.action === 'edited' && d.generatedArticleId) {
    const after =
      typeof d.editDiff === 'string'
        ? d.editDiff
        : (d.editDiff as { after?: string } | null)?.after;
    if (after && after.trim()) {
      const lines = after.split('\n').map((s) => s.trim()).filter(Boolean);
      const title = lines[0] ?? '';
      const bodyMd = lines.slice(1).join('\n\n') || after;
      const { data: gen } = await (admin.from('gcc_generated_articles') as any)
        .select('draft, fact_check')
        .eq('id', d.generatedArticleId)
        .maybeSingle();
      if (gen) {
        await (admin.from('gcc_generated_articles') as any)
          .update({
            draft: { ...(gen.draft || {}), title, body_md: bodyMd },
            fact_check: { ...(gen.fact_check || {}), publishable: true, human_edited: true },
          })
          .eq('id', d.generatedArticleId);
      }
    }
  }

  // 2b. Advance generated-article + active review-bundle status.
  if (d.generatedArticleId) {
    const newStatus = STATUS_BY_ACTION[d.action];
    if (newStatus) {
      await (admin.from('gcc_generated_articles') as any)
        .update({ status: newStatus })
        .eq('id', d.generatedArticleId);
    }
    const bundleStatus = BUNDLE_STATUS_BY_ACTION[d.action];
    if (bundleStatus) {
      await (admin.from('gcc_review_bundles') as any)
        .update({ status: bundleStatus })
        .eq('generated_article_id', d.generatedArticleId)
        .eq('status', 'active');
    }
  }

  // 3. Append an immutable audit entry (hash chain maintained by DB trigger).
  await (admin.from('gcc_audit_log') as any).insert({
    actor_type: 'human',
    actor_id: d.decidedBy ?? 'editor',
    action: `editorial:${d.action}`,
    object_type: 'gcc_generated_article',
    object_id: d.generatedArticleId ?? d.disclosureEventId ?? null,
    details: { category: d.category ?? null, reason: d.reason ?? null },
    override_flag: false,
  });

  return NextResponse.json({ data: { ok: true } });
}
