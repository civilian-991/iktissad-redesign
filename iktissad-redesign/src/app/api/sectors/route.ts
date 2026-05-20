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
import { mapSectorRow } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/slugify";
import type { ApiResponse, Sector } from "@/types";

export async function GET() {
  const supabase = await createClient();

  // Fetch sectors first, then count articles per sector using parallel HEAD
  // requests (count: 'exact', head: true). This avoids Supabase's server-side
  // 1000-row cap which breaks the previous approach of fetching all rows.
  const { data: rows, error } = await supabase
    .from("sectors")
    .select()
    .order("name", { ascending: true }) as { data: any[] | null; error: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // 16 parallel HEAD count queries — each is a single COUNT(*) with no rows returned
  const countEntries = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { count } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("sector_id", row.id)
        .eq("status", "published" as const);
      return [row.id, count ?? 0] as [string, number];
    })
  );
  const countMap = Object.fromEntries(countEntries);

  const sectors: Sector[] = (rows ?? [])
    .map((row) => mapSectorRow(row, countMap[row.id] ?? 0))
    .sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0));

  const response: ApiResponse<Sector[]> = {
    data: sectors,
    pagination: {
      page: 1,
      pageSize: 50,
      total: sectors.length,
      totalPages: 1,
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/sectors ───────────────────────────────────────────────────────

const createSectorSchema = z.object({
  slug: z.string().optional(),
  name: z.string().min(1, "name is required"),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
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

  const parsed = createSectorSchema.safeParse(body);
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
    .from("sectors")
    .insert({
      slug,
      name: d.name,
      name_en: d.nameEn ?? "",
      description: d.description ?? "",
      description_en: d.descriptionEn ?? "",
      icon: d.icon ?? "",
      color: d.color ?? "",
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
    { data: mapSectorRow(row, 0) } satisfies ApiResponse<Sector>,
    { status: 201 }
  );
}
