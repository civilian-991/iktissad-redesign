/**
 * POST /api/admin/refunds
 *
 * Issue a refund against a single-article purchase via MPGS.
 *
 * Gated to super_admin and finance roles. Body:
 *   { purchaseId: string, amount?: number, reason?: string }
 *
 * On success, calls MPGS REFUND and stamps the article_purchases row with
 * { refunded, refunded_at, refund_reason, refunded_amount }.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundTransaction } from "@/lib/mpgs";
import type { ApiResponse } from "@/types";

const schema = z.object({
  purchaseId: z.string().uuid({ message: "purchaseId must be a UUID" }),
  amount: z.number().positive().optional(),
  reason: z.string().max(500).optional(),
});

interface RefundResponse {
  purchaseId: string;
  refundId: string;
  status: string;
}

export async function POST(request: NextRequest) {
  // ── 1. Role gate ─────────────────────────────────────────────────
  const auth = await requireRole(request, ["super_admin", "finance"]);
  if (!("ok" in auth)) return auth;

  // ── 2. Parse + validate body ────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { purchaseId, amount, reason } = parsed.data;
  const admin = createAdminClient();

  // ── 3. Look up the purchase row ─────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: purchase, error: lookupError } = await (admin.from("article_purchases") as any)
    .select("id, order_id, transaction_id, gateway_payment_id, amount, currency, refunded")
    .eq("id", purchaseId)
    .single();

  if (lookupError || !purchase) {
    return NextResponse.json(
      { error: "Purchase not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const row = purchase as {
    id: string;
    order_id: string | null;
    transaction_id: string | null;
    gateway_payment_id: string | null;
    amount: number | string;
    currency: string | null;
    refunded: boolean | null;
  };

  if (row.refunded) {
    return NextResponse.json(
      { error: "This purchase has already been refunded" } satisfies ApiResponse<never>,
      { status: 409 }
    );
  }

  // gateway_payment_id is the historical fallback used by the checkout route
  // before order_id/transaction_id columns existed.
  const orderId = row.order_id;
  const transactionId = row.transaction_id ?? row.gateway_payment_id;

  if (!orderId || !transactionId) {
    return NextResponse.json(
      {
        error:
          "Cannot refund: purchase is missing MPGS order_id or transaction_id",
      } satisfies ApiResponse<never>,
      { status: 422 }
    );
  }

  // ── 4. Call MPGS REFUND ─────────────────────────────────────────
  let refundId: string;
  let status: string;
  let refundedAmount: number;

  try {
    const result = await refundTransaction(
      orderId,
      transactionId,
      amount,
      row.currency ?? "SAR"
    );
    refundId = result.refundId;
    status = result.status;
    refundedAmount = amount ?? Number(row.amount);
  } catch (err) {
    console.error("[admin/refunds] MPGS refund failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Refund gateway error: ${err.message}`
            : "Refund gateway error",
      } satisfies ApiResponse<never>,
      { status: 502 }
    );
  }

  // ── 5. Update the purchase row ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (admin.from("article_purchases") as any)
    .update({
      refunded: true,
      refunded_at: new Date().toISOString(),
      refund_reason: reason ?? null,
      refunded_amount: refundedAmount,
    })
    .eq("id", purchaseId);

  if (updateError) {
    // Refund went through at MPGS but we couldn't record it locally.
    // Surface a 500 so an operator notices and reconciles manually.
    console.error(
      "[admin/refunds] MPGS refund succeeded but DB update failed:",
      updateError.message
    );
    return NextResponse.json(
      {
        error: `Refund succeeded at gateway (id ${refundId}) but DB update failed: ${updateError.message}`,
      } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: { purchaseId, refundId, status },
    } satisfies ApiResponse<RefundResponse>
  );
}
