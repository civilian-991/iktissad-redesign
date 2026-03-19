/**
 * Public API v1 — Single article by slug
 * GET /api/v1/articles/[slug]
 *
 * Auth: Bearer API key
 * Required scope: read:articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, apiKeyUnauthorizedResponse, apiKeyRateLimitResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const endpoint = '/api/v1/articles/[slug]';

  const auth = await validateApiKey(request, { endpoint });
  if (!auth.valid) {
    if (auth.error === 'Rate limit exceeded') return apiKeyRateLimitResponse();
    return apiKeyUnauthorizedResponse(auth.error);
  }

  if (!auth.scopes?.includes('read:articles')) {
    return NextResponse.json(
      { success: false, error: "Scope 'read:articles' required" },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('articles')
    .select('id, title, slug, excerpt, content, featured_image, published_at, section, sector, country, author_name, tags, status, featured, views, created_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: 'Article not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}
