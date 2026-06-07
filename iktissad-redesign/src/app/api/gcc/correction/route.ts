/**
 * POST /api/gcc/correction — open a correction ticket and reopen the article.
 *
 * Post-publish trust loop (plan v4 §2). Creates a gcc_correction_tickets row,
 * reopens the generated article (status → needs_changes) so it re-enters the
 * pipeline, builds the Arabic correction note, and writes an audit entry.
 * Secret-header auth (called by an editor flow / n8n).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkGccSecret } from '@/lib/gcc/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildCorrectionNote, IMPACT_SCOPE, CORRECTION_KINDS } from '@/lib/gcc/corrections';

const schema = z
  .object({
    generatedArticleId: z.string().uuid().optional(),
    articleId: z.string().uuid().optional(),
    kind: z.enum(['factual_error', 'missing_context', 'retraction']),
    triggerReason: z.string().min(3),
    proposedFix: z.string().optional(),
    openedBy: z.string().optional(),
  })
  .refine((d) => d.generatedArticleId || d.articleId, {
    message: 'generatedArticleId or articleId is required',
  });

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

  // 1. Open the ticket.
  const { data: ticket, error: tErr } = await (admin.from('gcc_correction_tickets') as any)
    .insert({
      generated_article_id: d.generatedArticleId ?? null,
      article_id: d.articleId ?? null,
      trigger_reason: d.triggerReason,
      impact_scope: IMPACT_SCOPE[d.kind],
      proposed_fix: d.proposedFix ?? null,
      status: 'open',
      opened_by: d.openedBy ?? null,
    })
    .select('id')
    .single();
  if (tErr || !ticket) {
    return NextResponse.json({ error: `correction ticket failed: ${tErr?.message}` }, { status: 500 });
  }

  // 2. Reopen the generated article (re-enters the pipeline).
  if (d.generatedArticleId) {
    await (admin.from('gcc_generated_articles') as any)
      .update({ status: 'needs_changes' })
      .eq('id', d.generatedArticleId);
  }

  // 3. Build the Arabic correction note (caller appends on republish).
  const correctionNote = buildCorrectionNote(d.kind, { summary: d.triggerReason });

  // 4. Audit.
  await (admin.from('gcc_audit_log') as any).insert({
    actor_type: 'human',
    actor_id: d.openedBy ?? 'editor',
    action: `correction:${d.kind}`,
    object_type: d.generatedArticleId ? 'gcc_generated_article' : 'article',
    object_id: d.generatedArticleId ?? d.articleId ?? null,
    details: { trigger_reason: d.triggerReason },
    override_flag: false,
  });

  return NextResponse.json({ data: { ticketId: ticket.id, correctionNote, kinds: CORRECTION_KINDS } });
}
