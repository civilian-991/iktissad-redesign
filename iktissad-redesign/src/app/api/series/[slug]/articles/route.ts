import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse, SeriesArticle } from "@/types";

// ─── Mapper ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSeriesArticleRow(row: any): SeriesArticle {
  return {
    id: row.id,
    seriesId: row.series_id,
    articleId: row.article_id,
    orderIndex: row.order_index,
    addedAt: row.added_at,
    article: row.articles
      ? {
          id: row.articles.id,
          title: row.articles.title,
          slug: row.articles.slug,
          publishedAt: row.articles.published_at ?? undefined,
          excerpt: row.articles.excerpt ?? undefined,
        }
      : undefined,
  };
}

// ─── GET /api/series/[slug]/articles ─────────────────────────────────────────
// Returns all articles in reading order.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // Resolve series id from slug first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: series, error: seriesError } = await (supabase as any)
    .from("article_series")
    .select("id")
    .eq("slug", slug)
    .single();

  if (seriesError || !series) {
    return NextResponse.json(
      { error: "Series not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("series_articles")
    .select(`
      *,
      articles ( id, title, slug, excerpt, published_at )
    `)
    .eq("series_id", series.id)
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: SeriesArticle[] = (rows ?? []).map((r: any) => mapSeriesArticleRow(r));
  return NextResponse.json({ data: items } satisfies ApiResponse<SeriesArticle[]>);
}

// ─── POST /api/series/[slug]/articles — add an article to the series ─────────

const addArticleSchema = z.object({
  articleId: z.string().uuid(),
  orderIndex: z.number().int().min(0).optional(),
});

export async function POST(
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

  const parsed = addArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Resolve series id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: series, error: seriesError } = await (admin as any)
    .from("article_series")
    .select("id")
    .eq("slug", slug)
    .single();

  if (seriesError || !series) {
    return NextResponse.json(
      { error: "Series not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Determine next order_index if not supplied
  let orderIndex = parsed.data.orderIndex;
  if (orderIndex === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (admin as any)
      .from("series_articles")
      .select("*", { count: "exact", head: true })
      .eq("series_id", series.id);
    orderIndex = count ?? 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("series_articles")
    .insert({
      series_id: series.id,
      article_id: parsed.data.articleId,
      order_index: orderIndex,
    })
    .select(`*, articles ( id, title, slug, excerpt, published_at )`)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: error.code === "23505" ? 409 : 500 }
    );
  }

  return NextResponse.json(
    { data: mapSeriesArticleRow(row) } satisfies ApiResponse<SeriesArticle>,
    { status: 201 }
  );
}

// ─── PATCH /api/series/[slug]/articles — reorder ─────────────────────────────
// Body: { order: [{ id: seriesArticleId, orderIndex: number }] }

const reorderSchema = z.object({
  order: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int().min(0),
    })
  ),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  // slug is used for auth scoping — verify series exists
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

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify series exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: series, error: seriesError } = await (admin as any)
    .from("article_series")
    .select("id")
    .eq("slug", slug)
    .single();

  if (seriesError || !series) {
    return NextResponse.json(
      { error: "Series not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Update each row — run sequentially to avoid race conditions
  for (const item of parsed.data.order) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("series_articles")
      .update({ order_index: item.orderIndex })
      .eq("id", item.id)
      .eq("series_id", series.id); // safety: only touch rows in this series
  }

  return NextResponse.json({ data: { reordered: true } } satisfies ApiResponse<{ reordered: boolean }>);
}

// ─── DELETE /api/series/[slug]/articles — remove article from series ──────────
// Query param: ?articleId=<uuid>  OR body: { seriesArticleId: uuid }

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { slug } = await params;
  const { searchParams } = request.nextUrl;
  const seriesArticleId = searchParams.get("seriesArticleId");

  if (!seriesArticleId) {
    return NextResponse.json(
      { error: "seriesArticleId query param is required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Resolve series id for safety scoping
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: series, error: seriesError } = await (admin as any)
    .from("article_series")
    .select("id")
    .eq("slug", slug)
    .single();

  if (seriesError || !series) {
    return NextResponse.json(
      { error: "Series not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("series_articles")
    .delete()
    .eq("id", seriesArticleId)
    .eq("series_id", series.id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deleted: true } } satisfies ApiResponse<{ deleted: boolean }>);
}
