/**
 * GET /api/admin/analytics/shares
 *
 * Share analytics dashboard data:
 *  - Most shared articles
 *  - Platform breakdown
 *  - Total shares count
 *
 * Tables: share_events, articles
 * Auth: Required (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

export interface SharedArticle {
  articleId: string;
  title: string;
  slug: string;
  shares: number;
  platforms: Record<string, number>;
}

export interface ShareAnalytics {
  totalShares: number;
  platformBreakdown: Array<{ platform: string; count: number }>;
  mostShared: SharedArticle[];
  period: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const admin = createAdminClient();
  const params = request.nextUrl.searchParams;
  const period = params.get("period") ?? "30";
  const days = parseInt(period, 10) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Get all share events in period
    const { data: events } = await (admin as any)
      .from("share_events")
      .select("article_id, platform, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    const allEvents = events ?? [];
    const totalShares = allEvents.length;

    // Platform breakdown
    const platformCounts: Record<string, number> = {};
    for (const e of allEvents) {
      platformCounts[e.platform] = (platformCounts[e.platform] || 0) + 1;
    }

    const platformBreakdown = Object.entries(platformCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([platform, count]) => ({ platform, count }));

    // Most shared articles
    const articleCounts: Record<string, { total: number; platforms: Record<string, number> }> = {};
    for (const e of allEvents) {
      if (!articleCounts[e.article_id]) {
        articleCounts[e.article_id] = { total: 0, platforms: {} };
      }
      articleCounts[e.article_id].total++;
      articleCounts[e.article_id].platforms[e.platform] =
        (articleCounts[e.article_id].platforms[e.platform] || 0) + 1;
    }

    const topArticleIds = Object.entries(articleCounts)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15)
      .map(([id]) => id);

    let mostShared: SharedArticle[] = [];

    if (topArticleIds.length > 0) {
      const { data: articles } = await (admin as any)
        .from("articles")
        .select("id, title, slug")
        .in("id", topArticleIds);

      const articleMap = new Map(
        (articles ?? []).map((a: any) => [a.id, a])
      );

      mostShared = topArticleIds.map((id) => {
        const a = articleMap.get(id) as any;
        const counts = articleCounts[id];
        return {
          articleId: id,
          title: a?.title ?? "—",
          slug: a?.slug ?? "",
          shares: counts.total,
          platforms: counts.platforms,
        };
      });
    }

    const result: ShareAnalytics = {
      totalShares,
      platformBreakdown,
      mostShared,
      period: `${days}`,
    };

    return NextResponse.json({ data: result } satisfies ApiResponse<ShareAnalytics>);
  } catch (err) {
    console.error("[share-analytics]", err);
    return NextResponse.json(
      { error: "Failed to load share analytics" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
