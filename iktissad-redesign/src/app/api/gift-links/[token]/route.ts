/**
 * GET /api/gift-links/[token]
 *
 * Validates a gift link token and increments its use count.
 * Used server-side in page.tsx — the client just reads the ?gift= param.
 *
 * Returns: { data: { valid, articleId, articleSlug, expiresAt } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length > 80) {
    return NextResponse.json(
      { data: { valid: false, reason: 'invalid_token' } },
      { status: 200 }
    );
  }

  const admin = createAdminClient();

  const { data: row, error } = await (admin as any)
    .from('gift_links')
    .select('id, article_id, uses_count, max_uses, expires_at, articles!article_id(slug)')
    .eq('token', token)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { data: { valid: false, reason: 'not_found' } },
      { status: 200 }
    );
  }

  const expired  = new Date(row.expires_at) <= new Date();
  const maxed    = row.uses_count >= row.max_uses;

  if (expired || maxed) {
    return NextResponse.json({
      data: {
        valid:      false,
        reason:     expired ? 'expired' : 'max_uses_reached',
        articleId:  row.article_id,
        articleSlug: row.articles?.slug,
        expiresAt:  row.expires_at,
      },
    } satisfies ApiResponse<{
      valid: boolean; reason: string; articleId: string;
      articleSlug: string; expiresAt: string;
    }>);
  }

  // Increment use count (fire-and-forget — don't block the response)
  void (admin as any)
    .from('gift_links')
    .update({ uses_count: row.uses_count + 1 })
    .eq('id', row.id);

  return NextResponse.json({
    data: {
      valid:       true,
      articleId:   row.article_id,
      articleSlug: row.articles?.slug,
      expiresAt:   row.expires_at,
    },
  } satisfies ApiResponse<{
    valid: boolean; articleId: string;
    articleSlug: string; expiresAt: string;
  }>);
}
