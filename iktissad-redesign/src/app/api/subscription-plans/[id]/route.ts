import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ───────────────────────────────────────────────────────

interface SubscriptionPlan {
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

// ─── GET /api/subscription-plans/[id] ────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("subscription_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Subscription plan not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<SubscriptionPlan> = {
    data: mapPlanRow(row),
  };
  return NextResponse.json(response);
}

// ─── PUT /api/subscription-plans/[id] ────────────────────────────
// Admin only — update plan

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  nameAr: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  priceMonthly: z.number().nonnegative().optional(),
  priceAnnual: z.number().nonnegative().optional().nullable(),
  interval: z.enum(["monthly", "annual", "quarterly"]).optional(),
  features: z.array(z.string()).optional(),
  featuresAr: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.nameAr !== undefined) updateData.name_ar = data.nameAr;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.descriptionAr !== undefined) updateData.description_ar = data.descriptionAr;
  if (data.priceMonthly !== undefined) updateData.price_monthly = data.priceMonthly;
  if (data.priceAnnual !== undefined) updateData.price_annual = data.priceAnnual;
  if (data.interval !== undefined) updateData.interval = data.interval;
  if (data.features !== undefined) updateData.features = data.features;
  if (data.featuresAr !== undefined) updateData.features_ar = data.featuresAr;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("subscription_plans")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Subscription plan not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  const response: ApiResponse<SubscriptionPlan> = {
    data: mapPlanRow(row),
  };
  return NextResponse.json(response);
}

// ─── DELETE /api/subscription-plans/[id] ─────────────────────────
// Admin only — soft delete: set is_active = false

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const admin = createAdminClient();

  // Soft delete — deactivate rather than hard-delete to preserve subscriber FK references
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("subscription_plans")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deactivated: true } });
}
