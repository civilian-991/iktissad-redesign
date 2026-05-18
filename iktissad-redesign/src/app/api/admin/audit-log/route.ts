import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

// ─── GET /api/admin/audit-log ────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const resourceType = searchParams.get('resource_type');
  const actorId = searchParams.get('actor_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from('audit_log') as any).select('*', { count: 'exact' });

  if (action) query = query.eq('action', action);
  if (resourceType) query = query.eq('resource_type', resourceType);
  if (actorId) query = query.eq('actor_id', actorId);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo);
  if (search) {
    query = query.or(`actor_email.ilike.%${search}%,resource_id.ilike.%${search}%`);
  }

  const start = (page - 1) * limit;
  const { data: rows, count, error } = await query
    .order('created_at', { ascending: false })
    .range(start, start + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  const response: ApiResponse<unknown[]> = {
    data: rows ?? [],
    pagination: {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  return NextResponse.json(response);
}
