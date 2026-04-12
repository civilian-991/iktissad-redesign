/**
 * GET /api/account/purchases
 *
 * Returns a paginated list of articles the authenticated user has purchased.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }

  // users.id = auth.uid() in Supabase Auth
  const userId = user.id;

  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const start    = (page - 1) * pageSize;

  const { data: rows, count, error } = await (supabase as any)
    .from('article_purchases')
    .select(`
      id,
      amount,
      currency,
      purchased_at,
      articles:article_id (
        id,
        title,
        slug,
        excerpt,
        featured_image,
        published_at,
        sections:section_id ( slug, name )
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const purchases = (rows ?? []).map((row: any) => ({
    id:          row.id,
    amount:      row.amount,
    currency:    row.currency,
    purchasedAt: row.purchased_at,
    article:     row.articles
      ? {
          id:           row.articles.id,
          title:        row.articles.title,
          slug:         row.articles.slug,
          excerpt:      row.articles.excerpt ?? '',
          featuredImage: row.articles.featured_image ?? '',
          publishedAt:  row.articles.published_at,
          section:      row.articles.sections?.name ?? '',
        }
      : null,
  }));

  const total = count ?? 0;

  return NextResponse.json({
    data: purchases,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  } satisfies ApiResponse<typeof purchases>);
}
