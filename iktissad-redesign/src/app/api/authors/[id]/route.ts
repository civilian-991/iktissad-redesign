import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

/**
 * Public author info endpoint.
 *
 * Returns only safe, public-facing fields about a CMS user (author):
 *   { id, slug, name, avatar, role, articleCount }
 *
 * Accepts either a UUID or a slug as the `id` route param.
 *
 * Unlike `/api/users/[id]` (admin-only), this endpoint requires no auth and
 * is intended for the public `/authors/[id]` page.
 */
export interface PublicAuthor {
  id: string;
  slug: string | null;
  name: string;
  avatar: string;
  role: "admin" | "editor" | "author" | "contributor";
  articleCount: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin
    .from("users") as any)
    .select("id, slug, name, avatar, role, article_count, status")
    .eq(isUuid ? "id" : "slug", id)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Author not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Hide suspended/inactive authors from the public surface
  if (row.status && row.status !== "active") {
    return NextResponse.json(
      { error: "Author not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const author: PublicAuthor = {
    id: row.id,
    slug: row.slug ?? null,
    name: row.name,
    avatar: row.avatar ?? "",
    role: row.role,
    articleCount: row.article_count ?? 0,
  };

  return NextResponse.json({ data: author } satisfies ApiResponse<PublicAuthor>);
}
