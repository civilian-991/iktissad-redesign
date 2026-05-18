import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

// ─── PATCH /api/admin/newsletter-subscribers/[id] ────────────────
// Toggle subscriber status (active ↔ unsubscribed) without deleting.
const patchSchema = z.object({
  status: z.enum(['active', 'unsubscribed']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('newsletter_subscribers') as any)
    .update({ status: parsed.data.status })
    .eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { success: true } } satisfies ApiResponse<{ success: boolean }>);
}

// ─── DELETE /api/admin/newsletter-subscribers/[id] ───────────────
// Hard delete — for GDPR / right-to-be-forgotten requests.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { id } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('newsletter_subscribers') as any)
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { success: true } } satisfies ApiResponse<{ success: boolean }>);
}
