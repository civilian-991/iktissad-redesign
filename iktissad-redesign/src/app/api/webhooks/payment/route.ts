import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyMpgsWebhook,
  getMpgsCredentials,
  normalizeVpcResponseCode,
} from "@/lib/mpgs";

/**
 * POST /api/webhooks/payment
 *
 * MPGS Hosted Checkout webhook handler.
 *
 * MPGS sends a plain webhook secret in the `x-notification-secret` header.
 * Verification is a direct comparison (no HMAC over body).
 *
 * Event mapping:
 *   PAYMENT  + result SUCCESS   → handlePaymentSucceeded
 *   PAYMENT  + result FAILURE   → handlePaymentFailed
 *   SUBSCRIPTION + order CAPTURED → handleSubscriptionCreated
 *   SUBSCRIPTION_UPDATE          → handleSubscriptionUpdated
 *   SUBSCRIPTION_CANCEL          → handleSubscriptionCanceled
 *
 * Always returns 200 to prevent gateway retries on internal errors.
 *
 * Lookup strategy:
 * - Subscribers are located by gateway_customer_id or gateway_subscription_id
 * - These are opaque strings set when the subscription is created via webhook
 */

// ─── Supported internal event types ──────────────────────────────

type WebhookEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  | "payment.succeeded"
  | "payment.failed";

interface WebhookEvent {
  type: WebhookEventType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

// ─── Event handlers ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCreated(data: Record<string, any>) {
  const admin = createAdminClient();

  const {
    gateway_customer_id,
    gateway_subscription_id,
    email,
    status,
    current_period_start,
    current_period_end,
    trial_ends_at,
  } = data;

  if (!email && !gateway_customer_id) {
    console.warn("[webhook] subscription.created: missing email and gateway_customer_id");
    return;
  }

