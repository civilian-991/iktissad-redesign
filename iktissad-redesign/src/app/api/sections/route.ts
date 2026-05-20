import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireRole,
  unauthorizedResponse,
  csrfForbiddenResponse,
  forbiddenResponse,
} from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapSectionRow } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/slugify";
import type { ApiResponse, Section } from "@/types";

export async function GET() {
  const supabase = await createClient();

  // Use a server-side RPC to COUNT in SQL — avoids the 1000-row PostgREST
  // client cap that would silently truncate counts for large sections.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any).rpc("get_sections_with_counts");

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: Section[] = (rows ?? []).map((row: any) =>
    mapSectionRow(row, Number(row.article_count ?? 0))
  );

  const response: ApiResponse<Section[]> = {
    data: sections,
    pagination: {
      page: 1,
      pageSize: 50,
      total: sections.length,
      totalPages: 1,
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/sections ──────────────────────────────────────────────────────

const createSectionSchema = z.object({
  slug: z.string().optional(),
  name: z.string().min(1, "name is required"),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

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

  const d = parsed.data;
  const slug = (d.slug && d.slug.trim()) ? slugify(d.slug) : slugify(d.name);
  if (!slug) {
    return NextResponse.json(
      { error: "Could not derive slug from name" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("sections")
    .insert({
      slug,
      name: d.name,
      name_en: d.nameEn ?? "",
      description: d.description ?? "",
      description_en: d.descriptionEn ?? "",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: mapSectionRow(row, 0) } satisfies ApiResponse<Section>,
    { status: 201 }
  );
}
