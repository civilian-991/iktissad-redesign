import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthFromRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAdminNotification } from '@/lib/notifications';
import { mapComment } from '@/lib/supabase/mappers';
import type { ApiResponse, Comment } from '@/types';

const COMMENT_SELECT = `
  *,
  user:user_id ( id, name, avatar ),
  article:article_id ( id, title, slug )
`;

// ─── GET /api/comments ───────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const articleId = searchParams.get('article_id');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from('comments') as any).select(COMMENT_SELECT, { count: 'exact' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (articleId) {
    query = query.eq('article_id', articleId);
  }

  if (search) {
    query = query.ilike('body', `%${search}%`);
  }

  const start = (page - 1) * pageSize;
  const { data: rows, count, error } = await query
    .order('created_at', { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;

  const response: ApiResponse<Comment[]> = {
    data: (rows ?? []).map(mapComment),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/comments ──────────────────────────────────────────
const createCommentSchema = z.object({
  articleId: z.string().uuid(),
  body: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from('comments') as any)
    .insert({
      article_id: parsed.data.articleId,
      user_id: auth.userId ?? null,
      body: parsed.data.body,
      parent_id: parsed.data.parentId ?? null,
      status: 'pending',
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Notify admins of new pending comment
  await createAdminNotification({
    type: 'comment_flagged',
    title: 'تعليق جديد للمراجعة',
    body: (parsed.data.body as string).slice(0, 120),
    resourceId: (row as { id: string }).id,
  });

  return NextResponse.json({ data: row } satisfies ApiResponse<unknown>, { status: 201 });
}
