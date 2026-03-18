import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyVpcSignature, normalizeVpcResponseCode } from "@/lib/mpgs";

/**
 * GET /api/checkout/vpc-return
 *
 * MIGS VPC redirect-return handler.
 * After the customer completes (or abandons) payment on the MIGS page,
 * they are redirected here with all vpc_* parameters in the query string.
 *
 * No authentication required — this is a browser redirect from the gateway.
 *
 * Flow:
 *   1. Verify VPC HMAC-SHA256 signature
 *   2. Normalise vpc_TxnResponseCode → success / declined / error / pending
 *   3. Update the `payments` row (looked up by our orderId in vpc_MerchTxnRef)
 *   4. Redirect the user to the appropriate page
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://iktissad.com";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Collect all query params into a plain object
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // ── 1. Verify VPC signature ─────────────────────────────────────
  const vpcSecureSecret =
    process.env.VPC_SECURE_SECRET ?? "7F04C320FBEDC917CBFE78C1B21B7168";

  const signatureValid = verifyVpcSignature(params, vpcSecureSecret);

  if (!signatureValid) {
    console.warn("[vpc-return] Invalid VPC signature — rejecting redirect");
    return NextResponse.redirect(
      `${SITE_URL}/subscribe?error=invalid_signature`,
      { status: 302 }
    );
  }

  // ── 2. Extract key VPC fields ───────────────────────────────────
  const txnResponseCode = params["vpc_TxnResponseCode"] ?? "";
  const merchTxnRef = params["vpc_MerchTxnRef"] ?? "";   // our orderId
  const transactionNo = params["vpc_TransactionNo"] ?? ""; // MIGS transaction reference
  const amount = params["vpc_Amount"] ?? "0";             // amount in minor units (cents)

  // ── 3. Normalise response code ──────────────────────────────────
  const normalizedResult = normalizeVpcResponseCode(txnResponseCode);

  const admin = createAdminClient();

  // ── 4. Handle success ───────────────────────────────────────────
  if (normalizedResult === "success") {
    // Update the pending payment record to paid
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: payments, error: fetchError } = await (admin as any)
      .from("payments")
      .select("id, subscriber_id")
      .eq("description", merchTxnRef)  // we stored orderId in description column
      .eq("status", "pending")
      .limit(1);

    if (fetchError) {
      console.error("[vpc-return] Failed to fetch payment record:", fetchError.message);
    }

    const payment = payments?.[0];

    if (payment) {
      // Mark payment as paid
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: paymentUpdateError } = await (admin as any)
        .from("payments")
        .update({
          status: "paid",
          gateway_payment_id: transactionNo || null,
          amount_cents: parseInt(amount, 10),
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (paymentUpdateError) {
        console.error("[vpc-return] Failed to update payment to paid:", paymentUpdateError.message);
      }

      // Activate the subscriber
      if (payment.subscriber_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: subscriberUpdateError } = await (admin as any)
          .from("subscribers")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.subscriber_id);

        if (subscriberUpdateError) {
          console.error("[vpc-return] Failed to activate subscriber:", subscriberUpdateError.message);
        }
      }
    } else {
      // Payment record not found — log but still redirect to success
      // (webhook may have already processed it, or orderId mismatch)
      console.warn(
        `[vpc-return] No pending payment found for orderId: ${merchTxnRef} — may have been processed already`
      );
    }

    return NextResponse.redirect(
      `${SITE_URL}/subscribe/success?order=${encodeURIComponent(merchTxnRef)}`,
      { status: 302 }
    );
  }

  // ── 5. Handle declined / error / pending ───────────────────────
  // Mark the payment as failed (for declined and error; leave pending as-is)
  if (normalizedResult === "declined" || normalizedResult === "error") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (admin as any)
      .from("payments")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("description", merchTxnRef)
      .eq("status", "pending");

    if (updateError) {
      console.error("[vpc-return] Failed to mark payment as failed:", updateError.message);
    }
  }

  return NextResponse.redirect(
    `${SITE_URL}/subscribe?error=${encodeURIComponent(normalizedResult)}&order=${encodeURIComponent(merchTxnRef)}`,
    { status: 302 }
  );
}
