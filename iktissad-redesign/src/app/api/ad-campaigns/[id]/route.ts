import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";
import type { AdCampaign } from "../route";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Ad {
  id: string;
  campaignId: string;
  type: "full-page" | "half-page" | "banner" | "sponsor-card";
  imageUrl: string;
  targetUrl: string | null;
  altText: string | null;
  impressions: number;
  clicks: number;
  issueId: string | null;
  spreadNumber: number | null;
  active: boolean;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAdRow(row: any): Ad {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    type: row.type,
    imageUrl: row.image_url,
    targetUrl: row.target_url ?? null,
    altText: row.alt_text ?? null,
    impressions: row.impressions ?? 0,
    clicks: row.clicks ?? 0,
    issueId: row.issue_id ?? null,
    spreadNumber: row.spread_number ?? null,
    active: row.active ?? true,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCampaignRow(row: any): AdCampaign & { ads: Ad[] } {
  return {
    id: row.id,
    advertiserId: row.advertiser_id ?? null,
    advertiserName: row.advertisers?.name ?? null,
    name: row.name,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    budgetCents: row.budget_cents ?? null,
    status: row.status ?? "draft",
    createdAt: row.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ads: (row.ads ?? []).map((a: any) => mapAdRow(a)),
  };
}

// ─── GET /api/ad-campaigns/[id] ───────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase.from("ad_campaigns") as any)
    .select("*, advertisers:advertiser_id ( name ), ads ( * )")
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Campaign not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  return NextResponse.json({ data: mapCampaignRow(row) });
}

// ─── PUT /api/ad-campaigns/[id] ───────────────────────────────────────────────

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  advertiser_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget_cents: z.number().int().min(0).optional().nullable(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  // Build update payload — only include keys that were provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {};
  const d = parsed.data;
  if (d.name !== undefined) updatePayload.name = d.name;
  if ("advertiser_id" in d) updatePayload.advertiser_id = d.advertiser_id ?? null;
  if ("start_date" in d) updatePayload.start_date = d.start_date ?? null;
  if ("end_date" in d) updatePayload.end_date = d.end_date ?? null;
  if ("budget_cents" in d) updatePayload.budget_cents = d.budget_cents ?? null;
  if (d.status !== undefined) updatePayload.status = d.status;

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("ad_campaigns") as any)
    .update(updatePayload)
    .eq("id", id)
    .select("*, advertisers:advertiser_id ( name ), ads ( * )")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: mapCampaignRow(row) });
}

// ─── DELETE /api/ad-campaigns/[id] ────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;
  const admin = createAdminClient();

  // Delete ads first (cascade in case FK constraint without ON DELETE CASCADE)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("ads") as any).delete().eq("campaign_id", id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("ad_campaigns") as any).delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: null }, { status: 200 });
}
