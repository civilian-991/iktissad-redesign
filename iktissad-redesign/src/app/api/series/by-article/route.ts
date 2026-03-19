import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

/**
 * GET /api/series/by-article?articleId=<uuid>
 *
 * Returns series navigation data for a given article:
 * - series title + slug
 * - current article's position (0-based index)
 * - total count
 * - prev / next article stubs (id, title, slug, orderIndex)
 *
 * Returns 404 if the article is not in any series.
 * Returns the first matching series if the article belongs to multiple.
 */

interface SeriesNavArticle {
  id: string;
  title: string;
  slug: string;
  orderIndex: number;
}

interface SeriesNavData {
  seriesTitle: string;
  seriesSlug: string;
  currentIndex: number;
  totalCount: number;
  prev: SeriesNavArticle | null;
  next: SeriesNavArticle | null;
  articles: SeriesNavArticle[];
}

export async function GET(request: NextRequest) {
  const articleId = request.nextUrl.searchParams.get("articleId");

  if (!articleId) {
    return NextResponse.json(
      { error: "articleId query param is required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Find which series this article belongs to (take the first one)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership, error: memberError } = await (supabase as any)
    .from("series_articles")
    .select("series_id, order_index, article_series(id, title, slug, status)")
    .eq("article_id", articleId)
    .limit(1)
    .single();

  if (memberError || !membership) {
    // Article is not in any series
    return NextResponse.json(
      { error: "Article not in any series" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const seriesId = membership.series_id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesMeta = (membership as any).article_series;

  // Fetch all articles in this series in order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error: rowsError } = await (supabase as any)
    .from("series_articles")
    .select("id, order_index, article_id, articles(id, title, slug)")
    .eq("series_id", seriesId)
    .order("order_index", { ascending: true });

  if (rowsError) {
    return NextResponse.json(
      { error: rowsError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allArticles: SeriesNavArticle[] = (rows ?? []).map((r: any) => ({
    id: r.article_id,
    title: r.articles?.title ?? "",
    slug: r.articles?.slug ?? "",
    orderIndex: r.order_index,
  }));

  const currentIdx = allArticles.findIndex(a => a.id === articleId);
  if (currentIdx === -1) {
    return NextResponse.json(
      { error: "Article not found in series" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const navData: SeriesNavData = {
    seriesTitle: seriesMeta?.title ?? "",
    seriesSlug: seriesMeta?.slug ?? "",
    currentIndex: currentIdx,
    totalCount: allArticles.length,
    prev: currentIdx > 0 ? allArticles[currentIdx - 1] : null,
    next: currentIdx < allArticles.length - 1 ? allArticles[currentIdx + 1] : null,
    articles: allArticles,
  };

  return NextResponse.json({ data: navData } satisfies ApiResponse<SeriesNavData>);
}
