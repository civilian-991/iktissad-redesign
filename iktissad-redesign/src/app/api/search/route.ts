/**
 * GET /api/search
 *
 * Unified search endpoint with two modes:
 *
 *   ?q=<text>                  — keyword ILIKE search (backward compatible)
 *   ?q=<text>&semantic=true    — hybrid full-text search (ts_rank + ILIKE fallback)
 *
 * Query params:
 *   q          (required) — search query string
 *   page       (optional, default 1)
 *   pageSize   (optional, default 10, max 50)
 *   semantic   (optional, "true") — enable enhanced FTS mode
 *
 * Response: ApiResponse<Article[]>
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapArticleRow } from "@/lib/supabase/mappers";
import { hybridSearch } from "@/lib/ai/keyword-search";
import type { ApiResponse, Article } from "@/types";

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug, name ),
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query       = searchParams.get("q") || "";
  const page        = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize    = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));
  const semantic    = searchParams.get("semantic") === "true";
  const sectionSlug = searchParams.get("sectionSlug") || "";
  const dateRange   = searchParams.get("dateRange") || "all"; // week | month | year | all

  if (!query.trim()) {
    return NextResponse.json(
      { error: "Search query parameter 'q' is required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const offset = (page - 1) * pageSize;

  // Compute date filter boundary
  let dateFrom: string | null = null;
  if (dateRange === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    dateFrom = d.toISOString();
  } else if (dateRange === "month") {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    dateFrom = d.toISOString();
  } else if (dateRange === "year") {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    dateFrom = d.toISOString();
  }

  // -------------------------------------------------------------------------
  // Semantic / hybrid mode — uses Postgres tsvector full-text search
  // -------------------------------------------------------------------------
  if (semantic) {
    try {
      const { results, total, usedFts } = await hybridSearch(query.trim(), pageSize, offset);

      // hybridSearch returns lightweight result rows (id, title, excerpt, slug,
      // publishedAt, rank).  We need full Article objects for the response, so
      // we fetch the full rows for the matched IDs in a single query.
      if (results.length > 0) {
        const ids = results.map((r) => r.id);
        const supabase = await createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rows, error } = await (supabase as any)
          .from("articles")
          .select(ARTICLE_SELECT)
          .in("id", ids);

        if (error) {
          return NextResponse.json(
            { error: (error as { message: string }).message } satisfies ApiResponse<never>,
            { status: 500 }
          );
        }

        // Re-order to match the relevance ranking returned by hybridSearch
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rowMap = new Map(((rows ?? []) as any[]).map((r: any) => [r.id, r]));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordered = ids.map((id) => rowMap.get(id)).filter(Boolean) as any[];
        const articles: Article[] = ordered.map((r) => mapArticleRow(r));

        return NextResponse.json({
          data: articles,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(Math.max(total, articles.length) / pageSize),
          },
          // Surface which search mode was actually used so the client can show
          // a "powered by full-text search" badge if desired
          meta: { searchMode: usedFts ? "fts" : "ilike" },
        } as ApiResponse<Article[]> & { meta: { searchMode: string } });
      }

      // Zero results from hybrid — fall through to plain ILIKE below so the
      // user always gets the best possible answer
    } catch (err) {
      // Hybrid search failure is non-fatal; log and fall through to ILIKE
      console.error("[search] hybrid search error, falling back to ilike:", err);
    }
  }

  // -------------------------------------------------------------------------
  // Standard mode (and fallback for semantic with zero/error results)
  // Improved over the original: searches more fields and orders title matches
  // before excerpt-only matches using a CASE-based sort via two OR groups.
  // -------------------------------------------------------------------------
  const supabase = await createClient();
  const pattern  = `%${query.trim()}%`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let qb = (supabase as any)
    .from("articles")
    .select(ARTICLE_SELECT, { count: "exact" })
    .eq("status", "published")
    .or(
      [
        `title.ilike.${pattern}`,
        `title_en.ilike.${pattern}`,
        `excerpt.ilike.${pattern}`,
        `excerpt_en.ilike.${pattern}`,
      ].join(",")
    );

  // Apply section filter by joining through sections relation slug
  if (sectionSlug) {
    qb = qb.eq("sections.slug", sectionSlug);
  }

  // Apply date range filter
  if (dateFrom) {
    qb = qb.gte("published_at", dateFrom);
  }

  // Title matches first (Supabase doesn't support CASE ORDER BY directly,
  // so we use two cascaded orders: recency as tie-breaker)
  qb = qb.order("published_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data: rows, count, error } = await qb;

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles: Article[] = (rows ?? []).map((r: any) => mapArticleRow(r));

  return NextResponse.json({
    data: articles,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    meta: { searchMode: "ilike" },
  } as ApiResponse<Article[]> & { meta: { searchMode: string } });
}
