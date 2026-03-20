import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapArticleRow } from "@/lib/supabase/mappers";
import { notifyIndexNow } from "@/lib/indexnow";
import type { ApiResponse, Article } from "@/types";

// ─── Rate-limit headers helper ───────────────────────────────────
// Values are stubbed for now. Replace with a real counter (e.g. Redis /
// Supabase Edge Functions) once you have per-user tracking in place.

const RATE_LIMIT = 100; // requests per 60-second window

function rateLimitHeaders(): HeadersInit {
  // Window resets at the top of the next minute
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = 60;
  const resetAt = Math.ceil(now / windowSeconds) * windowSeconds;

  // Stub: assume all slots are still available (replace with real counter)
  const remaining = RATE_LIMIT;

  return {
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetAt),
  };
}

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug, name ),
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
`;

export async function GET(request: NextRequest) {
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

  const start = (page - 1) * pageSize;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, count, error } = await (query as any)
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(start, start + pageSize - 1);

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

  return NextResponse.json(response, { headers: rateLimitHeaders() });
}

const createArticleSchema = z.object({
  title: z.string().min(1),
  titleEn: z.string().optional().default(""),
  slug: z.string().min(1),
  excerpt: z.string().optional().default(""),
  excerptEn: z.string().optional().default(""),
  content: z.string().optional().default(""),
  contentEn: z.string().optional().default(""),
  featuredImage: z.string().optional().default(""),
  sectionSlug: z.string().optional(),
  sectorSlug: z.string().optional(),
  countrySlug: z.string().optional(),
  authorId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(["published", "draft", "review", "scheduled"]).optional().default("draft"),
  publishedAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("articles") as any)
    .insert({
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
    })
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
  }

  const response: ApiResponse<Article> = { data: article };
  return NextResponse.json(response, { status: 201, headers: rateLimitHeaders() });
}
