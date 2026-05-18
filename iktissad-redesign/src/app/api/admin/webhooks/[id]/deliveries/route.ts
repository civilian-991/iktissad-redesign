import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse, WebhookDelivery } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()
  const { id } = await params;

  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10);
  const pageSize = 20;

  const admin = createAdminClient();
  const { data, count, error } = await admin
    .from('webhook_deliveries')
    .select('*', { count: 'exact' })
    .eq('webhook_id', id)
    .order('delivered_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: error.message }, { status: 500 });
  }

  const deliveries: WebhookDelivery[] = ((data as unknown[]) ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      webhookId: row.webhook_id as string,
      event: row.event as string,
      payload: row.payload as Record<string, unknown>,
      responseStatus: row.response_status as number | null,
      responseBody: row.response_body as string | null,
      attempt: row.attempt as number,
      success: row.success as boolean,
      deliveredAt: row.delivered_at as string,
    };
  });

  return NextResponse.json<ApiResponse<WebhookDelivery[]>>({
    data: deliveries,
    pagination: {
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  });
}
