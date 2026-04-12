/**
 * GET /api/admin/analytics/realtime
 *
 * Real-time editorial dashboard data:
 *  - Active readers (article_reads in last 5 minutes)
 *  - Trending articles (most reads in last 1 hour)
 *  - Top sections by traffic (last 1 hour)
 *  - Breaking news performance
 *
 * Tables: article_reads, reading_sessions, articles, sections
 * Auth: Required (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Response types ─────────────────────────────────────────────

export interface TrendingArticle {
  id: string;
  title: string;
  slug: string;
  sectionName: string | null;
  reads: number;
  isBreaking: boolean;
  publishedAt: string | null;
}

export interface TopSection {
  sectionId: string;
  name: string;
  reads: number;
}

export interface RealtimeAnalytics {
  activeReaders: number;
  trendingArticles: TrendingArticle[];
  topSections: TopSection[];
  breakingPerformance: TrendingArticle[];
  timestamp: string;
}

export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const admin = createAdminClient();
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  try {
    // Run all queries in parallel
    const [activeResult, trendingResult, breakingResult] = await Promise.all([
      // 1. Active readers: distinct sessions in last 5 min
      (admin as any)
        .from("article_reads")
        .select("session_id", { count: "exact", head: true })
        .gte("created_at", fiveMinAgo),

      // 2. Trending articles: top 10 by reads in last hour
      // We use reading_sessions (Phase 4) which has broader coverage,
      // fall back to article_reads if reading_sessions is empty
      (admin as any).rpc("get_trending_articles", {
        since_time: oneHourAgo,
        result_limit: 10,
      }).catch(() => null),

      // 3. Breaking news performance
      (admin as any)
        .from("articles")
        .select("id, title, slug, views, is_breaking, published_at, sections:section_id(name)")
        .eq("is_breaking", true)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(5),
    ]);

    // Active readers count (approximate via distinct session count)
    const activeReaders = activeResult?.count ?? 0;

    // If the RPC doesn't exist yet, fall back to a manual query
    let trendingArticles: TrendingArticle[] = [];
    let topSections: TopSection[] = [];

    if (trendingResult?.data && Array.isArray(trendingResult.data)) {
      trendingArticles = trendingResult.data.map((r: any) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        sectionName: r.section_name ?? null,
        reads: r.read_count ?? 0,
        isBreaking: r.is_breaking ?? false,
        publishedAt: r.published_at ?? null,
      }));
    } else {
      // Fallback: manual aggregation via article_reads
      const { data: recentReads } = await (admin as any)
        .from("article_reads")
        .select("article_id")
        .gte("created_at", oneHourAgo);

      if (recentReads && recentReads.length > 0) {
        // Count reads per article
        const counts: Record<string, number> = {};
        for (const r of recentReads) {
          counts[r.article_id] = (counts[r.article_id] || 0) + 1;
        }

        // Get top 10 article IDs
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        const topIds = sorted.map(([id]) => id);

        if (topIds.length > 0) {
          const { data: articles } = await (admin as any)
            .from("articles")
            .select("id, title, slug, is_breaking, published_at, sections:section_id(name)")
            .in("id", topIds);

          if (articles) {
            const articleMap = new Map(articles.map((a: any) => [a.id, a]));
            trendingArticles = sorted.map(([id, count]) => {
              const a = articleMap.get(id) as any;
              return {
                id,
                title: a?.title ?? "—",
                slug: a?.slug ?? "",
                sectionName: a?.sections?.name ?? null,
                reads: count,
                isBreaking: a?.is_breaking ?? false,
                publishedAt: a?.published_at ?? null,
              };
            });
          }
        }

        // Top sections: aggregate reads by section
        if (trendingArticles.length > 0) {
          const sectionCounts: Record<string, { name: string; reads: number }> = {};
          for (const a of trendingArticles) {
            const key = a.sectionName ?? "—";
            if (!sectionCounts[key]) sectionCounts[key] = { name: key, reads: 0 };
            sectionCounts[key].reads += a.reads;
          }
          topSections = Object.entries(sectionCounts)
            .map(([, v]) => ({ sectionId: "", name: v.name, reads: v.reads }))
            .sort((a, b) => b.reads - a.reads)
            .slice(0, 5);
        }
      }
    }

    // Breaking news performance
    const breakingPerformance: TrendingArticle[] = (breakingResult?.data ?? []).map(
      (a: any) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        sectionName: a.sections?.name ?? null,
        reads: a.views ?? 0,
        isBreaking: true,
        publishedAt: a.published_at ?? null,
      })
    );

    const result: RealtimeAnalytics = {
      activeReaders,
      trendingArticles,
      topSections,
      breakingPerformance,
      timestamp: now.toISOString(),
    };

    return NextResponse.json({ data: result } satisfies ApiResponse<RealtimeAnalytics>);
  } catch (err) {
    console.error("[realtime-analytics]", err);
    return NextResponse.json(
      { error: "Failed to fetch realtime analytics" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
