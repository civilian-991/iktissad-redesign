import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adsGuard,
  badRequest,
  serverError,
  mapAdvertiserRow,
  pageParams,
  advertiserSchema,
  type Advertiser,
} from "@/lib/ads/admin";
import type { ApiResponse } from "@/types";

export type { Advertiser };

// ─── GET /api/advertisers ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const denied = await adsGuard(request, "read");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const { page, pageSize, start } = pageParams(searchParams, 20);
  const search = searchParams.get("search") ?? "";

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from("advertisers") as any).select("*", { count: "exact" });
  if (search) query = query.ilike("name", `%${search}%`);

  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) return serverError(error.message);

  const total = count ?? 0;
  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (rows ?? []).map((r: any) => mapAdvertiserRow(r)),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  } satisfies ApiResponse<Advertiser[]>);
}

// ─── POST /api/advertisers ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = advertiserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

  const d = parsed.data;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("advertisers") as any)
    .insert({
      name: d.name,
      name_en: d.nameEn || null,
      contact_name: d.contactName || null,
      contact_email: d.contactEmail || null,
      contact_phone: d.contactPhone || null,
      notes: d.notes || null,
      logo_url: d.logoUrl || null,
      website_url: d.websiteUrl || null,
    })
    .select("*")
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data: mapAdvertiserRow(row) } satisfies ApiResponse<Advertiser>, { status: 201 });
}
