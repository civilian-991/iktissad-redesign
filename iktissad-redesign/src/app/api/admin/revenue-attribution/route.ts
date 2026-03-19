/**
 * Admin Revenue Attribution API
 * GET /api/admin/revenue-attribution?articleId=[id] (optional)
 *
 * Returns per-article conversion attribution data derived from conversion_touches,
 * joined with article_reads analytics. Restricted to authenticated admins.
 *
 * If ?articleId= is provided, narrows the response to that single article.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────────────────────

export interface RevenueAttributionArticle {
  articleId: string;
  title: string;
  conversionCount: number;
  estimatedRevenue: number;
  avgScrollDepth: number;
  readThroughRate: number;
  isPaywalled: boolean;
  articleType: string | null;
}

export interface RevenueAttributionData {
  articles: RevenueAttributionArticle[];
  totalConversions: number;
  totalAttributedRevenue: number;
  topConvertingArticleType: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row shapes returned from Supabase
// ─────────────────────────────────────────────────────────────────────────────

interface TouchRow {
  article_id: string;
  subscriber_id: string;
  articles: {
    id: string;
    title: string;
    is_paywalled: boolean | null;
    article_type: string | null;
  } | null;
  subscribers: {
    id: string;
    subscription_plans: {
      price_monthly: number | null;
    } | null;
  } | null;
}

interface ReadRow {
  article_id: string;
  scroll_depth: number | null;
  read_through: boolean | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId") ?? undefined;

  const supabase = await createClient();

  try {
    // ── 1. Fetch conversion touches ──────────────────────────────────────────
    // Gracefully handle the case where the table does not yet exist.
    let touchQuery = supabase
      .from("conversion_touches")
      .select(
        "article_id, subscriber_id, articles!article_id(id, title, is_paywalled, article_type), subscribers!subscriber_id(id, subscription_plans!plan_id(price_monthly))"
      );

    if (articleId) {
      touchQuery = touchQuery.eq("article_id", articleId);
    }

    const { data: touchData, error: touchError } = await touchQuery;

    // Table might not exist yet — return empty gracefully
    if (touchError) {
      // Check for "relation does not exist" (code 42P01) or similar
      const isTableMissing =
        touchError.message?.includes("does not exist") ||
        touchError.code === "42P01" ||
        touchError.code === "PGRST116";

      if (isTableMissing) {
        const empty: RevenueAttributionData = {
          articles: [],
          totalConversions: 0,
          totalAttributedRevenue: 0,
          topConvertingArticleType: null,
        };
        return NextResponse.json<ApiResponse<RevenueAttributionData>>({
          data: empty,
        });
      }

      throw touchError;
    }

    const touches = (touchData ?? []) as TouchRow[];

    // ── 2. Aggregate per-article: conversions + revenue ──────────────────────
    interface ArticleAgg {
      title: string;
      isPaywalled: boolean;
      articleType: string | null;
      subscriberIds: Set<string>;
      revenue: number;
    }

    const articleAgg: Record<string, ArticleAgg> = {};

    for (const row of touches) {
      const aid = row.article_id;
      const article = row.articles;
      const subscriber = row.subscribers;
      if (!article) continue;

      if (!articleAgg[aid]) {
        articleAgg[aid] = {
          title: article.title ?? aid,
          isPaywalled: article.is_paywalled ?? false,
          articleType: article.article_type ?? null,
          subscriberIds: new Set(),
          revenue: 0,
        };
      }

      const sid = row.subscriber_id;
      if (sid && !articleAgg[aid].subscriberIds.has(sid)) {
        articleAgg[aid].subscriberIds.add(sid);
        const planPrice =
          subscriber?.subscription_plans?.price_monthly ?? 0;
        articleAgg[aid].revenue += Number(planPrice);
      }
    }

    // ── 3. Fetch article_reads for scroll/read-through analytics ────────────
    const articleIds = Object.keys(articleAgg);

    let readRows: ReadRow[] = [];
    if (articleIds.length > 0) {
      const { data: readData } = await supabase
        .from("article_reads")
        .select("article_id, scroll_depth, read_through")
        .in("article_id", articleIds) as { data: ReadRow[] | null };

      readRows = readData ?? [];
    }

    // Aggregate read metrics per article
    interface ReadAgg {
      totalScroll: number;
      readThroughCount: number;
      readCount: number;
    }
    const readAgg: Record<string, ReadAgg> = {};

    for (const row of readRows) {
      const aid = row.article_id;
      if (!readAgg[aid]) {
        readAgg[aid] = { totalScroll: 0, readThroughCount: 0, readCount: 0 };
      }
      readAgg[aid].readCount++;
      readAgg[aid].totalScroll += Number(row.scroll_depth ?? 0);
      if (row.read_through) readAgg[aid].readThroughCount++;
    }

    // ── 4. Build result array ─────────────────────────────────────────────────
    const articles: RevenueAttributionArticle[] = Object.entries(articleAgg)
      .map(([aid, agg]) => {
        const reads = readAgg[aid];
        const avgScrollDepth =
          reads && reads.readCount > 0
            ? Math.round(reads.totalScroll / reads.readCount)
            : 0;
        const readThroughRate =
          reads && reads.readCount > 0
            ? Math.round((reads.readThroughCount / reads.readCount) * 100)
            : 0;

        return {
          articleId: aid,
          title: agg.title,
          conversionCount: agg.subscriberIds.size,
          estimatedRevenue: Math.round(agg.revenue * 100) / 100,
          avgScrollDepth,
          readThroughRate,
          isPaywalled: agg.isPaywalled,
          articleType: agg.articleType,
        };
      })
      .sort((a, b) => b.conversionCount - a.conversionCount);

    // ── 5. Overall stats ──────────────────────────────────────────────────────
    const totalConversions = articles.reduce(
      (s, a) => s + a.conversionCount,
      0
    );
    const totalAttributedRevenue =
      Math.round(
        articles.reduce((s, a) => s + a.estimatedRevenue, 0) * 100
      ) / 100;

    // Most common article type among top converting articles
    const typeCount: Record<string, number> = {};
    for (const a of articles) {
      if (a.articleType) {
        typeCount[a.articleType] =
          (typeCount[a.articleType] ?? 0) + a.conversionCount;
      }
    }
    const topConvertingArticleType =
      Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const result: RevenueAttributionData = {
      articles,
      totalConversions,
      totalAttributedRevenue,
      topConvertingArticleType,
    };

    return NextResponse.json<ApiResponse<RevenueAttributionData>>({
      data: result,
    });
  } catch (err) {
    console.error("[revenue-attribution] error:", err);
    return NextResponse.json<ApiResponse<RevenueAttributionData>>(
      { error: "Failed to fetch revenue attribution data" },
      { status: 500 }
    );
  }
}
