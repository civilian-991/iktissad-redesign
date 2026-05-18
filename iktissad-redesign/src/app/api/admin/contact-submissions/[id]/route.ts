import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

// ─── DELETE /api/admin/contact-submissions/[id] ──────────────────
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
  const { error } = await (admin.from('contact_submissions') as any)
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
