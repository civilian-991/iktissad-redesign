import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession, getMpgsCredentials } from "@/lib/mpgs";
import type { ApiResponse } from "@/types";

// ─── Validation schema ────────────────────────────────────────────

const CheckoutSessionBody = z.object({
  planId: z.string().min(1),
  interval: z.enum(["monthly", "annual"]),
  promoCode: z.string().optional(),
});

// ─── POST /api/checkout/session ───────────────────────────────────

export async function POST(request: NextRequest) {
  // Require authenticated user
  const auth = await requireAuthFromRequest(request);
  if (!auth.authenticated || !auth.userId) {
    return unauthorizedResponse();
  }

  // Parse + validate body
  let body: z.infer<typeof CheckoutSessionBody>;
  try {
    const raw = await request.json();
    body = CheckoutSessionBody.parse(raw);
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { error: err instanceof z.ZodError ? err.issues[0].message : "Invalid request body" },
      { status: 400 }
    );
  }

  const { planId, interval, promoCode } = body;
  const admin = createAdminClient();

  // ── 1. Fetch the subscription plan ─────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plan, error: planError } = await (admin as any)
    .from("subscription_plans")
    .select("id, name, monthly_price_cents, annual_price_cents")
    .eq("id", planId)
    .eq("is_active", true)
    .single();

  if (planError || !plan) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Plan not found or inactive" },
      { status: 404 }
    );
  }

  // ── 2. Determine base amount ────────────────────────────────────
  let amountCents: number =
    interval === "annual" ? (plan.annual_price_cents ?? 0) : (plan.monthly_price_cents ?? 0);

  if (amountCents <= 0) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Plan has no price configured for this interval" },
      { status: 400 }
    );
  }

  // ── 3. Apply promo code if provided ────────────────────────────
  let promoCodeId: string | null = null;

  if (promoCode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: promo } = await (admin as any)
      .from("promo_codes")
      .select("id, discount_type, discount_value, max_uses, uses_count, expires_at, is_active")
      .eq("code", promoCode.toUpperCase())
      .single();

    if (promo && promo.is_active) {
      const now = new Date();
      const expired = promo.expires_at && new Date(promo.expires_at) < now;
      const exhausted =
        promo.max_uses !== null && promo.uses_count >= promo.max_uses;

      if (!expired && !exhausted) {
        promoCodeId = promo.id;

        if (promo.discount_type === "percent") {
          amountCents = Math.round(amountCents * (1 - promo.discount_value / 100));
        } else if (promo.discount_type === "fixed") {
          amountCents = Math.max(0, amountCents - promo.discount_value);
        }
      }
    }
    // If promo code is invalid/expired, proceed without discount (silent fail)
  }

  // ── 4. Build orderId ────────────────────────────────────────────
  const timestamp = Date.now();
  const orderId = `SUB-${auth.userId.slice(0, 8)}-${timestamp}`;

  // ── 5. Create MPGS checkout session ────────────────────────────
  const creds = getMpgsCredentials();

  // Convert cents to decimal string (MPGS expects "19.99" format)
  const amountDecimal = (amountCents / 100).toFixed(2);

  const returnUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://iktissad.com"
  }/subscribe/return?order=${orderId}`;

  let sessionId: string;
  let successIndicator: string;

  try {
    const session = await createCheckoutSession({
      orderId,
      amount: amountDecimal,
      currency: "USD",
      description: `${plan.name} — ${interval} subscription`,
      returnUrl,
    });
    sessionId = session.sessionId;
    successIndicator = session.successIndicator;
  } catch (err) {
    console.error("[checkout/session] MPGS session creation failed:", err);
    return NextResponse.json<ApiResponse<never>>(
      { error: "Payment gateway error. Please try again." },
      { status: 502 }
    );
  }

  // ── 6. Store pending payment record in DB ───────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (admin as any).from("payments").insert({
    subscriber_id: auth.userId,
    plan_id: planId,
    amount_cents: amountCents,
    currency: "USD",
    status: "pending",
    gateway_payment_id: sessionId,
    description: orderId,
    promo_code_id: promoCodeId ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    // Log but don't fail — the payment can still proceed; we'll reconcile via webhook
    console.error("[checkout/session] Failed to store pending payment:", insertError.message);
  }

  // ── 7. Return session details to the frontend ───────────────────
  return NextResponse.json<ApiResponse<{ sessionId: string; payUrl: string; orderId: string; successIndicator: string }>>({
    data: {
      sessionId,
      payUrl: creds.payUrl,
      orderId,
      successIndicator,
    },
  });
}
