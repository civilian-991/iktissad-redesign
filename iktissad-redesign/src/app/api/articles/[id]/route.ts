import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapArticleRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Article } from "@/types";

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug ),
  sectors:sector_id ( slug ),
  countries:country_id ( slug )
`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Try lookup by UUID id first, then by slug
  let query = supabase.from("articles").select(ARTICLE_SELECT);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  query = isUuid ? query.eq("id", id) : query.eq("slug", id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await query.single() as { data: any; error: any };

  if (error || !row) {
    return NextResponse.json(
      { error: "Article not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Increment view count (fire-and-forget)
  const admin = createAdminClient();
  admin
    .from("articles")
    .update({ views: (row.views ?? 0) + 1 })
    .eq("id", row.id)
    .then();

  const response: ApiResponse<Article> = { data: mapArticleRow(row) };
  return NextResponse.json(response);
}

const updateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  titleEn: z.string().optional(),
  slug: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  excerptEn: z.string().optional(),
  content: z.string().optional(),
  contentEn: z.string().optional(),
  featuredImage: z.string().optional(),
  sectionSlug: z.string().optional(),
  sectorSlug: z.string().optional(),
  countrySlug: z.string().optional(),
  authorId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["published", "draft", "review", "scheduled"]).optional(),
  publishedAt: z.string().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
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

  const parsed = updateArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // Build update object (camelCase -> snake_case)
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.titleEn !== undefined) updateData.title_en = data.titleEn;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
  if (data.excerptEn !== undefined) updateData.excerpt_en = data.excerptEn;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.contentEn !== undefined) updateData.content_en = data.contentEn;
  if (data.featuredImage !== undefined) updateData.featured_image = data.featuredImage;
  if (data.authorId !== undefined) updateData.author_id = data.authorId;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.publishedAt !== undefined) updateData.published_at = data.publishedAt;

  if (data.sectionSlug !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sec } = await admin.from("sections").select("id").eq("slug", data.sectionSlug).single() as { data: any };
    updateData.section_id = sec?.id ?? null;
  }
  if (data.sectorSlug !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sec } = await admin.from("sectors").select("id").eq("slug", data.sectorSlug).single() as { data: any };
    updateData.sector_id = sec?.id ?? null;
  }
  if (data.countrySlug !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: c } = await admin.from("countries").select("id").eq("slug", data.countrySlug).single() as { data: any };
    updateData.country_id = c?.id ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("articles") as any)
    .update(updateData)
    .eq("id", id)
    .select(ARTICLE_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: "Article not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<Article> = { data: mapArticleRow(row) };
  return NextResponse.json(response);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const admin = createAdminClient();
  const { error } = await admin.from("articles").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { success: true } });
}
