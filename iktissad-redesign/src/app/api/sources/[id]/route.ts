import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, Source } from "@/types";

// ─── Mapper ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSourceRow(row: any): Source {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? undefined,
    title: row.title ?? undefined,
    titleEn: row.title_en ?? undefined,
    organization: row.organization ?? undefined,
    organizationEn: row.organization_en ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    countryId: row.country_id ?? undefined,
    sectorId: row.sector_id ?? undefined,
    tags: row.tags ?? [],
    reliabilityRating: row.reliability_rating ?? undefined,
    embargoUntil: row.embargo_until ?? undefined,
    privateNotes: row.private_notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    country: row.countries
      ? { name: row.countries.name, flag: row.countries.flag ?? "" }
      : undefined,
    sector: row.sectors ? { name: row.sectors.name } : undefined,
    articleCount: row.article_count ?? 0,
  };
}

// ─── GET /api/sources/[id] ────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("sources")
    .select(`*, countries ( name, flag ), sectors ( name )`)
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Source not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Count linked articles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: articleCount } = await (supabase as any)
    .from("source_article_links")
    .select("id", { count: "exact", head: true })
    .eq("source_id", id);

  const response: ApiResponse<Source> = {
    data: mapSourceRow({ ...row, article_count: articleCount ?? 0 }),
  };
  return NextResponse.json(response);
}

// ─── PATCH /api/sources/[id] ──────────────────────────────────────────────────

const updateSourceSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  title: z.string().optional(),
  titleEn: z.string().optional(),
  organization: z.string().optional(),
  organizationEn: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  countryId: z.string().uuid().optional().or(z.literal("")),
  sectorId: z.string().uuid().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  reliabilityRating: z.number().int().min(1).max(5).nullable().optional(),
  embargoUntil: z.string().nullable().optional(),
  privateNotes: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = updateSourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const d = parsed.data;
  // Build only the fields that were provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  if (d.name !== undefined) updates.name = d.name;
  if (d.nameEn !== undefined) updates.name_en = d.nameEn || null;
  if (d.title !== undefined) updates.title = d.title || null;
  if (d.titleEn !== undefined) updates.title_en = d.titleEn || null;
  if (d.organization !== undefined) updates.organization = d.organization || null;
  if (d.organizationEn !== undefined) updates.organization_en = d.organizationEn || null;
  if (d.phone !== undefined) updates.phone = d.phone || null;
  if (d.email !== undefined) updates.email = d.email || null;
  if (d.countryId !== undefined) updates.country_id = d.countryId || null;
  if (d.sectorId !== undefined) updates.sector_id = d.sectorId || null;
  if (d.tags !== undefined) updates.tags = d.tags;
  if (d.reliabilityRating !== undefined) updates.reliability_rating = d.reliabilityRating;
  if (d.embargoUntil !== undefined) updates.embargo_until = d.embargoUntil;
  if (d.privateNotes !== undefined) updates.private_notes = d.privateNotes;

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("sources")
    .update(updates)
    .eq("id", id)
    .select(`*, countries ( name, flag ), sectors ( name )`)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Source not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  const response: ApiResponse<Source> = { data: mapSourceRow(row) };
  return NextResponse.json(response);
}

// ─── DELETE /api/sources/[id] ─────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("sources").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { success: true } } satisfies ApiResponse<{ success: boolean }>);
}
