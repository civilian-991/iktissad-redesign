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
    sector: row.sectors
      ? { name: row.sectors.name }
      : undefined,
    articleCount: row.article_count ?? 0,
  };
}

// ─── GET /api/sources ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const sectorId = searchParams.get("sector_id") ?? "";
  const countryId = searchParams.get("country_id") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "24", 10));

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("sources")
    .select(
      `
      *,
      countries ( name, flag ),
      sectors ( name )
    `,
      { count: "exact" }
    );

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,name_en.ilike.%${search}%,organization.ilike.%${search}%,email.ilike.%${search}%`
    );
  }
  if (sectorId) query = query.eq("sector_id", sectorId);
  if (countryId) query = query.eq("country_id", countryId);

  const start = (page - 1) * limit;
  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(start, start + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Fetch article counts per source in a separate query (avoid heavy subquery)
  const sourceIds: string[] = (rows ?? []).map((r: { id: string }) => r.id);
  let articleCountMap: Record<string, number> = {};
  if (sourceIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: linkRows } = await (supabase as any)
      .from("source_article_links")
      .select("source_id")
      .in("source_id", sourceIds);
    if (linkRows) {
      for (const lr of linkRows) {
        articleCountMap[lr.source_id] = (articleCountMap[lr.source_id] ?? 0) + 1;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sources: Source[] = (rows ?? []).map((r: any) =>
    mapSourceRow({ ...r, article_count: articleCountMap[r.id] ?? 0 })
  );

  const total = count ?? 0;
  const response: ApiResponse<Source[]> = {
    data: sources,
    pagination: {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/sources ────────────────────────────────────────────────────────

const createSourceSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  title: z.string().optional(),
  titleEn: z.string().optional(),
  organization: z.string().optional(),
  organizationEn: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  countryId: z.string().uuid().optional().or(z.literal("")),
  sectorId: z.string().uuid().optional().or(z.literal("")),
  tags: z.array(z.string()).optional().default([]),
  reliabilityRating: z.number().int().min(1).max(5).optional(),
  embargoUntil: z.string().optional(),
  privateNotes: z.string().optional(),
});

export async function POST(request: NextRequest) {
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

  const parsed = createSourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const d = parsed.data;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("sources")
    .insert({
      name: d.name,
      name_en: d.nameEn || null,
      title: d.title || null,
      title_en: d.titleEn || null,
      organization: d.organization || null,
      organization_en: d.organizationEn || null,
      phone: d.phone || null,
      email: d.email || null,
      country_id: d.countryId || null,
      sector_id: d.sectorId || null,
      tags: d.tags ?? [],
      reliability_rating: d.reliabilityRating ?? null,
      embargo_until: d.embargoUntil || null,
      private_notes: d.privateNotes || null,
      created_by: auth.userId ?? null,
    })
    .select(`*, countries ( name, flag ), sectors ( name )`)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const response: ApiResponse<Source> = { data: mapSourceRow(row) };
  return NextResponse.json(response, { status: 201 });
}
