/**
 * GET /api/admin/paywall-metrics
 *
 * Returns paywall conversion metrics for the admin dashboard:
 *   - total article reads this month (all + paywalled)
 *   - number of users who hit the paywall limit
 *   - article purchases (micropayments)
 *   - gift links created / used this month
 *   - top paywalled articles by views
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const admin = createAdminClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthIso = startOfMonth.toISOString();

  const [
    totalReadsResult,
    purchasesResult,
    giftLinksCreatedResult,
    giftLinksUsedResult,
    topPaywalledResult,
  ] = await Promise.all([
    // Total reads this month
    (admin as any)
      .from('reading_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthIso),

    // Article purchases this month
    (admin as any)
      .from('article_purchases')
      .select('*', { count: 'exact', head: true })
      .gte('purchased_at', monthIso),

    // Gift links created this month
    (admin as any)
      .from('gift_links')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthIso),

    // Gift links with at least one use this month
    (admin as any)
      .from('gift_links')
      .select('*', { count: 'exact', head: true })
      .gt('uses_count', 0)
      .gte('created_at', monthIso),

    // Top 5 paywalled articles by views
    (admin as any)
      .from('articles')
      .select('id, title, slug, views')
      .eq('is_paywalled', true)
      .eq('status', 'published')
      .order('views', { ascending: false })
      .limit(5),
  ]);

  // Revenue from article purchases this month
  const { data: purchaseRevenue } = await (admin as any)
    .from('article_purchases')
    .select('amount')
    .gte('purchased_at', monthIso);

  const revenueTotal = (purchaseRevenue ?? []).reduce(
    (sum: number, r: any) => sum + Number(r.amount ?? 0),
    0
  );

  return NextResponse.json({
    data: {
      readsThisMonth:        totalReadsResult.count  ?? 0,
      purchasesThisMonth:    purchasesResult.count   ?? 0,
      purchaseRevenue:       Math.round(revenueTotal * 100) / 100,
      giftLinksCreated:      giftLinksCreatedResult.count ?? 0,
      giftLinksRedeemed:     giftLinksUsedResult.count    ?? 0,
      topPaywalledArticles: (topPaywalledResult.data ?? []).map((a: any) => ({
        id:    a.id,
        title: a.title,
        slug:  a.slug,
        views: a.views ?? 0,
      })),
    },
  } satisfies ApiResponse<{
    readsThisMonth: number;
    purchasesThisMonth: number;
    purchaseRevenue: number;
    giftLinksCreated: number;
    giftLinksRedeemed: number;
    topPaywalledArticles: { id: string; title: string; slug: string; views: number }[];
  }>);
}
