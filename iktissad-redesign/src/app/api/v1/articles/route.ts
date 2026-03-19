/**
 * Public API v1 — Articles
 * GET /api/v1/articles
 *
 * Query params:
 *   ?page=1&limit=20&section=&sector=&q=
 *
 * Auth: Bearer API key (validateApiKey)
 * Required scope: read:articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, apiKeyUnauthorizedResponse, apiKeyRateLimitResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const SCOPE_REQUIRED = 'read:articles';
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const start = Date.now();
  const endpoint = '/api/v1/articles';

  const auth = await validateApiKey(request, { endpoint });
  if (!auth.valid) {
    if (auth.error === 'Rate limit exceeded') return apiKeyRateLimitResponse();
    return apiKeyUnauthorizedResponse(auth.error);
  }

  if (!auth.scopes?.includes(SCOPE_REQUIRED)) {
    return NextResponse.json(
      { success: false, error: `Scope '${SCOPE_REQUIRED}' required` },
      { status: 403 }
    );
  }

  const sp      = request.nextUrl.searchParams;
  const page    = Math.max(1, parseInt(sp.get('page')  ?? '1', 10));
  const limit   = Math.min(MAX_LIMIT, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)));
  const section = sp.get('section') ?? null;
  const sector  = sp.get('sector')  ?? null;
  const q       = sp.get('q')       ?? null;
  const offset  = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from('articles')
    .select(
      'id, title, slug, excerpt, featured_image, published_at, section, sector, country, author_name, tags, status, featured, views',
      { count: 'exact' }
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (section) query = query.eq('section', section);
  if (sector)  query = query.eq('sector', sector);
  if (q)       query = query.ilike('title', `%${q}%`);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Database error' },
      { status: 500 }
    );
  }

  const total   = count ?? 0;
  const hasMore = offset + limit < total;
  const responseTimeMs = Date.now() - start;

  // Log usage with final status/response time (async, non-blocking)
  void validateApiKey(request, { endpoint, statusCode: 200, responseTimeMs });

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: {
      page,
      limit,
      total,
      hasMore,
      responseTimeMs,
    },
  });
}
