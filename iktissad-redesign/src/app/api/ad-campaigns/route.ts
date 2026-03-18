import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdCampaign {
  id: string;
  advertiserId: string | null;
  advertiserName: string | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number | null;
  status: "draft" | "active" | "paused" | "completed";
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AdCampaign {
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
  };
}

// ─── GET /api/ad-campaigns ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const advertiserId = searchParams.get("advertiser_id");

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("ad_campaigns") as any).select(
    "*, advertisers:advertiser_id ( name )",
    { count: "exact" }
  );

  if (advertiserId) {
    query = query.eq("advertiser_id", advertiserId);
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
  const campaigns: AdCampaign[] = (rows ?? []).map((r: any) => mapRow(r));

  const response: ApiResponse<AdCampaign[]> = {
    data: campaigns,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/ad-campaigns ───────────────────────────────────────────────────

const createCampaignSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  advertiser_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget_cents: z.number().int().min(0).optional().nullable(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional().default("draft"),
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

  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("ad_campaigns") as any)
    .insert({
      name: parsed.data.name,
      advertiser_id: parsed.data.advertiser_id ?? null,
      start_date: parsed.data.start_date ?? null,
      end_date: parsed.data.end_date ?? null,
      budget_cents: parsed.data.budget_cents ?? null,
      status: parsed.data.status,
    })
    .select("*, advertisers:advertiser_id ( name )")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const response: ApiResponse<AdCampaign> = { data: mapRow(row) };
  return NextResponse.json(response, { status: 201 });
}
