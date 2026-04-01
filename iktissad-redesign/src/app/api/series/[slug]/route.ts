import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse, ArticleSeries } from "@/types";

// ─── Mapper ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSeriesRow(row: any): ArticleSeries {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleEn: row.title_en ?? undefined,
    description: row.description ?? undefined,
    descriptionEn: row.description_en ?? undefined,
    coverImage: row.cover_image ?? undefined,
    status: row.status ?? "active",
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    articleCount: row.series_articles?.length ?? undefined,
  };
}

// ─── GET /api/series/[slug] ───────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("article_series")
    .select(`
      *,
      series_articles(
        id, order_index, added_at,
        articles(id, slug, title, excerpt, featured_image, published_at, status)
      )
    `)
    .eq("slug", slug)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Series not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const series = mapSeriesRow(row);
  if (Array.isArray(row.series_articles)) {
    const sorted = [...row.series_articles].sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => a.order_index - b.order_index
    );
    series.articleCount = sorted.length;
    series.articles = sorted
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((sa: any) => sa.articles?.status === "published")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((sa: any) => ({
        id: sa.articles?.id ?? sa.article_id,
        title: sa.articles?.title ?? "",
        slug: sa.articles?.slug,
        excerpt: sa.articles?.excerpt,
        featuredImage: sa.articles?.featured_image,
        publishedAt: sa.articles?.published_at,
        orderIndex: sa.order_index,
      }));
  }

  return NextResponse.json({ data: series } satisfies ApiResponse<ArticleSeries>);
}

// ─── PATCH /api/series/[slug] — update metadata ───────────────────────────────

const patchSeriesSchema = z.object({
  title: z.string().min(1).optional(),
  titleEn: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  coverImage: z.string().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = patchSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // Build update payload — only include provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.titleEn !== undefined) updates.title_en = data.titleEn;
  if (data.description !== undefined) updates.description = data.description;
  if (data.descriptionEn !== undefined) updates.description_en = data.descriptionEn;
  if (data.coverImage !== undefined) updates.cover_image = data.coverImage;
  if (data.status !== undefined) updates.status = data.status;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("article_series")
    .update(updates)
    .eq("slug", slug)
    .select()
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Series not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json({ data: mapSeriesRow(row) } satisfies ApiResponse<ArticleSeries>);
}

// ─── DELETE /api/series/[slug] ────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { slug } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("article_series")
    .delete()
    .eq("slug", slug);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deleted: true } } satisfies ApiResponse<{ deleted: boolean }>);
}
