import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/webhooks/payment
 *
 * Gateway-agnostic webhook handler for payment events.
 *
 * This is a skeleton implementation. When payment gateway docs arrive,
 * fill in the signature verification section and gateway-specific event parsing.
 *
 * The handler responds 200 quickly and performs DB updates synchronously.
 * For high-volume production, move DB updates to a background queue.
 *
 * Lookup strategy:
 * - Subscribers are located by gateway_customer_id or gateway_subscription_id
 * - These are opaque strings set when the subscription is created via webhook
 */

// ─── Supported event types ────────────────────────────────────────

type WebhookEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  | "payment.succeeded"
  | "payment.failed";

interface WebhookEvent {
  type: WebhookEventType;
  // Gateway-specific payload — structure varies by provider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

// ─── Event handlers ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCreated(data: Record<string, any>) {
  const admin = createAdminClient();

  // TODO: Map gateway-specific field names to our schema once docs arrive
  // Expected fields (gateway-dependent):
  //   gatewayCustomerId  — opaque customer ID from gateway
  //   gatewaySubscriptionId — opaque subscription ID from gateway
  //   status             — normalize to our subscription_status enum
  //   currentPeriodStart — ISO 8601 string
  //   currentPeriodEnd   — ISO 8601 string
  //   trialEndsAt        — ISO 8601 string or null

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

  // Normalize status to our enum (gateway may use different names)
  const normalizedStatus = normalizeStatus(status);

  // Upsert by email (or gateway_customer_id if email not present)
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

  // TODO: Map gateway-specific field names to our schema once docs arrive
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

  // Prefer lookup by gateway_subscription_id, fall back to gateway_customer_id
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

  // TODO: Map gateway-specific field names to our schema once docs arrive
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

  // TODO: Map gateway-specific field names to our schema once docs arrive
  // Expected fields (gateway-dependent):
  //   gateway_customer_id
  //   gateway_payment_id — unique payment transaction ID from gateway
  //   amount             — amount in smallest currency unit or decimal
  //   currency           — ISO 4217 currency code (e.g., "SAR")
  //   description        — optional payment description
  //   paid_at            — ISO 8601 timestamp

  const {
    gateway_customer_id,
    gateway_subscription_id,
    gateway_payment_id,
    amount,
    currency,
    description,
    paid_at,
  } = data;

  // Look up the subscriber
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

  // Record the payment
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

  // Ensure subscriber status is active after successful payment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let updateQuery = (admin as any)
    .from("subscribers")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", subscriber.id)
    // Only update if currently past_due (don't downgrade trialing → active prematurely)
    .in("status", ["past_due", "incomplete"]);

  await updateQuery;
  // Ignore error — subscriber may already be active
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailed(data: Record<string, any>) {
  const admin = createAdminClient();

  // TODO: Map gateway-specific field names to our schema once docs arrive
  const {
    gateway_customer_id,
    gateway_subscription_id,
    gateway_payment_id,
    amount,
    currency,
    description,
  } = data;

  // Look up the subscriber
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

  // Record failed payment
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

/**
 * Normalize gateway-specific status strings to our subscription_status enum.
 * Extend this mapping when gateway docs arrive.
 */
function normalizeStatus(
  gatewayStatus: string | undefined
): "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete" {
  // TODO: Add gateway-specific status mappings here once docs arrive
  // Example for a hypothetical gateway:
  //   "TRIAL" → "trialing"
  //   "ACTIVE" → "active"
  //   "OVERDUE" → "past_due"
  //   etc.

  const statusMap: Record<string, "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete"> = {
    trialing: "trialing",
    trial: "trialing",
    active: "active",
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

// ─── POST /api/webhooks/payment ───────────────────────────────────

export async function POST(request: NextRequest) {
  // TODO: Verify webhook signature from [payment gateway name]
  // This is gateway-specific — uncomment and implement when docs arrive:
  //
  // const rawBody = await request.text();
  // const signature = request.headers.get("x-gateway-signature") ?? "";
  // const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET ?? "";
  //
  // Example for HMAC-SHA256 verification (common pattern):
  // import crypto from "crypto";
  // const expectedSig = crypto
  //   .createHmac("sha256", webhookSecret)
  //   .update(rawBody)
  //   .digest("hex");
  // if (signature !== expectedSig) {
  //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  // }
  //
  // For now, parse body directly (no signature check):

  let event: WebhookEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!event?.type) {
    return NextResponse.json({ error: "Missing event type" }, { status: 400 });
  }

  // Return 200 immediately to acknowledge receipt (gateway expects fast response)
  // Process event synchronously for now — move to background queue in production
  // if event processing takes > 5 seconds

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

      default: {
        // Unknown event type — log and acknowledge to prevent gateway retries
        const unknownType = (event as { type: string }).type;
        console.warn(`[webhook] Unknown event type: ${unknownType} — skipping`);
        break;
      }
    }
  } catch (err) {
    // Log but still return 200 to prevent infinite retries from the gateway
    console.error("[webhook] Error processing event:", err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
