import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adsGuard,
  badRequest,
  serverError,
  mapAdRow,
  pageParams,
  adSchema,
  adToRow,
  type Ad,
} from "@/lib/ads/admin";
import type { ApiResponse } from "@/types";

export type { Ad };

// ─── GET /api/ads ─────────────────────────────────────────────────────────────
// ?campaign_id=  filter to one campaign
// ?kind=web|print  web placements vs print-magazine spreads

export async function GET(request: NextRequest) {
  const denied = await adsGuard(request, "read");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const { page, pageSize, start } = pageParams(searchParams);
  const campaignId = searchParams.get("campaign_id");
  const kind = searchParams.get("kind");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from("ads") as any).select("*", { count: "exact" });
  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (kind === "web") query = query.not("placement", "is", null);
  if (kind === "print") query = query.is("placement", null);

  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) return serverError(error.message);

  const total = count ?? 0;
  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (rows ?? []).map((r: any) => mapAdRow(r)),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  } satisfies ApiResponse<Ad[]>);
}

// ─── POST /api/ads ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = adSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
  if (!parsed.data.placement && !parsed.data.type) return badRequest("اختر موضع الإعلان");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("ads") as any)
    .insert({ active: true, ...adToRow(parsed.data) })
    .select("*")
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data: mapAdRow(row) } satisfies ApiResponse<Ad>, { status: 201 });
}
