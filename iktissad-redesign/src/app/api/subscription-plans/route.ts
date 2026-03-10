import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ───────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr: string;
  description: string | null;
  descriptionAr: string | null;
  priceMonthly: number;
  priceAnnual: number | null;
  interval: "monthly" | "annual" | "quarterly";
  features: string[];
  featuresAr: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlanRow(row: any): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    nameAr: row.name_ar,
    description: row.description ?? null,
    descriptionAr: row.description_ar ?? null,
    priceMonthly: Number(row.price_monthly),
    priceAnnual: row.price_annual != null ? Number(row.price_annual) : null,
    interval: row.interval,
    features: row.features ?? [],
    featuresAr: row.features_ar ?? [],
    isActive: row.is_active,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── GET /api/subscription-plans ─────────────────────────────────
// PUBLIC — list active plans only (no auth required)

export async function GET(_request: NextRequest) {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const plans: SubscriptionPlan[] = (rows ?? []).map(mapPlanRow);

  const response: ApiResponse<SubscriptionPlan[]> = {
    data: plans,
  };

  return NextResponse.json(response);
}

// ─── POST /api/subscription-plans ────────────────────────────────
// Admin only — create a new plan

const createPlanSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(1),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  priceMonthly: z.number().nonnegative(),
  priceAnnual: z.number().nonnegative().optional().nullable(),
  interval: z.enum(["monthly", "annual", "quarterly"]).optional().default("monthly"),
  features: z.array(z.string()).optional().default([]),
  featuresAr: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export async function POST(request: NextRequest) {
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

  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("subscription_plans")
    .insert({
      name: data.name,
      name_ar: data.nameAr,
      description: data.description ?? null,
      description_ar: data.descriptionAr ?? null,
      price_monthly: data.priceMonthly,
      price_annual: data.priceAnnual ?? null,
      interval: data.interval,
      features: data.features,
      features_ar: data.featuresAr,
      is_active: data.isActive,
      sort_order: data.sortOrder,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const response: ApiResponse<SubscriptionPlan> = {
    data: mapPlanRow(row),
  };
  return NextResponse.json(response, { status: 201 });
}