  const normalizedStatus = normalizeStatus(status);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("subscribers")
    .upsert(
      {
        email,
        gateway_customer_id: gateway_customer_id ?? null,
        gateway_subscription_id: gateway_subscription_id ?? null,
        status: normalizedStatus,
        current_period_start: current_period_start ?? null,
        current_period_end: current_period_end ?? null,
        trial_ends_at: trial_ends_at ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdated(data: Record<string, any>) {
  const admin = createAdminClient();

  const {
    gateway_customer_id,
    gateway_subscription_id,
    status,
    current_period_start,
    current_period_end,
    trial_ends_at,
    canceled_at,
  } = data;

  if (!gateway_customer_id && !gateway_subscription_id) {
    console.warn("[webhook] subscription.updated: missing gateway IDs — cannot look up subscriber");
    return;
  }

  const normalizedStatus = normalizeStatus(status);

  const updatePayload: Record<string, unknown> = {
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };
  if (current_period_start) updatePayload.current_period_start = current_period_start;
  if (current_period_end) updatePayload.current_period_end = current_period_end;
  if (trial_ends_at !== undefined) updatePayload.trial_ends_at = trial_ends_at;
  if (canceled_at) updatePayload.canceled_at = canceled_at;
  if (gateway_subscription_id) updatePayload.gateway_subscription_id = gateway_subscription_id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any).from("subscribers").update(updatePayload);

  if (gateway_subscription_id) {
    query = query.eq("gateway_subscription_id", gateway_subscription_id);
  } else {
    query = query.eq("gateway_customer_id", gateway_customer_id);
  }

  const { error } = await query;
  if (error) {
    console.error("[webhook] subscription.updated DB error:", error.message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCanceled(data: Record<string, any>) {
  const admin = createAdminClient();

  const { gateway_customer_id, gateway_subscription_id, canceled_at } = data;

  if (!gateway_customer_id && !gateway_subscription_id) {
    console.warn("[webhook] subscription.canceled: missing gateway IDs — cannot look up subscriber");
    return;
  }

  const updatePayload = {
    status: "canceled" as const,
    canceled_at: canceled_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any).from("subscribers").update(updatePayload);

  if (gateway_subscription_id) {
    query = query.eq("gateway_subscription_id", gateway_subscription_id);
  } else {
    query = query.eq("gateway_customer_id", gateway_customer_id);
  }

  const { error } = await query;
  if (error) {
    console.error("[webhook] subscription.canceled DB error:", error.message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentSucceeded(data: Record<string, any>) {
  const admin = createAdminClient();

  const {
    gateway_customer_id,
    gateway_subscription_id,
    gateway_payment_id,
    amount,
    currency,
    description,
    paid_at,
  } = data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subscriberQuery = (admin as any)
    .from("subscribers")
    .select("id, plan_id")
    .limit(1);

  if (gateway_subscription_id) {
    subscriberQuery = subscriberQuery.eq("gateway_subscription_id", gateway_subscription_id);
  } else if (gateway_customer_id) {
    subscriberQuery = subscriberQuery.eq("gateway_customer_id", gateway_customer_id);
  } else {
    console.warn("[webhook] payment.succeeded: missing gateway IDs — cannot record payment");
    return;
  }

  const { data: subscribers } = await subscriberQuery;
  const subscriber = subscribers?.[0];

  if (!subscriber) {
    console.warn("[webhook] payment.succeeded: subscriber not found for gateway IDs");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("payments").insert({
    subscriber_id: subscriber.id,
    plan_id: subscriber.plan_id ?? null,
    amount: amount ?? 0,
    currency: currency ?? "SAR",
    status: "paid",
    gateway_payment_id: gateway_payment_id ?? null,
    description: description ?? null,
    paid_at: paid_at ?? new Date().toISOString(),
  });

  if (error) {
    console.error("[webhook] payment.succeeded DB error:", error.message);
  }

  // Ensure subscriber is active after successful payment
  // Only upgrade from past_due / incomplete — don't downgrade trialing → active prematurely
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("subscribers")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", subscriber.id)
    .in("status", ["past_due", "incomplete"]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailed(data: Record<string, any>) {
  const admin = createAdminClient();

  const {
    gateway_customer_id,
    gateway_subscription_id,
    gateway_payment_id,
    amount,
    currency,
    description,
  } = data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subscriberQuery = (admin as any)
    .from("subscribers")
    .select("id, plan_id")
    .limit(1);

  if (gateway_subscription_id) {
    subscriberQuery = subscriberQuery.eq("gateway_subscription_id", gateway_subscription_id);
  } else if (gateway_customer_id) {
    subscriberQuery = subscriberQuery.eq("gateway_customer_id", gateway_customer_id);
  } else {
    console.warn("[webhook] payment.failed: missing gateway IDs — cannot record payment");
    return;
  }

  const { data: subscribers } = await subscriberQuery;
  const subscriber = subscribers?.[0];

  if (!subscriber) {
    console.warn("[webhook] payment.failed: subscriber not found for gateway IDs");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("payments").insert({
    subscriber_id: subscriber.id,
    plan_id: subscriber.plan_id ?? null,
    amount: amount ?? 0,
    currency: currency ?? "SAR",
    status: "failed",
    gateway_payment_id: gateway_payment_id ?? null,
    description: description ?? null,
    paid_at: null,
  });

  // Move subscriber to past_due
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("subscribers")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("id", subscriber.id)
    .eq("status", "active");
}

// ─── Status normalization ─────────────────────────────────────────

function normalizeStatus(
  gatewayStatus: string | undefined
): "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete" {
  const statusMap: Record<string, "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete"> = {
    trialing: "trialing",
    trial: "trialing",
    active: "active",
    captured: "active",
    past_due: "past_due",
    pastdue: "past_due",
    overdue: "past_due",
    canceled: "canceled",
    cancelled: "canceled",
    paused: "paused",
    suspended: "paused",
    incomplete: "incomplete",
    pending: "incomplete",
  };

  const key = (gatewayStatus ?? "").toLowerCase().replace(/[-\s]/g, "_");
  return statusMap[key] ?? "incomplete";
}

// ─── MPGS payload → internal event mapper ────────────────────────

/**
 * Map a raw MPGS webhook payload to our internal WebhookEvent shape.
 *
 * MPGS webhook body structure:
 * {
 *   "type": "PAYMENT" | "SUBSCRIPTION" | "SUBSCRIPTION_UPDATE" | "SUBSCRIPTION_CANCEL",
 *   "result": "SUCCESS" | "FAILURE",        // for PAYMENT events
 *   "order": { "status": "CAPTURED", ... },  // for SUBSCRIPTION events
 *   "transaction": { "id": "..." },
 *   "customer": { "id": "...", "email": "..." },
 *   "subscription": { "id": "..." },
 *   "response": { "gatewayCode": "..." }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMpgsPayload(raw: Record<string, any>): WebhookEvent | null {
  const mpgsType: string = raw.type ?? "";
  const result: string = raw.result ?? "";
  const orderStatus: string = raw.order?.status ?? "";
  const gatewayCode: string = raw.response?.gatewayCode ?? "";

  // Normalize VPC gateway code → simple status for the handlers
  const normalizedResult = normalizeVpcResponseCode(gatewayCode);

  // Build the flattened data object that all handlers expect
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {
    gateway_customer_id: raw.customer?.id ?? null,
    gateway_subscription_id: raw.subscription?.id ?? null,
    gateway_payment_id: raw.transaction?.id ?? null,
    // MPGS sends decimal amount; convert to cents for our payment records
    amount: raw.order?.amount != null ? Math.round(Number(raw.order.amount) * 100) : 0,
    currency: raw.order?.currency ?? "USD",
    email: raw.customer?.email ?? null,
    status: normalizedResult,
    // Period dates — MPGS may include these on subscription events
    current_period_start: raw.subscription?.startDate ?? null,
    current_period_end: raw.subscription?.endDate ?? null,
    trial_ends_at: raw.subscription?.trialEndDate ?? null,
    canceled_at: raw.subscription?.canceledDate ?? null,
    description: raw.order?.description ?? null,
    paid_at: raw.transaction?.timeOfRecord ?? new Date().toISOString(),
  };

  switch (mpgsType) {
    case "PAYMENT":
      if (result === "SUCCESS") {
        return { type: "payment.succeeded", data };
      }
      return { type: "payment.failed", data };

    case "SUBSCRIPTION":
      if (orderStatus === "CAPTURED") {
        return { type: "subscription.created", data };
      }
      // Other SUBSCRIPTION events (e.g. initial pending) fall through as an update
      return { type: "subscription.updated", data };

    case "SUBSCRIPTION_UPDATE":
      return { type: "subscription.updated", data };

    case "SUBSCRIPTION_CANCEL":
      return { type: "subscription.canceled", data };

    default:
      return null;
  }
}

// ─── POST /api/webhooks/payment ───────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 1. Read raw body for signature verification ─────────────────
  const rawBody = await request.text();

  // ── 2. Verify MPGS webhook secret ──────────────────────────────
  const receivedSecret = request.headers.get("x-notification-secret") ?? "";
  const { webhookSecret } = getMpgsCredentials();

  if (!verifyMpgsWebhook(rawBody, webhookSecret, receivedSecret)) {
    console.warn("[webhook] Invalid x-notification-secret — rejecting request");
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  // ── 3. Parse JSON body ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raw: Record<string, any>;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── 4. Map MPGS payload → internal event ───────────────────────
  const event = mapMpgsPayload(raw);

  if (!event) {
    const unknownType = raw.type ?? "(missing)";
    console.warn(`[webhook] Unrecognised MPGS event type: ${unknownType} — skipping`);
    // Still 200 — we don't want MPGS to keep retrying unknown types
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 5. Dispatch to handler ─────────────────────────────────────
  try {
    switch (event.type) {
      case "subscription.created":
        await handleSubscriptionCreated(event.data);
        break;

      case "subscription.updated":
        await handleSubscriptionUpdated(event.data);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(event.data);
        break;

      case "payment.succeeded":
        await handlePaymentSucceeded(event.data);
        break;

      case "payment.failed":
        await handlePaymentFailed(event.data);
        break;
    }
  } catch (err) {
    // Log but still return 200 — prevent infinite gateway retries
    console.error("[webhook] Error processing event:", err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
