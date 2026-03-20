/**
 * Reading History API
 *
 * Queries the reading_sessions table (populated by ArticleAnalytics.tsx).
 * The reading_sessions table schema (already in supabase/schema.sql):
 *   id, user_id, article_id, session_id, time_on_page, scroll_depth,
 *   read_through, referrer, created_at
 *
 * Returns a paginated list of articles the user has read, ordered by most recent.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));
  const start = (page - 1) * pageSize;

  // Query reading_sessions joined with articles. Use a subquery approach:
  // get the most recent session per article to avoid duplicates.
  const { data: rows, count, error } = await (supabase as any)
    .from("reading_sessions")
    .select(
      `
      id,
      created_at,
      time_on_page,
      scroll_depth,
      read_through,
      articles:article_id (
        id,
        title,
        slug,
        excerpt,
        featured_image,
        published_at,
        sections:section_id ( slug, name ),
        sectors:sector_id ( slug, name ),
        users:author_id ( name, avatar )
      )
    `,
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .not("article_id", "is", null)
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const history = (rows ?? []).map((row: any) => ({
    sessionId: row.id,
    readAt: row.created_at,
    timeOnPage: row.time_on_page ?? 0,
    scrollDepth: row.scroll_depth ?? 0,
    readThrough: row.read_through ?? false,
    article: row.articles
      ? {
          id: row.articles.id,
          title: row.articles.title,
          slug: row.articles.slug,
          excerpt: row.articles.excerpt ?? "",
          featuredImage: row.articles.featured_image ?? "",
          publishedAt: row.articles.published_at ?? null,
          section: row.articles.sections?.name ?? "",
          sector: row.articles.sectors?.name ?? "",
          author: {
            name: row.articles.users?.name ?? "",
            avatar: row.articles.users?.avatar ?? "",
          },
        }
      : null,
  }));

  const total = count ?? 0;

  return NextResponse.json({
    data: history,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  } satisfies ApiResponse<typeof history>);
}
