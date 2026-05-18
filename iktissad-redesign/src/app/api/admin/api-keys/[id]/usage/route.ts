/**
 * API Key Usage Stats
 * GET /api/admin/api-keys/[id]/usage
 *
 * Returns:
 *   - totalRequests, requestsToday, requests7Days, requests30Days
 *   - errorRate (percentage of 4xx/5xx responses)
 *   - avgResponseTimeMs
 *   - topEndpoints (by request count)
 *   - recentRequests (last 50 log entries)
 */

import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse, ApiKeyUsageStats } from '@/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { id } = await params;
  const admin = createAdminClient();

  // Verify key exists
  const { data: keyRow, error: keyError } = await admin
    .from('api_keys')
    .select('id')
    .eq('id', id)
    .single();

  if (keyError || !keyRow) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'API key not found' },
      { status: 404 }
    );
  }

  // Fetch all log entries for this key (capped at 10,000 rows for aggregation)
  const { data: logs, error: logsError } = await admin
    .from('api_usage_log')
    .select('endpoint, status_code, response_time_ms, requested_at')
    .eq('api_key_id', id)
    .order('requested_at', { ascending: false })
    .limit(10000);

  if (logsError) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: logsError.message },
      { status: 500 }
    );
  }

  const rows = (logs ?? []) as Array<{
    endpoint: string;
    status_code: number | null;
    response_time_ms: number | null;
    requested_at: string;
  }>;

  const now = Date.now();
  const todayStart   = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const ago7Days     = now - 7  * 24 * 60 * 60 * 1000;
  const ago30Days    = now - 30 * 24 * 60 * 60 * 1000;

  let requestsToday = 0;
  let requests7Days = 0;
  let requests30Days = 0;
  let errorCount = 0;
  let totalResponseTime = 0;
  let responseTimeCount = 0;

  const endpointCounts: Record<string, number> = {};

  for (const row of rows) {
    const ts = new Date(row.requested_at).getTime();

    if (ts >= todayStart)  requestsToday++;
    if (ts >= ago7Days)    requests7Days++;
    if (ts >= ago30Days)   requests30Days++;

    if (row.status_code !== null && row.status_code >= 400) errorCount++;

    if (row.response_time_ms !== null) {
      totalResponseTime += row.response_time_ms;
      responseTimeCount++;
    }

    endpointCounts[row.endpoint] = (endpointCounts[row.endpoint] ?? 0) + 1;
  }

  const totalRequests = rows.length;
  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
  const avgResponseTimeMs = responseTimeCount > 0
    ? Math.round(totalResponseTime / responseTimeCount)
    : 0;

  const topEndpoints = Object.entries(endpointCounts)
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const stats: ApiKeyUsageStats = {
    totalRequests,
    requestsToday,
    requests7Days,
    requests30Days,
    errorRate: Math.round(errorRate * 10) / 10,
    avgResponseTimeMs,
    topEndpoints,
  };

  return NextResponse.json<ApiResponse<ApiKeyUsageStats>>({ data: stats });
}
