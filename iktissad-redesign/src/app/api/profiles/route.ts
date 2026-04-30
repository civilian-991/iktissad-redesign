import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapProfileRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Profile } from "@/types";

const PROFILE_SELECT = `
  *,
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const sector = searchParams.get("sector");
  const country = searchParams.get("country");
  const type = searchParams.get("type");

  const supabase = await createClient();

   
  let query = supabase
    .from("profiles")
    .select(PROFILE_SELECT, { count: "exact" }) as any;

  if (type) {
    query = query.eq("type", type);
  }

  if (sector) {
    const { data: s } = await supabase
      .from("sectors")
      .select("id")
      .eq("slug", sector)
      .single() as { data: { id: string } | null };
    if (s) query = query.eq("sector_id", s.id);
  }

  if (country) {
    const { data: c } = await supabase
      .from("countries")
      .select("id")
      .eq("slug", country)
      .single() as { data: { id: string } | null };
    if (c) query = query.eq("country_id", c.id);
  }

  const start = (page - 1) * pageSize;
  const { data: rows, count, error } = await query
    .order("name", { ascending: true })
    .range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles: Profile[] = (rows ?? []).map((r: any) => mapProfileRow(r));

  const response: ApiResponse<Profile[]> = {
    data: profiles,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

const createProfileSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional().default(""),
  description: z.string().optional().default(""),
  descriptionEn: z.string().optional().default(""),
  logo: z.string().optional().default(""),
  sectorSlug: z.string().optional(),
  countrySlug: z.string().optional(),
  website: z.string().optional().default(""),
  founded: z.string().optional().default(""),
  type: z.enum(["corporation", "government", "ngo", "individual"]).optional().default("corporation"),
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

  const parsed = createProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  let sectorId: string | null = null;
  let countryId: string | null = null;

  if (data.sectorSlug) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: s } = await admin.from("sectors").select("id").eq("slug", data.sectorSlug).single() as { data: any };
    sectorId = s?.id ?? null;
  }
  if (data.countrySlug) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: c } = await admin.from("countries").select("id").eq("slug", data.countrySlug).single() as { data: any };
    countryId = c?.id ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("profiles") as any)
    .insert({
      name: data.name,
      name_en: data.nameEn,
      description: data.description,
      description_en: data.descriptionEn,
      logo: data.logo,
      sector_id: sectorId,
      country_id: countryId,
      website: data.website,
      founded: data.founded,
      type: data.type,
    })
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const response: ApiResponse<Profile> = { data: mapProfileRow(row) };
  return NextResponse.json(response, { status: 201 });
}
