import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import { runAutomations } from "@/lib/automations/engine";
import type { ApiResponse } from "@/types";

// ─── Types ───────────────────────────────────────────────────────

export interface Subscriber {
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

// ─── GET /api/subscriptions ──────────────────────────────────────
// Admin only — list subscribers with pagination, filters, search

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const status = searchParams.get("status");
  const planId = searchParams.get("planId");
  const search = searchParams.get("search");

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("subscribers")
    .select("*", { count: "exact" });

  if (status) {
    query = query.eq("status", status);
  }

  if (planId) {
    query = query.eq("plan_id", planId);
  }

  if (search) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
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
  const subscribers: Subscriber[] = (rows ?? []).map(mapSubscriberRow);

  const response: ApiResponse<Subscriber[]> = {
    data: subscribers,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/subscriptions ─────────────────────────────────────
// Admin only — create subscriber manually

const createSubscriberSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  countryCode: z.string().optional(),
  planId: z.string().uuid().optional(),
  status: z
    .enum(["trialing", "active", "past_due", "canceled", "paused", "incomplete"])
    .optional()
    .default("active"),
  trialEndsAt: z.string().datetime().optional(),
  currentPeriodStart: z.string().datetime().optional(),
  currentPeriodEnd: z.string().datetime().optional(),
  gatewayCustomerId: z.string().optional(),
  gatewaySubscriptionId: z.string().optional(),
  promoCodeId: z.string().uuid().optional(),
  notes: z.string().optional(),
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

  const parsed = createSubscriberSchema.safeParse(body);
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
    .from("subscribers")
    .insert({
      email: data.email,
      name: data.name ?? null,
      phone: data.phone ?? null,
      country_code: data.countryCode ?? null,
      plan_id: data.planId ?? null,
      status: data.status,
      trial_ends_at: data.trialEndsAt ?? null,
      current_period_start: data.currentPeriodStart ?? null,
      current_period_end: data.currentPeriodEnd ?? null,
      gateway_customer_id: data.gatewayCustomerId ?? null,
      gateway_subscription_id: data.gatewaySubscriptionId ?? null,
      promo_code_id: data.promoCodeId ?? null,
      notes: data.notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Fire webhooks + automations for new subscriber
  void dispatchWebhook('subscriber.created', { subscriber_id: row.id, email: row.email, plan_id: row.plan_id ?? null });
  void runAutomations('subscriber.created', { subscriber_id: row.id, email: row.email, plan_id: row.plan_id ?? null });

  const response: ApiResponse<Subscriber> = {
    data: mapSubscriberRow(row),
  };
  return NextResponse.json(response, { status: 201 });
}
