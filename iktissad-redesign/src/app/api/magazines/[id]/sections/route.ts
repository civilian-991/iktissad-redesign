import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

export interface MagazineSection {
  id: string;
  issueId: string;
  slug: string;
  name: string;
  nameEn: string;
  sortOrder: number;
  themeColor: string;
  coverImage: string;
  createdAt: string;
  articleCount?: number;
}

function mapSectionRow(row: Record<string, unknown>): MagazineSection {
  return {
    id: row.id as string,
    issueId: row.issue_id as string,
    slug: row.slug as string,
    name: row.name as string,
    nameEn: (row.name_en as string) ?? "",
    sortOrder: (row.sort_order as number) ?? 0,
    themeColor: (row.theme_color as string) ?? "#DDA853",
    coverImage: (row.cover_image as string) ?? "",
    createdAt: row.created_at as string,
  };
}

// GET /api/magazines/[id]/sections — list all sections for an issue
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("magazine_sections")
    .select("*")
    .eq("issue_id", id)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Get article counts per section
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: articleLinks } = await (supabase as any)
    .from("magazine_articles")
    .select("section_id")
    .eq("magazine_id", id);

  const countMap: Record<string, number> = {};
  if (articleLinks) {
    for (const link of articleLinks as Array<{ section_id: string | null }>) {
      if (link.section_id) {
        countMap[link.section_id] = (countMap[link.section_id] ?? 0) + 1;
      }
    }
  }

  const sections: MagazineSection[] = (rows ?? []).map((row: Record<string, unknown>) => ({
    ...mapSectionRow(row),
    articleCount: countMap[row.id as string] ?? 0,
  }));

  const response: ApiResponse<MagazineSection[]> = { data: sections };
  return NextResponse.json(response);
}

const createSectionSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional().default(""),
  slug: z.string().optional(),
  themeColor: z.string().optional().default("#DDA853"),
  sortOrder: z.number().int().optional().default(0),
});

// POST /api/magazines/[id]/sections — create a new section
export async function POST(
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

  const parsed = createSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // Auto-generate slug from name if not provided
  const slug =
    data.slug ||
    data.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0600-\u06ff-]/g, "")
      .slice(0, 64);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("magazine_sections")
    .insert({
      issue_id: id,
      slug,
      name: data.name,
      name_en: data.nameEn,
      theme_color: data.themeColor,
      sort_order: data.sortOrder,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const response: ApiResponse<MagazineSection> = { data: mapSectionRow(row) };
  return NextResponse.json(response, { status: 201 });
}
