import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ───────────────────────────────────────────────────────

export interface PromoCode {
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

// ─── GET /api/promo-codes ─────────────────────────────────────────
// Admin only — list all promo codes

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const isActive = searchParams.get("isActive");

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("promo_codes")
    .select("*", { count: "exact" });

  if (isActive !== null) {
    query = query.eq("is_active", isActive === "true");
  }

  const start = (page - 1) * pageSize;
  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  const promoCodes: PromoCode[] = (rows ?? []).map(mapPromoCodeRow);

  const response: ApiResponse<PromoCode[]> = {
    data: promoCodes,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/promo-codes ────────────────────────────────────────
// Admin only — create a promo code

const createPromoCodeSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional().nullable(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional().nullable(),
  plans: z.array(z.string().uuid()).optional().nullable(),
  isActive: z.boolean().optional().default(true),
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

  const parsed = createPromoCodeSchema.safeParse(body);
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
    .from("promo_codes")
    .insert({
      code: data.code,
      discount_type: data.discountType,
      discount_value: data.discountValue,
      max_uses: data.maxUses ?? null,
      valid_from: data.validFrom ?? new Date().toISOString(),
      valid_until: data.validUntil ?? null,
      plans: data.plans ?? null,
      is_active: data.isActive,
      created_by: auth.userId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // Unique constraint violation — code already exists
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A promo code with this code already exists" } satisfies ApiResponse<never>,
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const response: ApiResponse<PromoCode> = {
    data: mapPromoCodeRow(row),
  };
  return NextResponse.json(response, { status: 201 });
}
