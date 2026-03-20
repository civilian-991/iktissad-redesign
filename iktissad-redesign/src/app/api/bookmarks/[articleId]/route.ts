import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

// ─── DELETE /api/bookmarks/[articleId] ──────────────────────────
// Remove a bookmark for the authenticated user.

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
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

  const { articleId } = await params;

  const { error } = await (supabase as any)
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("article_id", articleId);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { bookmarked: false } } satisfies ApiResponse<{ bookmarked: boolean }>
  );
}

// ─── GET /api/bookmarks/[articleId] ─────────────────────────────
// Check if a specific article is bookmarked by the current user.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { data: { bookmarked: false } } satisfies ApiResponse<{ bookmarked: boolean }>
    );
  }

  const { articleId } = await params;

  const { data, error } = await (supabase as any)
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("article_id", articleId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { bookmarked: !!data } } satisfies ApiResponse<{ bookmarked: boolean }>
  );
}
