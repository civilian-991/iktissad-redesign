/**
 * Content Archival Trigger
 * POST /api/admin/archival/run
 *
 * Manually triggers archival of articles older than threshold.
 * Can also be called by a cron job for daily automated runs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from '@/lib/api-auth';
import { archiveOldArticles } from '@/lib/archival';
import type { ApiResponse } from '@/types';

const schema = z.object({
  thresholdDays: z.number().int().min(30).max(3650).optional().default(730),
});

export async function POST(request: NextRequest) {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  let body: unknown = {};
  try { body = await request.json(); }
  catch { /* empty body is fine, defaults apply */ }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  try {
    const result = await archiveOldArticles(parsed.data.thresholdDays);
    return NextResponse.json({ data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Archival failed' },
      { status: 500 }
    );
  }
}
