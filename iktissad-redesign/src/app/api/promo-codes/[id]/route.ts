import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ───────────────────────────────────────────────────────

interface PromoCode {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxUses: number | null;
  usesCount: number;
  validFrom: string;
  validUntil: string | null;
  plans: string[] | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPromoCodeRow(row: any): PromoCode {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    maxUses: row.max_uses ?? null,
    usesCount: row.uses_count ?? 0,
    validFrom: row.valid_from,
    validUntil: row.valid_until ?? null,
    plans: row.plans ?? null,
    isActive: row.is_active,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
  };
}

// ─── GET /api/promo-codes/[id] ────────────────────────────────────
// Admin only — single promo code by UUID or by code string

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  // Detect if the id looks like a UUID (36 chars with dashes) or a code string
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any).from("promo_codes").select("*");

  if (isUuid) {
    query = query.eq("id", id);
  } else {
    // Treat id segment as a promo code string (e.g., GET /api/promo-codes/SAVE20)
    query = query.eq("code", id.toUpperCase());
  }

  const { data: row, error } = await query.single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Promo code not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<PromoCode> = {
    data: mapPromoCodeRow(row),
  };
  return NextResponse.json(response);
}

// ─── PUT /api/promo-codes/[id] ────────────────────────────────────
// Admin only — update promo code

const updatePromoCodeSchema = z.object({
  discountType: z.enum(["percent", "fixed"]).optional(),
  discountValue: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional().nullable(),
  plans: z.array(z.string().uuid()).optional().nullable(),
  isActive: z.boolean().optional(),
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

  const parsed = updatePromoCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {};

  if (data.discountType !== undefined) updateData.discount_type = data.discountType;
  if (data.discountValue !== undefined) updateData.discount_value = data.discountValue;
  if (data.maxUses !== undefined) updateData.max_uses = data.maxUses;
  if (data.validFrom !== undefined) updateData.valid_from = data.validFrom;
  if (data.validUntil !== undefined) updateData.valid_until = data.validUntil;
  if (data.plans !== undefined) updateData.plans = data.plans;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("promo_codes")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Promo code not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  const response: ApiResponse<PromoCode> = {
    data: mapPromoCodeRow(row),
  };
  return NextResponse.json(response);
}

// ─── DELETE /api/promo-codes/[id] ────────────────────────────────
// Admin only — hard delete promo code

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("promo_codes")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deleted: true } });
}
