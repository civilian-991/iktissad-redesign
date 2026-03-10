import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";
import type { MagazineSection } from "../route";

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

// GET /api/magazines/[id]/sections/[sectionId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { sectionId } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("magazine_sections")
    .select("*")
    .eq("id", sectionId)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Section not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<MagazineSection> = { data: mapSectionRow(row) };
  return NextResponse.json(response);
}

const updateSectionSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  themeColor: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

// PUT /api/magazines/[id]/sections/[sectionId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { sectionId } = await params;
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

  const parsed = updateSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.nameEn !== undefined) updateData.name_en = data.nameEn;
  if (data.themeColor !== undefined) updateData.theme_color = data.themeColor;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("magazine_sections")
    .update(updateData)
    .eq("id", sectionId)
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Section not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  const response: ApiResponse<MagazineSection> = { data: mapSectionRow(row) };
  return NextResponse.json(response);
}

// DELETE /api/magazines/[id]/sections/[sectionId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { sectionId } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("magazine_sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deleted: true } });
}
