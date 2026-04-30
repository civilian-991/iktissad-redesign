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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

   
  const { data: row, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id)
    .single() as { data: any; error: any };

  if (error || !row) {
    return NextResponse.json(
      { error: "Profile not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<Profile> = { data: mapProfileRow(row) };
  return NextResponse.json(response);
}

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  logo: z.string().optional(),
  sectorSlug: z.string().optional(),
  countrySlug: z.string().optional(),
  website: z.string().optional(),
  founded: z.string().optional(),
  type: z.enum(["corporation", "government", "ngo", "individual"]).optional(),
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

  const parsed = updateProfileSchema.safeParse(body);
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
  if (data.description !== undefined) updateData.description = data.description;
  if (data.descriptionEn !== undefined) updateData.description_en = data.descriptionEn;
  if (data.logo !== undefined) updateData.logo = data.logo;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.founded !== undefined) updateData.founded = data.founded;
  if (data.type !== undefined) updateData.type = data.type;

  if (data.sectorSlug !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: s } = await admin.from("sectors").select("id").eq("slug", data.sectorSlug).single() as { data: any };
    updateData.sector_id = s?.id ?? null;
  }
  if (data.countrySlug !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: c } = await admin.from("countries").select("id").eq("slug", data.countrySlug).single() as { data: any };
    updateData.country_id = c?.id ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("profiles") as any)
    .update(updateData)
    .eq("id", id)
    .select(PROFILE_SELECT)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Profile not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  const response: ApiResponse<Profile> = { data: mapProfileRow(row) };
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
  const { error } = await admin.from("profiles").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { success: true } });
}
