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
import { mapSectorRow, mapArticleRow } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/slugify";
import type { ApiResponse, Sector } from "@/types";

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug, name ),
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, parseInt(searchParams.get("page")     || "1",  10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "12", 10)));

  const supabase = await createClient();

   
  const { data: row, error } = await supabase
    .from("sectors")
    .select()
    .eq("slug", slug)
    .single() as { data: any; error: any };

  if (error || !row) {
    return NextResponse.json(
      { error: "Sector not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const offset = (page - 1) * pageSize;

  // Fetch article count and paginated articles in parallel
  const [countResult, articlesResult] = await Promise.all([
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("sector_id", row.id)
      .eq("status", "published" as const),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("articles")
      .select(ARTICLE_SELECT, { count: "exact" })
      .eq("sector_id", row.id)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalCount = (countResult as any).count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articleRows = (articlesResult.data ?? []) as any[];

  const sector = mapSectorRow(row, totalCount);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = articleRows.map((r: any) => mapArticleRow(r));

  const response: ApiResponse<Sector & { articles: typeof articles }> = {
    data: { ...sector, articles },
    pagination: {
      page,
      pageSize,
      total: totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
  return NextResponse.json(response);
}

// ─── PUT /api/sectors/[slug] — partial update ────────────────────────────────

const updateSectorSchema = z.object({
  slug: z.string().optional(),
  name: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = updateSectorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const d = parsed.data;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("sectors")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Sector not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (d.slug !== undefined) {
    const newSlug = slugify(d.slug);
    if (!newSlug) {
      return NextResponse.json(
        { error: "Invalid slug" } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }
    updates.slug = newSlug;
  }
  if (d.name !== undefined) updates.name = d.name;
  if (d.nameEn !== undefined) updates.name_en = d.nameEn;
  if (d.description !== undefined) updates.description = d.description;
  if (d.descriptionEn !== undefined) updates.description_en = d.descriptionEn;
  if (d.icon !== undefined) updates.icon = d.icon;
  if (d.color !== undefined) updates.color = d.color;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("sectors")
    .update(updates)
    .eq("id", existing.id)
    .select()
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: mapSectorRow(row, 0) } satisfies ApiResponse<Sector>
  );
}

// ─── DELETE /api/sectors/[slug] ──────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { slug } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("sectors")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Sector not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("sectors")
    .delete()
    .eq("id", existing.id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { deleted: true } } satisfies ApiResponse<{ deleted: boolean }>
  );
}
