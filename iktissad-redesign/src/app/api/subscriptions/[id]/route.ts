import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ───────────────────────────────────────────────────────

interface Subscriber {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  countryCode: string | null;
  planId: string | null;
  status: "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete";
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  paymentMethod: Record<string, unknown> | null;
  gatewayCustomerId: string | null;
  gatewaySubscriptionId: string | null;
  promoCodeId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Payment {
  id: string;
  subscriberId: string;
  planId: string | null;
  amount: number;
  currency: string;
  status: string;
  gatewayPaymentId: string | null;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSubscriberRow(row: any): Subscriber {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    email: row.email,
    name: row.name ?? null,
    phone: row.phone ?? null,
    countryCode: row.country_code ?? null,
    planId: row.plan_id ?? null,
    status: row.status,
    trialEndsAt: row.trial_ends_at ?? null,
    currentPeriodStart: row.current_period_start ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    canceledAt: row.canceled_at ?? null,
    paymentMethod: row.payment_method ?? null,
    gatewayCustomerId: row.gateway_customer_id ?? null,
    gatewaySubscriptionId: row.gateway_subscription_id ?? null,
    promoCodeId: row.promo_code_id ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPaymentRow(row: any): Payment {
  return {
    id: row.id,
    subscriberId: row.subscriber_id,
    planId: row.plan_id ?? null,
    amount: Number(row.amount),
    currency: row.currency ?? "SAR",
    status: row.status,
    gatewayPaymentId: row.gateway_payment_id ?? null,
    description: row.description ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
  };
}

// ─── GET /api/subscriptions/[id] ─────────────────────────────────
// Admin only — single subscriber with payment history

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("subscribers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Subscriber not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Fetch payment history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paymentRows } = await (supabase as any)
    .from("payments")
    .select("*")
    .eq("subscriber_id", id)
    .order("created_at", { ascending: false });

  const payments: Payment[] = (paymentRows ?? []).map(mapPaymentRow);

  const response: ApiResponse<{ subscriber: Subscriber; payments: Payment[] }> = {
    data: {
      subscriber: mapSubscriberRow(row),
      payments,
    },
  };

  return NextResponse.json(response);
}

// ─── PUT /api/subscriptions/[id] ─────────────────────────────────
// Admin only — update status, plan, notes, extend period

const updateSubscriberSchema = z.object({
  status: z
    .enum(["trialing", "active", "past_due", "canceled", "paused", "incomplete"])
    .optional(),
  planId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  trialEndsAt: z.string().datetime().optional().nullable(),
  currentPeriodStart: z.string().datetime().optional().nullable(),
  currentPeriodEnd: z.string().datetime().optional().nullable(),
  canceledAt: z.string().datetime().optional().nullable(),
  gatewayCustomerId: z.string().optional().nullable(),
  gatewaySubscriptionId: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
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

  const parsed = updateSubscriberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.status !== undefined) updateData.status = data.status;
  if (data.planId !== undefined) updateData.plan_id = data.planId;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.trialEndsAt !== undefined) updateData.trial_ends_at = data.trialEndsAt;
  if (data.currentPeriodStart !== undefined) updateData.current_period_start = data.currentPeriodStart;
  if (data.currentPeriodEnd !== undefined) updateData.current_period_end = data.currentPeriodEnd;
  if (data.canceledAt !== undefined) updateData.canceled_at = data.canceledAt;
  if (data.gatewayCustomerId !== undefined) updateData.gateway_customer_id = data.gatewayCustomerId;
  if (data.gatewaySubscriptionId !== undefined) updateData.gateway_subscription_id = data.gatewaySubscriptionId;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.countryCode !== undefined) updateData.country_code = data.countryCode;

  // If canceling, record canceled_at if not explicitly set
  if (data.status === "canceled" && data.canceledAt === undefined) {
    updateData.canceled_at = new Date().toISOString();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("subscribers")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Subscriber not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  const response: ApiResponse<Subscriber> = {
    data: mapSubscriberRow(row),
  };
  return NextResponse.json(response);
}

// ─── DELETE /api/subscriptions/[id] ──────────────────────────────
// Admin only — cancel subscription (soft: sets status to canceled)

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

  // Soft cancel: mark as canceled rather than deleting the record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("subscribers")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { canceled: true } });
}
