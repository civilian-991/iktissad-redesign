import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapMagazineIssueRow } from "@/lib/supabase/mappers";
import type { ApiResponse, MagazineIssue } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const status = searchParams.get("status");
  const year = searchParams.get("year");

  const supabase = await createClient();

  let query = supabase
    .from("magazine_issues")
    .select(undefined, { count: "exact" });

  if (status) {
    query = query.eq("status", status as "published" | "draft" | "scheduled");
  }

  if (year) {
    const startOfYear = `${year}-01-01T00:00:00Z`;
    const endOfYear = `${year}-12-31T23:59:59Z`;
    query = query.gte("publish_date", startOfYear).lte("publish_date", endOfYear);
  }

  const start = (page - 1) * pageSize;
  const { data: rows, count, error } = await query
    .order("publish_date", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const magazines: MagazineIssue[] = (rows ?? []).map((r: any) => mapMagazineIssueRow(r));

  const response: ApiResponse<MagazineIssue[]> = {
    data: magazines,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

const createMagazineSchema = z.object({
  issueNumber: z.number().int().positive(),
  title: z.string().min(1),
  titleEn: z.string().optional().default(""),
  subtitle: z.string().optional().default(""),
  coverImage: z.string().optional().default(""),
  publishDate: z.string(),
  pdfUrl: z.string().optional().default(""),
  pages: z.number().int().optional().default(0),
  featured: z.boolean().optional().default(false),
  status: z.enum(["published", "draft", "scheduled"]).optional().default("draft"),
  highlights: z.array(z.string()).optional().default([]),
  pagesImages: z.array(z.string()).optional().default([]),
  pagesReady: z.boolean().optional().default(false),
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

  const parsed = createMagazineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("magazine_issues")
    .insert({
      issue_number: data.issueNumber,
      title: data.title,
      title_en: data.titleEn,
      subtitle: data.subtitle,
      cover_image: data.coverImage,
      publish_date: data.publishDate,
      pdf_url: data.pdfUrl,
      pages: data.pages,
      featured: data.featured,
      status: data.status,
      highlights: data.highlights,
      pages_images: data.pagesImages,
      pages_ready: data.pagesReady,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const response: ApiResponse<MagazineIssue> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: mapMagazineIssueRow(row as any),
  };
  return NextResponse.json(response, { status: 201 });
}
