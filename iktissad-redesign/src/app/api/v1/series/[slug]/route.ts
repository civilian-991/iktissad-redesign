/**
 * Public API v1 — Single series with its articles
 * GET /api/v1/series/[slug]
 *
 * Auth: Bearer API key
 * Required scope: read:series
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, apiKeyUnauthorizedResponse, apiKeyRateLimitResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const endpoint = '/api/v1/series/[slug]';

  const auth = await validateApiKey(request, { endpoint });
  if (!auth.valid) {
    if (auth.error === 'Rate limit exceeded') return apiKeyRateLimitResponse();
    return apiKeyUnauthorizedResponse(auth.error);
  }

  if (!auth.scopes?.includes('read:series')) {
    return NextResponse.json(
      { success: false, error: "Scope 'read:series' required" },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const admin = createAdminClient();

  // Fetch the series
  const { data: series, error: seriesError } = await admin
    .from('article_series')
    .select('id, slug, title, title_en, description, description_en, cover_image, status, created_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (seriesError || !series) {
    return NextResponse.json(
      { success: false, error: 'Series not found' },
      { status: 404 }
    );
  }

  // Fetch articles in this series ordered by their position
  const { data: seriesArticles, error: articlesError } = await admin
    .from('series_articles')
    .select('order_index, article_id, articles(id, title, slug, excerpt, featured_image, published_at, author_name, section, tags)')
    .eq('series_id', (series as unknown as Record<string, unknown>).id as string)
    .order('order_index', { ascending: true });

  if (articlesError) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }

  const articles = (seriesArticles ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return {
      orderIndex: r.order_index,
      ...(r.articles as Record<string, unknown>),
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      ...(series as unknown as Record<string, unknown>),
      articles,
      articleCount: articles.length,
    },
  });
}
