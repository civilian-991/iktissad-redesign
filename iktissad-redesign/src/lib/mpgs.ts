// src/lib/mpgs.ts
// Mastercard Payment Gateway Services (MPGS) Hosted Checkout integration
// Based on the original Drupal iktcommerce module (mpgs.inc + VPCPaymentConnection.php)

import crypto from "crypto";

// ─── Credentials ──────────────────────────────────────────────────

export interface MpgsCredentials {
  merchantId: string;
  password: string;
  webhookSecret: string;
  checkoutSessionUrl: string;
  payUrl: string;
  isLive: boolean;
}

/**
 * Read MPGS credentials from environment variables.
 * In test mode, automatically prepends "TEST" to the merchant ID
 * (matching the Drupal module behaviour).
 */
export function getMpgsCredentials(): MpgsCredentials {
  const mode = process.env.MPGS_MODE ?? "test";
  const isLive = mode === "live";

  let merchantId = process.env.MPGS_MERCHANT_ID ?? "803204000";

  // In test mode, prepend TEST if not already present
  if (!isLive && !merchantId.startsWith("TEST")) {
    merchantId = `TEST${merchantId}`;
  }

  const password = process.env.MPGS_API_PASSWORD ?? "";
  const webhookSecret = process.env.MPGS_WEBHOOK_SECRET ?? "ABCDEF123456GHIJKL789";

  const baseUrl = "https://ap-gateway.mastercard.com/api";
  const checkoutSessionUrl = `${baseUrl}/rest/version/59/merchant/${merchantId}/session`;
  const payUrl = `${baseUrl}/page/version/59/pay`;

  return { merchantId, password, webhookSecret, checkoutSessionUrl, payUrl, isLive };
}

// ─── Checkout Session ─────────────────────────────────────────────

export interface CheckoutSessionParams {
  orderId: string;
  amount: string; // decimal string, e.g. "19.99"
  currency?: string;
  description?: string;
  returnUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  successIndicator: string;
}

/**
 * Call the MPGS REST API to create a Hosted Checkout session.
 * Returns { sessionId, successIndicator } on success, throws on failure.
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const { orderId, amount, currency = "USD", description = "", returnUrl } = params;
  const creds = getMpgsCredentials();

  if (!creds.password) {
    throw new Error("[mpgs] MPGS_API_PASSWORD is not set");
  }

  // Basic auth: "merchant.{merchantId}:{password}"
  const authHeader =
    "Basic " + Buffer.from(`merchant.${creds.merchantId}:${creds.password}`).toString("base64");

  const body = {
    apiOperation: "CREATE_CHECKOUT_SESSION",
    interaction: {
      operation: "PURCHASE",
      returnUrl,
    },
    order: {
      id: orderId,
      amount,
      currency,
      description,
    },
  };

  const response = await fetch(creds.checkoutSessionUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`[mpgs] MPGS API error ${response.status}: ${text}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await response.json()) as Record<string, any>;

  // MPGS returns { result: "SUCCESS", session: { id, ... }, successIndicator }
  if (json.result !== "SUCCESS") {
    throw new Error(`[mpgs] MPGS session creation failed: ${json.result} — ${JSON.stringify(json.error ?? {})}`);
  }

  const sessionId: string = json.session?.id ?? json.sessionId;
  const successIndicator: string = json.successIndicator ?? "";

  if (!sessionId) {
    throw new Error("[mpgs] MPGS response missing session.id");
  }

  return { sessionId, successIndicator };
}

// ─── Webhook Verification ─────────────────────────────────────────

/**
 * Verify an MPGS Hosted Checkout webhook notification.
 *
 * MPGS sends the plain webhook secret in the `x-notification-secret` header
 * (not an HMAC digest). Verification is a direct string comparison.
 *
 * @param receivedSecret - value from the x-notification-secret header
 * @param secret         - expected secret (from getMpgsCredentials().webhookSecret)
 */
export function verifyMpgsWebhook(
  rawBody: string, // kept for API symmetry; MPGS does not use HMAC over body
  secret: string,
  receivedSecret: string
): boolean {
  // Avoid timing attacks by using timingSafeEqual even for plain comparison
  try {
    const a = Buffer.from(receivedSecret);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── VPC Signature Verification ──────────────────────────────────

/**
 * Verify a MIGS VPC payment response signature.
 *
 * Port of VPCPaymentConnection::validateSignature() (PHP) from the Drupal module.
 *
 * Algorithm:
 *   1. Remove vpc_SecureHash and vpc_SecureHashType from the param map
 *   2. Sort remaining params alphabetically by key
 *   3. Build "key=value&..." for all vpc_ prefixed params with non-empty values
 *   4. Compute HMAC-SHA256 using Buffer.from(secureSecret, 'hex') as key
 *   5. Compare uppercase hex digest to params.vpc_SecureHash
 *
 * @param params       - all query/post params from the VPC return URL
 * @param secureSecret - hex-encoded HMAC secret (e.g. "7F04C320FBEDC917CBFE78C1B21B7168")
 */
export function verifyVpcSignature(
  params: Record<string, string>,
  secureSecret: string
): boolean {
  const receivedHash = params["vpc_SecureHash"];
  if (!receivedHash) return false;

  // Build the filtered, sorted param list
  const filtered = Object.entries(params)
    .filter(([key]) => key !== "vpc_SecureHash" && key !== "vpc_SecureHashType")
    .filter(([key, value]) => key.startsWith("vpc_") && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  const message = filtered.map(([k, v]) => `${k}=${v}`).join("&");

  let keyBuffer: Buffer;
  try {
    keyBuffer = Buffer.from(secureSecret, "hex");
  } catch {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", keyBuffer)
    .update(message, "utf8")
    .digest("hex")
    .toUpperCase();

  return digest === receivedHash.toUpperCase();
}

// ─── VPC Response Code Normalization ─────────────────────────────

export type VpcNormalizedResult = "success" | "declined" | "error" | "pending";

/**
 * Normalize a MIGS VPC vpc_TxnResponseCode to a simple status.
 *
 * Port of PaymentCodesHelper.php from the Drupal module.
 *
 * Code reference:
 *   "0"                         → success
 *   "A" | "C"                   → declined (aborted / cancelled by user)
 *   "D" | "P" | "M"             → pending
 *   "1","2","4","5","9","B","F",
 *   "I","T","U","V"             → declined (hard decline)
 *   everything else             → error
 */
export function normalizeVpcResponseCode(code: string): VpcNormalizedResult {
  switch (code) {
    case "0":
      return "success";

    case "A":
    case "C":
      // User aborted or cancelled
      return "declined";

    case "D":
    case "P":
    case "M":
      // Deferred / pending authorisation
      return "pending";

    case "1":
    case "2":
    case "4":
    case "5":
    case "9":
    case "B":
    case "F":
    case "I":
    case "T":
    case "U":
    case "V":
      // Hard declines
      return "declined";

    default:
      return "error";
  }
}
