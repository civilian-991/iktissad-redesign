/**
 * Un-archive a specific article
 * DELETE /api/admin/archival/[id]
 *
 * Restores an archived article to active status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { unarchiveArticle } from '@/lib/archival';
import type { ApiResponse } from '@/types';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { id } = await params;

  const success = await unarchiveArticle(id);

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to un-archive article' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { restored: true } } satisfies ApiResponse<{ restored: boolean }>);
}
