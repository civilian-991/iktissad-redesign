/**
 * Bookmarks API
 *
 * Required DB migration (run in Supabase dashboard):
 *
 * CREATE TABLE bookmarks (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
 *   created_at timestamptz DEFAULT now(),
 *   UNIQUE(user_id, article_id)
 * );
 *
 * -- RLS policies
 * ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users can read own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
 * CREATE POLICY "Users can insert own bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
 * CREATE POLICY "Users can delete own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

// ─── GET /api/bookmarks?limit=N&page=N ──────────────────────────
// Returns the authenticated user's bookmarked articles.

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
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const start = (page - 1) * limit;

  const { data: rows, count, error } = await (supabase as any)
    .from("bookmarks")
    .select(
      `
      id,
      created_at,
      articles (
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
    .order("created_at", { ascending: false })
    .range(start, start + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Shape each row into a friendly structure
  const bookmarks = (rows ?? []).map((row: any) => ({
    bookmarkId: row.id,
    bookmarkedAt: row.created_at,
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
    data: bookmarks,
    pagination: {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  } satisfies ApiResponse<typeof bookmarks>);
}

// ─── POST /api/bookmarks ─────────────────────────────────────────
// Bookmark an article. Idempotent — returns bookmarked:true even if already exists.

export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { articleId } = body as { articleId?: string };
  if (!articleId || typeof articleId !== "string") {
    return NextResponse.json(
      { error: "articleId is required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { error } = await (supabase as any)
    .from("bookmarks")
    .insert({ user_id: user.id, article_id: articleId });

  // 23505 = unique_violation — already bookmarked, treat as success
  if (error && error.code !== "23505") {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { bookmarked: true } } satisfies ApiResponse<{ bookmarked: boolean }>);
}
