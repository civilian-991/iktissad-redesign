import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adsGuard,
  badRequest,
  serverError,
  mapCampaignRow,
  pageParams,
  campaignSchema,
  campaignToRow,
  CAMPAIGN_SELECT,
  type AdCampaign,
} from "@/lib/ads/admin";
import type { ApiResponse } from "@/types";

export type { AdCampaign };

// ─── GET /api/ad-campaigns ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const denied = await adsGuard(request, "read");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const { page, pageSize, start } = pageParams(searchParams);
  const advertiserId = searchParams.get("advertiser_id");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from("ad_campaigns") as any).select(CAMPAIGN_SELECT, { count: "exact" });
  if (advertiserId) query = query.eq("advertiser_id", advertiserId);

  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) return serverError(error.message);

  const total = count ?? 0;
  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (rows ?? []).map((r: any) => mapCampaignRow(r)),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  } satisfies ApiResponse<AdCampaign[]>);
}

// ─── POST /api/ad-campaigns ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = campaignSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("ad_campaigns") as any)
    .insert(campaignToRow(parsed.data))
    .select(CAMPAIGN_SELECT)
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data: mapCampaignRow(row) } satisfies ApiResponse<AdCampaign>, { status: 201 });
}
