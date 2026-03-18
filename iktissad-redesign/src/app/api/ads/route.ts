import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";
import type { Ad } from "../ad-campaigns/[id]/route";

// Re-export Ad type for consumers
export type { Ad };

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

// ─── GET /api/ads ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const campaignId = searchParams.get("campaign_id");

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("ads") as any).select("*", { count: "exact" });

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const start = (page - 1) * pageSize;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, count, error } = await (query as any)
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ads: Ad[] = (rows ?? []).map((r: any) => mapRow(r));

  const response: ApiResponse<Ad[]> = {
    data: ads,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/ads ────────────────────────────────────────────────────────────

const createAdSchema = z.object({
  campaign_id: z.string().uuid("campaign_id must be a valid UUID"),
  type: z.enum(["full-page", "half-page", "banner", "sponsor-card"]),
  image_url: z.string().min(1, "image_url مطلوب"),
  target_url: z.string().url().optional().nullable(),
  alt_text: z.string().optional().nullable(),
  issue_id: z.string().uuid().optional().nullable(),
  spread_number: z.number().int().min(1).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createAdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const d = parsed.data;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("ads") as any)
    .insert({
      campaign_id: d.campaign_id,
      type: d.type,
      image_url: d.image_url,
      target_url: d.target_url ?? null,
      alt_text: d.alt_text ?? null,
      issue_id: d.issue_id ?? null,
      spread_number: d.spread_number ?? null,
      active: d.active,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const response: ApiResponse<Ad> = { data: mapRow(row) };
  return NextResponse.json(response, { status: 201 });
}
