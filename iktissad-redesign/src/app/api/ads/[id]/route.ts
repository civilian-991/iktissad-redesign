import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";
import type { Ad } from "../route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Ad {
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

// ─── GET /api/ads/[id] ────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase.from("ads") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Ad not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  return NextResponse.json({ data: mapRow(row) });
}

// ─── PUT /api/ads/[id] ────────────────────────────────────────────────────────

const updateAdSchema = z.object({
  campaign_id: z.string().uuid().optional(),
  type: z.enum(["full-page", "half-page", "banner", "sponsor-card"]).optional(),
  image_url: z.string().min(1).optional(),
  target_url: z.string().url().optional().nullable(),
  alt_text: z.string().optional().nullable(),
  issue_id: z.string().uuid().optional().nullable(),
  spread_number: z.number().int().min(1).optional().nullable(),
  active: z.boolean().optional(),
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

  const parsed = updateAdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  // Build update payload from only provided keys
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {};
  const d = parsed.data;
  if (d.campaign_id !== undefined) updatePayload.campaign_id = d.campaign_id;
  if (d.type !== undefined) updatePayload.type = d.type;
  if (d.image_url !== undefined) updatePayload.image_url = d.image_url;
  if ("target_url" in d) updatePayload.target_url = d.target_url ?? null;
  if ("alt_text" in d) updatePayload.alt_text = d.alt_text ?? null;
  if ("issue_id" in d) updatePayload.issue_id = d.issue_id ?? null;
  if ("spread_number" in d) updatePayload.spread_number = d.spread_number ?? null;
  if (d.active !== undefined) updatePayload.active = d.active;

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("ads") as any)
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: mapRow(row) });
}

// ─── DELETE /api/ads/[id] ─────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("ads") as any).delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: null }, { status: 200 });
}
