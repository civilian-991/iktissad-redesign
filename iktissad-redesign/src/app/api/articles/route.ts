import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, unauthorizedResponse, csrfForbiddenResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapArticleRow } from "@/lib/supabase/mappers";
import { notifyIndexNow } from "@/lib/indexnow";
import { autoPostOnPublish } from "@/lib/social-posting";
import {
  publicReadLimit,
  authWriteLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse, Article } from "@/types";

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar, slug ),
  sections:section_id ( slug, name ),
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
`;

export async function GET(request: NextRequest) {
  // Rate limit: 200 reads/min per IP
  const ip = getClientIp(request);
  const rl = publicReadLimit(`articles:get:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const section = searchParams.get("section");
  const country = searchParams.get("country");
  const sector = searchParams.get("sector");
  const status = searchParams.get("status");
  const featured = searchParams.get("featured");
  const editorChoice = searchParams.get("editorChoice");
  // NOTE: `is_breaking` column must exist on the articles table.
  // If it does not yet exist, run: ALTER TABLE articles ADD COLUMN is_breaking BOOLEAN NOT NULL DEFAULT FALSE;
  const breaking = searchParams.get("breaking");
  const tag = searchParams.get("tag");
  const authorId = searchParams.get("authorId");
  const search = searchParams.get("search");

  const supabase = await createClient();

  // Resolve all slug → ID lookups in parallel instead of sequentially.
  // Previously each slug fired a separate sequential query; now all run
  // concurrently and we wait for all results before building the article query.
  const [sectionResult, countryResult, sectorResult] = await Promise.all([
    section
      ? supabase.from("sections").select("id").eq("slug", section).single()
      : Promise.resolve({ data: null }),
    country
      ? supabase.from("countries").select("id").eq("slug", country).single()
      : Promise.resolve({ data: null }),
    sector
      ? supabase.from("sectors").select("id").eq("slug", sector).single()
      : Promise.resolve({ data: null }),
  ]);

  let query = supabase
    .from("articles")
    .select(ARTICLE_SELECT, { count: "exact" });

  if (section && sectionResult.data) {
    query = query.eq("section_id", (sectionResult.data as { id: string }).id);
  }

  if (country && countryResult.data) {
    query = query.eq("country_id", (countryResult.data as { id: string }).id);
  }

  if (sector && sectorResult.data) {
    query = query.eq("sector_id", (sectorResult.data as { id: string }).id);
  }

  if (status) {
    query = query.eq("status", status as "published" | "draft" | "review" | "scheduled");
  }

  // Exclude archived articles by default (Phase 10.5)
  const includeArchived = searchParams.get("includeArchived") === "true";
  if (!includeArchived) {
    query = query.eq("archived", false);
  }

  if (featured !== null) {
    query = query.eq("featured", featured === "true");
  }

  if (editorChoice !== null) {
    query = query.eq("editor_choice", editorChoice === "true");
  }

  if (breaking !== null) {
    query = query.eq("is_breaking", breaking === "true");
  }

  if (tag) {
    // Filter articles whose tags array contains the given tag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).contains("tags", [tag]);
  }

  if (authorId) {
    query = query.eq("author_id", authorId);
  }

  if (search) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).ilike("title", `%${search}%`);
  }

  const start = (page - 1) * pageSize;
  const sortBy = searchParams.get("sortBy") ?? "date";
  const sortFeaturedFirst = searchParams.get("sortFeaturedFirst") === "true";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderedQuery: any = query;
  if (sortFeaturedFirst) {
    orderedQuery = orderedQuery.order("featured", { ascending: false });
  }
  if (sortBy === "views") {
    orderedQuery = orderedQuery
      .order("views", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false });
  } else if (sortBy === "title") {
    orderedQuery = orderedQuery.order("title", { ascending: true });
  } else if (sortBy === "updated") {
    // explicit opt-in for editors who want most-recently-modified
    orderedQuery = orderedQuery.order("updated_at", { ascending: false });
  } else {
    // default "date":
    //  - public traffic that asks for status=published: sort by published_at desc
    //  - admin/editor traffic (no status filter, or status=draft/review/scheduled): sort by
    //    updated_at desc so freshly-edited unpublished items aren't buried behind 34k published rows
    if (status === "published") {
      orderedQuery = orderedQuery
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at",   { ascending: false });
    } else {
      orderedQuery = orderedQuery
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });
    }
  }

  const { data: rows, count, error } = await orderedQuery.range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles: Article[] = (rows ?? []).map((r: any) => mapArticleRow(r));

  const response: ApiResponse<Article[]> = {
    data: articles,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

const createArticleSchema = z.object({
  title: z.string().min(1),
  titleEn: z.string().optional().default(""),
  slug: z.string().min(1),
  excerpt: z.string().optional().default(""),
  excerptEn: z.string().optional().default(""),
  content: z.string().optional().default(""),
  contentEn: z.string().optional().default(""),
   
  body: (z.any() as z.ZodType<string | Record<string, unknown> | unknown[]>).optional(),
  deck: z.string().optional(),
  deckEn: z.string().optional(),
  featuredImage: z.string().optional().default(""),
  featuredImageFocalX: z.number().min(0).max(1).optional(),
  featuredImageFocalY: z.number().min(0).max(1).optional(),
  sectionSlug: z.string().optional(),
  sectorSlug: z.string().optional(),
  countrySlug: z.string().optional(),
  authorId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(["published", "draft", "review", "scheduled"]).optional().default("draft"),
  publishedAt: z.string().optional(),
  featured: z.boolean().optional(),
  editorChoice: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
  paywalled: z.boolean().optional(),
  article_type: z.enum(["news", "report", "analysis", "interview", "opinion"]).optional(),
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(320).optional(),
  ogImage: z.string().url().optional().or(z.literal('')),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
  noIndex: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  // Rate limit: 60 writes/min per IP
  const ip = getClientIp(request);
  const rl = authWriteLimit(`articles:post:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const auth = await requireAuth(request);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // Resolve slugs to IDs
  let sectionId: string | null = null;
  let sectorId: string | null = null;
  let countryId: string | null = null;

  if (data.sectionSlug) {
    const { data: sec } = await admin.from("sections").select("id").eq("slug", data.sectionSlug).single();
    sectionId = (sec as { id: string } | null)?.id ?? null;
  }
  if (data.sectorSlug) {
    const { data: sec } = await admin.from("sectors").select("id").eq("slug", data.sectorSlug).single();
    sectorId = (sec as { id: string } | null)?.id ?? null;
  }
  if (data.countrySlug) {
    const { data: c } = await admin.from("countries").select("id").eq("slug", data.countrySlug).single();
    countryId = (c as { id: string } | null)?.id ?? null;
  }

  // Build insert — only include optional fields when provided so DB defaults apply
  const insertData: Record<string, unknown> = {
    title: data.title,
    title_en: data.titleEn,
    slug: data.slug,
    excerpt: data.excerpt,
    excerpt_en: data.excerptEn,
    content: data.content,
    content_en: data.contentEn,
    featured_image: data.featuredImage,
    section_id: sectionId,
    sector_id: sectorId,
    country_id: countryId,
    author_id: data.authorId ?? null,
    tags: data.tags,
    status: data.status,
    published_at: data.publishedAt ?? null,
  };
  if (data.deck !== undefined) insertData.deck = data.deck;
  if (data.deckEn !== undefined) insertData.deck_en = data.deckEn;
  if (data.body !== undefined) {
    if (typeof data.body === "string") insertData.content = data.body;
    else insertData.body = data.body;
  }
  if (data.featuredImageFocalX !== undefined) insertData.featured_image_focal_x = data.featuredImageFocalX;
  if (data.featuredImageFocalY !== undefined) insertData.featured_image_focal_y = data.featuredImageFocalY;
  if (data.featured !== undefined) insertData.featured = data.featured;
  if (data.editorChoice !== undefined) insertData.editor_choice = data.editorChoice;
  if (data.isBreaking !== undefined) insertData.is_breaking = data.isBreaking;
  if (data.paywalled !== undefined) insertData.is_paywalled = data.paywalled;
  if (data.article_type !== undefined) insertData.article_type = data.article_type;
  if (data.metaTitle !== undefined) insertData.meta_title = data.metaTitle || null;
  if (data.metaDescription !== undefined) insertData.meta_description = data.metaDescription || null;
  if (data.ogImage !== undefined) insertData.og_image = data.ogImage || null;
  if (data.canonicalUrl !== undefined) insertData.canonical_url = data.canonicalUrl || null;
  if (data.noIndex !== undefined) insertData.no_index = data.noIndex;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("articles") as any)
    .insert(insertData)
    .select(ARTICLE_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const article = mapArticleRow(row);

  // Notify search engines immediately when a new article is published
  if (article.status === 'published' && article.slug) {
    void notifyIndexNow([article.slug]);
    // Bust ISR cache for listing pages
    revalidatePath('/');
    revalidatePath('/articles');

    // Phase 6.1: Auto-trigger push notification for breaking news
    if (data.isBreaking) {
      void fetch(new URL('/api/admin/notifications/push/send', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') ?? '',
        },
        body: JSON.stringify({
          title: '🔴 ' + article.title,
          body: article.excerpt || article.title,
          url: `/${article.slug}`,
          articleId: article.id,
        }),
      }).catch(console.error);
    }

    // Phase 10.3: Auto-post to social media on publish
    void autoPostOnPublish(article.id).catch(console.error);
  }

  const response: ApiResponse<Article> = { data: article };
  return NextResponse.json(response, { status: 201 });
}
