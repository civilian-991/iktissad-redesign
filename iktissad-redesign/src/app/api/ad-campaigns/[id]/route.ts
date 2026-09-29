import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adsGuard,
  badRequest,
  serverError,
  mapCampaignRow,
  mapAdRow,
  campaignFields,
  campaignToRow,
  CAMPAIGN_SELECT,
  type Ad,
  type AdCampaign,
} from "@/lib/ads/admin";
import type { ApiResponse } from "@/types";

export type { Ad };

type Params = { params: Promise<{ id: string }> };
type CampaignWithAds = AdCampaign & { ads: Ad[] };

const SELECT_WITH_ADS = `${CAMPAIGN_SELECT}, ads ( * )`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWithAds(row: any): CampaignWithAds {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...mapCampaignRow(row), ads: (row.ads ?? []).map((a: any) => mapAdRow(a)) };
}

// ─── GET /api/ad-campaigns/[id] ───────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "read");
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin.from("ad_campaigns") as any)
    .select(SELECT_WITH_ADS)
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Campaign not found" } satisfies ApiResponse<never>, { status: 404 });
  }
  return NextResponse.json({ data: mapWithAds(row) } satisfies ApiResponse<CampaignWithAds>);
}

// ─── PUT /api/ad-campaigns/[id] ───────────────────────────────────────────────

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

  const parsed = campaignFields.partial().safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
  const { startDate, endDate } = parsed.data;
  if (startDate && endDate && endDate < startDate) return badRequest("تاريخ النهاية قبل تاريخ البداية");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("ad_campaigns") as any)
    .update(campaignToRow(parsed.data))
    .eq("id", id)
    .select(SELECT_WITH_ADS)
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!row) {
    return NextResponse.json({ error: "Campaign not found" } satisfies ApiResponse<never>, { status: 404 });
  }
  return NextResponse.json({ data: mapWithAds(row) } satisfies ApiResponse<CampaignWithAds>);
}

// ─── DELETE /api/ad-campaigns/[id] ────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();

  // ads.campaign_id has no ON DELETE CASCADE.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: adsError } = await (admin.from("ads") as any).delete().eq("campaign_id", id);
  if (adsError) return serverError(adsError.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("ad_campaigns") as any).delete().eq("id", id);
  if (error) return serverError(error.message);

  return NextResponse.json({ data: null });
}
