import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapArticleRow } from "@/lib/supabase/mappers";
import { notifyIndexNow } from "@/lib/indexnow";
import { autoPostOnPublish } from "@/lib/social-posting";
import type { ApiResponse, Article } from "@/types";

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug, name ),
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
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
  void Promise.resolve(
    admin.from("articles").update({ views: (row.views ?? 0) + 1 }).eq("id", row.id)
  ).catch(console.error);

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
  /**
   * Rich article body. Accepts:
   * - string → legacy HTML, stored as-is in content column
   * - object/array → TipTap JSON or ArticleBlock[], stored as JSONB in body column
   */
  // Accepts string (legacy HTML) or object/array (TipTap JSON / ArticleBlock[])
   
  body: (z.any() as z.ZodType<string | Record<string, unknown> | unknown[]>).optional(),
  deck: z.string().optional(),
  deckEn: z.string().optional(),
  accentColor: z.string().optional(),
  featuredImage: z.string().optional(),
  sectionSlug: z.string().optional(),
  sectorSlug: z.string().optional(),
  countrySlug: z.string().optional(),
  authorId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["published", "draft", "review", "scheduled"]).optional(),
  publishedAt: z.string().nullable().optional(),
  /** Editorial article type — drives AI prompts and word count targets */
  article_type: z.enum(["news", "report", "analysis", "interview", "opinion"]).optional(),
  /** Focal point X (0–1) for smart image cropping */
  featuredImageFocalX: z.number().min(0).max(1).optional(),
  /** Focal point Y (0–1) for smart image cropping */
  featuredImageFocalY: z.number().min(0).max(1).optional(),
  featured: z.boolean().optional(),
  editorChoice: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
  paywalled: z.boolean().optional(),
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(320).optional(),
  ogImage: z.string().url().optional().or(z.literal('')),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
  noIndex: z.boolean().optional(),
  autoPost: z.boolean().optional(),
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
  if (data.deck !== undefined) updateData.deck = data.deck;
  if (data.deckEn !== undefined) updateData.deck_en = data.deckEn;
  if (data.accentColor !== undefined) updateData.accent_color = data.accentColor;
  if (data.article_type !== undefined) updateData.article_type = data.article_type;
  if (data.featuredImageFocalX !== undefined) updateData.featured_image_focal_x = data.featuredImageFocalX;
  if (data.featuredImageFocalY !== undefined) updateData.featured_image_focal_y = data.featuredImageFocalY;
  if (data.featured !== undefined) updateData.featured = data.featured;
  if (data.editorChoice !== undefined) updateData.editor_choice = data.editorChoice;
  if (data.isBreaking !== undefined) updateData.is_breaking = data.isBreaking;
  if (data.paywalled !== undefined) updateData.is_paywalled = data.paywalled;
  if (data.metaTitle !== undefined) updateData.meta_title = data.metaTitle || null;
  if (data.metaDescription !== undefined) updateData.meta_description = data.metaDescription || null;
  if (data.ogImage !== undefined) updateData.og_image = data.ogImage || null;
  if (data.canonicalUrl !== undefined) updateData.canonical_url = data.canonicalUrl || null;
  if (data.noIndex !== undefined) updateData.no_index = data.noIndex;
  if (data.autoPost !== undefined) updateData.auto_post = data.autoPost;

  // Handle body: string → legacy content column; object/array → JSONB body column
  if (data.body !== undefined) {
    if (typeof data.body === "string") {
      // Legacy HTML string — store in content for backward compat
      updateData.content = data.body;
    } else {
      // TipTap JSON or ArticleBlock[] — store as JSONB
      updateData.body = data.body;
    }
  }

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

  const article = mapArticleRow(row);

  // Notify search engines when an article is published or updated while published
  if (article.status === 'published' && article.slug) {
    void notifyIndexNow([article.slug]);
    // Bust ISR cache for this article page and listing pages
    revalidatePath(`/${article.slug}`);
    revalidatePath('/');
    revalidatePath('/articles');

    // Phase 10.3: Auto-post to social media when status transitions to published
    if (data.status === 'published') {
      void autoPostOnPublish(article.id).catch(console.error);
    }
  }

  const response: ApiResponse<Article> = { data: article };
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
