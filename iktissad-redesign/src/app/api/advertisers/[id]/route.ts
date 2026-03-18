import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";
import type { Advertiser } from "../route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Advertiser {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? null,
    contactName: row.contact_name ?? null,
    contactEmail: row.contact_email ?? null,
    contactPhone: row.contact_phone ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
  };
}

// ─── GET /api/advertisers/[id] ────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase.from("advertisers") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Advertiser not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<Advertiser> = { data: mapRow(row) };
  return NextResponse.json(response);
}

// ─── PUT /api/advertisers/[id] ────────────────────────────────────────────────

const updateAdvertiserSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").optional(),
  nameEn: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")).nullable(),
  contactPhone: z.string().optional(),
  notes: z.string().optional().nullable(),
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

  const parsed = updateAdvertiserSchema.safeParse(body);
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
  if (data.contactName !== undefined) updateData.contact_name = data.contactName;
  if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail || null;
  if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone;
  if (data.notes !== undefined) updateData.notes = data.notes;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("advertisers") as any)
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: "Advertiser not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<Advertiser> = { data: mapRow(row) };
  return NextResponse.json(response);
}

// ─── DELETE /api/advertisers/[id] ─────────────────────────────────────────────

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("advertisers") as any).delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { success: true } });
}
