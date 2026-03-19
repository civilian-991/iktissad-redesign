/**
 * POST /api/admin/perf-report
 *
 * Receives client-side performance reports from the admin panel.
 * Requires an active Supabase Auth session (admin users only).
 *
 * Payload: { component: string, duration: number, page: string, timestamp: number }
 *
 * Production logging is structured console output — Sentry integration-ready.
 * To integrate Sentry, replace the console.log call below with:
 *   Sentry.captureMessage('SlowRender', { extra: report, level: 'warning' })
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthFromRequest, unauthorizedResponse } from '@/lib/api-auth';

interface PerfReportPayload {
  component: string;
  duration: number;
  page: string;
  timestamp: number;
}

function isValidReport(body: unknown): body is PerfReportPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.component === 'string' && b.component.length > 0 &&
    typeof b.duration === 'number' && b.duration >= 0 &&
    typeof b.page === 'string' &&
    typeof b.timestamp === 'number'
  );
}

export async function POST(request: NextRequest) {
  // Verify admin session
  const auth = await requireAuthFromRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isValidReport(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const report = body as PerfReportPayload;

  // Structured log — Sentry/observability integration point
  console.log(
    JSON.stringify({
      level: 'warn',
      event: 'slow_render',
      component: report.component,
      duration_ms: report.duration,
      page: report.page,
      client_timestamp: new Date(report.timestamp).toISOString(),
      user_id: auth.userId,
    })
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
