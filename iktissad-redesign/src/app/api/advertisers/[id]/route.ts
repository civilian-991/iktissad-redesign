import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adsGuard,
  badRequest,
  serverError,
  mapAdvertiserRow,
  advertiserSchema,
  type Advertiser,
} from "@/lib/ads/admin";
import type { ApiResponse } from "@/types";

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/advertisers/[id] ────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "read");
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin.from("advertisers") as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Advertiser not found" } satisfies ApiResponse<never>, { status: 404 });
  }
  return NextResponse.json({ data: mapAdvertiserRow(row) } satisfies ApiResponse<Advertiser>);
}

// ─── PUT /api/advertisers/[id] ────────────────────────────────────────────────

const updateSchema = advertiserSchema.partial();

export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

  const d = parsed.data;
  const update: Record<string, unknown> = {};
  if (d.name !== undefined) update.name = d.name;
  if (d.nameEn !== undefined) update.name_en = d.nameEn || null;
  if (d.contactName !== undefined) update.contact_name = d.contactName || null;
  if (d.contactEmail !== undefined) update.contact_email = d.contactEmail || null;
  if (d.contactPhone !== undefined) update.contact_phone = d.contactPhone || null;
  if (d.notes !== undefined) update.notes = d.notes || null;
  if (d.logoUrl !== undefined) update.logo_url = d.logoUrl || null;
  if (d.websiteUrl !== undefined) update.website_url = d.websiteUrl || null;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("advertisers") as any)
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!row) {
    return NextResponse.json({ error: "Advertiser not found" } satisfies ApiResponse<never>, { status: 404 });
  }
  return NextResponse.json({ data: mapAdvertiserRow(row) } satisfies ApiResponse<Advertiser>);
}

// ─── DELETE /api/advertisers/[id] ─────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("advertisers") as any).delete().eq("id", id);
  if (error) return serverError(error.message);

  return NextResponse.json({ data: { success: true } });
}
