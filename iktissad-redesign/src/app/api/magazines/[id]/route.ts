import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapMagazineIssueRow, mapArticleRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Article, MagazineIssue } from "@/types";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await supabase
    .from("magazine_issues")
    .select()
    .eq("id", id)
    .single() as { data: any; error: any };

  if (error || !row) {
    return NextResponse.json(
      { error: "Magazine issue not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Fetch linked articles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: links } = await supabase
    .from("magazine_articles")
    .select("article_id")
    .eq("magazine_id", id)
    .order("sort_order", { ascending: true }) as { data: Array<{ article_id: string }> | null };

  let articles: Article[] = [];
  if (links && links.length > 0) {
    const articleIds = links.map((l) => l.article_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: articleRows } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .in("id", articleIds) as { data: any[] | null };
    articles = (articleRows ?? []).map(mapArticleRow);
  }

  const response: ApiResponse<MagazineIssue> = {
    data: mapMagazineIssueRow(row, articles),
  };
  return NextResponse.json(response);
}

const updateMagazineSchema = z.object({
  issueNumber: z.number().int().positive().optional(),
  title: z.string().min(1).optional(),
  titleEn: z.string().optional(),
  subtitle: z.string().optional(),
  coverImage: z.string().optional(),
  publishDate: z.string().optional(),
  pdfUrl: z.string().optional(),
  pages: z.number().int().optional(),
  featured: z.boolean().optional(),
  status: z.enum(["published", "draft", "scheduled"]).optional(),
  highlights: z.array(z.string()).optional(),
  pagesImages: z.array(z.string()).optional(),
  pagesReady: z.boolean().optional(),
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

  const parsed = updateMagazineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (data.issueNumber !== undefined) updateData.issue_number = data.issueNumber;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.titleEn !== undefined) updateData.title_en = data.titleEn;
  if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
  if (data.coverImage !== undefined) updateData.cover_image = data.coverImage;
  if (data.publishDate !== undefined) updateData.publish_date = data.publishDate;
  if (data.pdfUrl !== undefined) updateData.pdf_url = data.pdfUrl;
  if (data.pages !== undefined) updateData.pages = data.pages;
  if (data.featured !== undefined) updateData.featured = data.featured;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.highlights !== undefined) updateData.highlights = data.highlights;
  if (data.pagesImages !== undefined) updateData.pages_images = data.pagesImages;
  if (data.pagesReady !== undefined) updateData.pages_ready = data.pagesReady;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("magazine_issues") as any)
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Magazine issue not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  const response: ApiResponse<MagazineIssue> = {
    data: mapMagazineIssueRow(row),
  };
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
  const { error } = await admin.from("magazine_issues").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { success: true } });
}
