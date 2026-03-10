import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit';
import type { ApiResponse } from '@/types';

const COMMENT_SELECT = `
  *,
  user:user_id ( id, name, avatar ),
  article:article_id ( id, title, slug )
`;

// ─── GET /api/comments/[id] ─────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from('comments') as any)
    .select(COMMENT_SELECT)
    .eq('id', id)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: 'Comment not found' } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  return NextResponse.json({ data: row } satisfies ApiResponse<unknown>);
}

// ─── PUT /api/comments/[id] ─────────────────────────────────────
const moderateSchema = z.object({
  status: z.enum(['approved', 'rejected', 'spam']),
  moderatorNote: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = moderateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Fetch old values for audit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: oldRow } = await (admin.from('comments') as any)
    .select('status, moderated_by, moderated_at')
    .eq('id', id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from('comments') as any)
    .update({
      status: parsed.data.status,
      moderated_by: auth.userId,
      moderated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Log audit
  const ipAddress = request.headers.get('x-forwarded-for') ?? undefined;
  await logAuditAction({
    actorId: auth.userId!,
    actorEmail: '',
    action: `moderate_comment_${parsed.data.status}`,
    resourceType: 'comment',
    resourceId: id,
    oldValues: oldRow ?? undefined,
    newValues: { status: parsed.data.status },
    ipAddress,
  });

  return NextResponse.json({ data: row } satisfies ApiResponse<unknown>);
}

// ─── DELETE /api/comments/[id] ──────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthFromRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: oldRow } = await (admin.from('comments') as any)
    .select('*')
    .eq('id', id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('comments') as any)
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const ipAddress = request.headers.get('x-forwarded-for') ?? undefined;
  await logAuditAction({
    actorId: auth.userId!,
    actorEmail: '',
    action: 'delete_comment',
    resourceType: 'comment',
    resourceId: id,
    oldValues: oldRow ?? undefined,
    ipAddress,
  });

  return NextResponse.json({ data: { id } } satisfies ApiResponse<{ id: string }>);
}
