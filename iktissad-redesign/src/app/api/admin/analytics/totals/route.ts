/**
 * GET /api/admin/analytics/totals
 *
 * Aggregate site-wide totals for the admin dashboard:
 *  - totalViews: sum of `articles.views` (lifetime counter)
 *  - totalUniqueVisitors: distinct `article_reads.session_id` in window
 *  - totalArticles: count of published articles
 *
 * Query params:
 *  - window: "7d" | "30d" | "90d" | "all" (default "all")
 *
 * Tables: articles, article_reads
 * Auth: Required (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Response type ──────────────────────────────────────────────

export interface AnalyticsTotals {
  totalViews: number;
  totalUniqueVisitors: number;
  totalArticles: number;
  windowDays: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────

const WINDOW_DAYS: Record<string, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

function parseWindow(raw: string | null): { key: string; days: number | null } {
  const key = raw ?? "all";
  if (key in WINDOW_DAYS) return { key, days: WINDOW_DAYS[key] };
  return { key: "all", days: null };
}

// ─── GET ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const params = request.nextUrl.searchParams;
  const { days } = parseWindow(params.get("window"));

  const admin = createAdminClient();
  const since = days !== null
    ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  try {
    // Build the article-views query, optionally windowed by published_at.
    // For "all", we sum the lifetime `views` counter on every published article.
    // For a window, we restrict to articles published inside it (best-effort
    // proxy without a per-day-views table).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let viewsQuery: any = (admin as any)
      .from("articles")
      .select("views", { count: "exact" })
      .eq("status", "published");
    if (since) viewsQuery = viewsQuery.gte("published_at", since);

    // article_reads window for unique visitors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let visitorsQuery: any = (admin as any)
      .from("article_reads")
      .select("session_id")
      .limit(50000);
    if (since) visitorsQuery = visitorsQuery.gte("created_at", since);

    const [viewsResult, visitorsResult] = await Promise.all([
      viewsQuery,
      visitorsQuery,
    ]);

    if (viewsResult.error) {
      return NextResponse.json(
        { error: viewsResult.error.message } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    const totalArticles = viewsResult.count ?? 0;
    const totalViews = (viewsResult.data ?? []).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, row: any) => sum + (row.views ?? 0),
      0
    );

    // Unique visitors = distinct session_id (in-memory dedup; capped at 50k rows
    // above — sufficient for dashboard totals on this scale).
    const sessions = new Set<string>();
    for (const row of visitorsResult.data ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sid = (row as any).session_id;
      if (typeof sid === "string" && sid.length > 0) sessions.add(sid);
    }

    const result: AnalyticsTotals = {
      totalViews,
      totalUniqueVisitors: sessions.size,
      totalArticles,
      windowDays: days,
    };

    return NextResponse.json({ data: result } satisfies ApiResponse<AnalyticsTotals>);
  } catch (err) {
    console.error("[analytics-totals]", err);
    return NextResponse.json(
      { error: "Failed to compute analytics totals" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
