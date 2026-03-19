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
    status: row.status ?? 'active',
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    articleCount: row.article_count ?? row.series_articles?.length ?? undefined,
  };
}

// ─── GET /api/series — list all series ───────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("article_series")
    .select(
      `*, series_articles(count)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const start = (page - 1) * pageSize;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, count, error } = await (query as any).range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: ArticleSeries[] = (rows ?? []).map((r: any) => {
    const mapped = mapSeriesRow(r);
    // Supabase returns count join as [{count: "N"}]
    const countArr = r.series_articles;
    if (Array.isArray(countArr) && countArr.length > 0 && countArr[0].count !== undefined) {
      mapped.articleCount = parseInt(String(countArr[0].count), 10);
    }
    return mapped;
  });

  const total = count ?? 0;
  const response: ApiResponse<ArticleSeries[]> = {
    data: series,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/series — create a series ──────────────────────────────────────

const createSeriesSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1),
  titleEn: z.string().optional().default(""),
  description: z.string().optional().default(""),
  descriptionEn: z.string().optional().default(""),
  coverImage: z.string().optional().default(""),
  status: z.enum(["active", "archived"]).optional().default("active"),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("article_series")
    .insert({
      slug: data.slug,
      title: data.title,
      title_en: data.titleEn || null,
      description: data.description || null,
      description_en: data.descriptionEn || null,
      cover_image: data.coverImage || null,
      status: data.status,
      created_by: auth.userId ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: error.code === "23505" ? 409 : 500 }
    );
  }

  const response: ApiResponse<ArticleSeries> = { data: mapSeriesRow(row) };
  return NextResponse.json(response, { status: 201 });
}
