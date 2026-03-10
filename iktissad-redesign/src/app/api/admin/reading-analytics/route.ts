/**
 * Admin Reading Analytics API
 * GET /api/admin/reading-analytics
 *
 * Returns top articles, subscriber vs anonymous reads,
 * section performance, and spread dwell times.
 * Supports ?from=&to= date range filtering.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

export interface ReadingAnalytics {
  topArticles: {
    articleId: string;
    title: string;
    reads: number;
    avgTimeOnPage: number;
    avgScrollDepth: number;
    readThroughRate: number;
  }[];
  subscriberVsAnon: {
    subscriber: number;
    anonymous: number;
  };
  sectionPerformance: {
    sectionSlug: string;
    sectionName: string;
    totalReads: number;
    avgScrollDepth: number;
  }[];
  spreadDwell: {
    spreadNumber: number;
    avgDwellSeconds: number;
  }[];
  /** Present when ?articleId= is specified — per-article detail */
  articleDetail?: {
    articleId: string;
    totalReads: number;
    avgTimeOnPage: number;
    avgScrollDepth: number;
    readThroughRate: number;
    subscriberReads: number;
    anonymousReads: number;
    /** Reads by day for last 7 days: { date: 'YYYY-MM-DD', reads: number }[] */
    readsByDay: { date: string; reads: number }[];
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const articleId = searchParams.get("articleId");

  const supabase = createAdminClient();

  try {
    // Build base query with optional date range
    const applyDateRange = <T extends ReturnType<typeof supabase.from>>(q: T): T => {
      let q2 = q as unknown as ReturnType<typeof supabase.from>;
      if (from) q2 = q2.gte("created_at", from);
      if (to) q2 = q2.lte("created_at", to);
      return q2 as T;
    };

    // Top articles: group by article_id
    const { data: rawReads } = await applyDateRange(
      supabase
        .from("article_reads")
        .select("article_id, time_on_page, scroll_depth, read_through, subscriber_id")
    ) as { data: Array<{
      article_id: string;
      time_on_page: number;
      scroll_depth: number;
      read_through: boolean;
      subscriber_id: string | null;
    }> | null };

    // Aggregate top articles
    const articleMap: Record<string, {
      reads: number;
      totalTime: number;
      totalScroll: number;
      readThroughCount: number;
    }> = {};

    let subscriberCount = 0;
    let anonCount = 0;

    for (const row of rawReads ?? []) {
      const aid = row.article_id;
      if (!articleMap[aid]) {
        articleMap[aid] = { reads: 0, totalTime: 0, totalScroll: 0, readThroughCount: 0 };
      }
      articleMap[aid].reads++;
      articleMap[aid].totalTime += row.time_on_page ?? 0;
      articleMap[aid].totalScroll += Number(row.scroll_depth ?? 0);
      if (row.read_through) articleMap[aid].readThroughCount++;

      if (row.subscriber_id) subscriberCount++;
      else anonCount++;
    }

    // Sort by reads descending, take top 20
    const topArticleIds = Object.entries(articleMap)
      .sort((a, b) => b[1].reads - a[1].reads)
      .slice(0, 20)
      .map(([id]) => id);

    // Fetch article titles
    let topArticles: ReadingAnalytics["topArticles"] = [];
    if (topArticleIds.length > 0) {
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title")
        .in("id", topArticleIds) as { data: Array<{ id: string; title: string }> | null };

      const titleMap: Record<string, string> = {};
      for (const a of articles ?? []) titleMap[a.id] = a.title;

      topArticles = topArticleIds.map((id) => {
        const stats = articleMap[id];
        return {
          articleId: id,
          title: titleMap[id] ?? id,
          reads: stats.reads,
          avgTimeOnPage: stats.reads > 0 ? Math.round(stats.totalTime / stats.reads) : 0,
          avgScrollDepth: stats.reads > 0 ? Math.round(stats.totalScroll / stats.reads) : 0,
          readThroughRate: stats.reads > 0 ? Math.round((stats.readThroughCount / stats.reads) * 100) : 0,
        };
      });
    }

    // Section performance
    const { data: sectionReads } = await applyDateRange(
      supabase
        .from("article_reads")
        .select("scroll_depth, articles!article_id(section_id, sections!section_id(slug, name))")
    ) as { data: Array<{
      scroll_depth: number;
      articles: { section_id: string | null; sections: { slug: string; name: string } | null } | null;
    }> | null };

    const sectionMap: Record<string, {
      slug: string;
      name: string;
      totalReads: number;
      totalScroll: number;
    }> = {};

    for (const row of sectionReads ?? []) {
      const sec = row.articles?.sections;
      if (!sec) continue;
      if (!sectionMap[sec.slug]) {
        sectionMap[sec.slug] = { slug: sec.slug, name: sec.name, totalReads: 0, totalScroll: 0 };
      }
      sectionMap[sec.slug].totalReads++;
      sectionMap[sec.slug].totalScroll += Number(row.scroll_depth ?? 0);
    }

    const sectionPerformance = Object.values(sectionMap)
      .sort((a, b) => b.totalReads - a.totalReads)
      .map((s) => ({
        sectionSlug: s.slug,
        sectionName: s.name,
        totalReads: s.totalReads,
        avgScrollDepth: s.totalReads > 0 ? Math.round(s.totalScroll / s.totalReads) : 0,
      }));

    // Spread dwell times
    const { data: spreadRows } = await applyDateRange(
      supabase
        .from("magazine_spread_reads")
        .select("spread_number, dwell_seconds")
    ) as { data: Array<{ spread_number: number; dwell_seconds: number }> | null };

    const spreadMap: Record<number, { total: number; count: number }> = {};
    for (const row of spreadRows ?? []) {
      const sn = row.spread_number;
      if (!spreadMap[sn]) spreadMap[sn] = { total: 0, count: 0 };
      spreadMap[sn].total += row.dwell_seconds ?? 0;
      spreadMap[sn].count++;
    }

    const spreadDwell = Object.entries(spreadMap)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([sn, v]) => ({
        spreadNumber: Number(sn),
        avgDwellSeconds: v.count > 0 ? Math.round(v.total / v.count) : 0,
      }));

    // ── Per-article detail (when ?articleId= is provided) ──
    let articleDetail: ReadingAnalytics["articleDetail"] | undefined;
    if (articleId) {
      // Fetch all reads for this specific article
      let q = supabase
        .from("article_reads")
        .select("time_on_page, scroll_depth, read_through, subscriber_id, created_at")
        .eq("article_id", articleId) as unknown as ReturnType<typeof supabase.from>;
      if (from) q = (q as any).gte("created_at", from);
      if (to) q = (q as any).lte("created_at", to);
      const { data: artReads } = await q as unknown as {
        data: Array<{
          time_on_page: number;
          scroll_depth: number;
          read_through: boolean;
          subscriber_id: string | null;
          created_at: string;
        }> | null
      };

      const rows = artReads ?? [];
      const totalReads = rows.length;
      const totalTime = rows.reduce((s, r) => s + (r.time_on_page ?? 0), 0);
      const totalScroll = rows.reduce((s, r) => s + Number(r.scroll_depth ?? 0), 0);
      const readThroughCount = rows.filter((r) => r.read_through).length;
      const subscriberReads = rows.filter((r) => r.subscriber_id).length;

      // Reads by day — last 7 days
      const now = new Date();
      const dayMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
      for (const row of rows) {
        const day = row.created_at?.slice(0, 10);
        if (day && dayMap[day] !== undefined) dayMap[day]++;
      }

      articleDetail = {
        articleId,
        totalReads,
        avgTimeOnPage: totalReads > 0 ? Math.round(totalTime / totalReads) : 0,
        avgScrollDepth: totalReads > 0 ? Math.round(totalScroll / totalReads) : 0,
        readThroughRate: totalReads > 0 ? Math.round((readThroughCount / totalReads) * 100) : 0,
        subscriberReads,
        anonymousReads: totalReads - subscriberReads,
        readsByDay: Object.entries(dayMap).map(([date, reads]) => ({ date, reads })),
      };
    }

    const analytics: ReadingAnalytics = {
      topArticles,
      subscriberVsAnon: { subscriber: subscriberCount, anonymous: anonCount },
      sectionPerformance,
      spreadDwell,
      ...(articleDetail ? { articleDetail } : {}),
    };

    return NextResponse.json<ApiResponse<ReadingAnalytics>>({
      data: analytics,
    });
  } catch (err) {
    console.error("[reading-analytics] error:", err);
    return NextResponse.json<ApiResponse<ReadingAnalytics>>(
      { error: "Failed to fetch reading analytics" },
      { status: 500 }
    );
  }
}
