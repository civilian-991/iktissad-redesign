/**
 * GET /api/search/similar?articleId=<uuid>&limit=<n>
 *
 * Returns articles similar to the given article, ranked by section/sector
 * overlap and full-text similarity.  Used by the "More like this" widget
 * on article pages and in the admin editor sidebar.
 *
 * Query params:
 *   articleId  (required) — UUID of the source article
 *   limit      (optional, default 5, max 20)
 *
 * Response: ApiResponse<SimilarArticle[]>
 *
 * This endpoint is public (no auth required) so it can be called from
 * the reader-facing site.  Rate limiting is handled at the edge layer.
 */

import { NextRequest, NextResponse } from "next/server";
import { findSimilarArticles, type SimilarArticle } from "@/lib/ai/keyword-search";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const articleId = searchParams.get("articleId") ?? "";
  const limitRaw  = parseInt(searchParams.get("limit") ?? "5", 10);

  if (!articleId.trim()) {
    return NextResponse.json(
      { error: "articleId query parameter is required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  // Basic UUID format check (prevents obviously malformed inputs reaching the DB)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(articleId.trim())) {
    return NextResponse.json(
      { error: "articleId must be a valid UUID" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const limit = Number.isNaN(limitRaw) ? 5 : Math.min(Math.max(limitRaw, 1), 20);

  try {
    const articles: SimilarArticle[] = await findSimilarArticles(articleId.trim(), limit);

    return NextResponse.json(
      {
        data: articles,
        pagination: {
          page: 1,
          pageSize: limit,
          total: articles.length,
          totalPages: 1,
        },
      } satisfies ApiResponse<SimilarArticle[]>
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch similar articles";
    console.error("[search/similar]", message);
    return NextResponse.json(
      { error: message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
