import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

// ─── PATCH /api/admin/social-accounts/[id] ───────────────────────
// Toggle active flag or rotate token without recreating the row.
const patchSchema = z.object({
  active: z.boolean().optional(),
  accountName: z.string().min(1).optional(),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().nullable().optional(),
  tokenExpiresAt: z.string().nullable().optional(),
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

  const updateData: Record<string, unknown> = {};
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
  if (parsed.data.accountName !== undefined) updateData.account_name = parsed.data.accountName;
  if (parsed.data.accessToken !== undefined) updateData.access_token = parsed.data.accessToken;
  if (parsed.data.refreshToken !== undefined) updateData.refresh_token = parsed.data.refreshToken;
  if (parsed.data.tokenExpiresAt !== undefined) updateData.token_expires_at = parsed.data.tokenExpiresAt;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('social_accounts') as any)
    .update(updateData)
    .eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { success: true } } satisfies ApiResponse<{ success: boolean }>);
}

// ─── DELETE /api/admin/social-accounts/[id] ──────────────────────
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
  const { error } = await (admin.from('social_accounts') as any)
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
