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

// ─── Shared REST helper ───────────────────────────────────────────

const MPGS_API_BASE = "https://ap-gateway.mastercard.com/api";
const MPGS_API_VERSION = "59";

/**
 * Low-level wrapper around the MPGS REST API.
 *
 * Builds the merchant-scoped URL, sets Basic auth + JSON content type,
 * parses the response, and throws on non-2xx / non-SUCCESS results so
 * callers get consistent error semantics.
 *
 * @param path   - path appended after `/api/rest/version/{ver}/merchant/{id}`.
 *                 Example: `"/order/ORD-1/transaction/TX-1"`.
 * @param init   - method + body (body is JSON-encoded automatically).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function mpgsFetch<T = Record<string, any>>(
  path: string,
  init: { method: "POST" | "GET" | "PUT" | "DELETE"; body?: unknown }
): Promise<T> {
  const creds = getMpgsCredentials();
  if (!creds.password) {
    throw new Error("[mpgs] MPGS_API_PASSWORD is not set");
  }

  const url = `${MPGS_API_BASE}/rest/version/${MPGS_API_VERSION}/merchant/${creds.merchantId}${path}`;

  // Basic auth: "merchant.{merchantId}:{password}"
  const authHeader =
    "Basic " + Buffer.from(`merchant.${creds.merchantId}:${creds.password}`).toString("base64");

  const response = await fetch(url, {
    method: init.method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`[mpgs] MPGS API error ${response.status}: ${text}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await response.json()) as Record<string, any>;

  // MPGS uses { result: "SUCCESS" | "FAILURE" | ... } on most endpoints.
  // Anything other than SUCCESS is an error from our perspective.
  if (json.result && json.result !== "SUCCESS") {
    throw new Error(
      `[mpgs] MPGS operation failed: ${json.result} — ${JSON.stringify(json.error ?? {})}`
    );
  }

  return json as T;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await mpgsFetch<Record<string, any>>("/session", {
    method: "POST",
    body: {
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
    },
  });

  const sessionId: string = json.session?.id ?? json.sessionId;
  const successIndicator: string = json.successIndicator ?? "";

  if (!sessionId) {
    throw new Error("[mpgs] MPGS response missing session.id");
  }

  return { sessionId, successIndicator };
}

// ─── Refunds ─────────────────────────────────────────────────────

export interface RefundResult {
  /** MPGS transaction id assigned to the refund leg. */
  refundId: string;
  /** Order status after refund (e.g. "REFUNDED", "PARTIALLY_REFUNDED"). */
  status: string;
  /** Raw amount echoed back by MPGS (decimal string). */
  amount?: string;
  /** Currency echoed back by MPGS. */
  currency?: string;
}

/**
 * Issue a (full or partial) refund against an existing MPGS transaction.
 *
 * Calls `POST /api/rest/version/59/merchant/{merchantId}/order/{orderId}/transaction/{txId}`
 * with `{ apiOperation: "REFUND", transaction: { amount, currency } }`.
 *
 * Per MPGS, every refund needs a *new* transaction id distinct from the
 * original capture/payment. We mint one by suffixing the source tx id.
 *
 * @param orderId        - MPGS order identifier from the original purchase.
 * @param transactionId  - MPGS transaction id from the original capture.
 * @param amount         - Optional partial-refund amount (decimal). Omit for full refund.
 * @param currency       - Currency code, defaults to "SAR".
 */
export async function refundTransaction(
  orderId: string,
  transactionId: string,
  amount?: number | string,
  currency: string = "SAR"
): Promise<RefundResult> {
  if (!orderId || !transactionId) {
    throw new Error("[mpgs] refundTransaction requires both orderId and transactionId");
  }

  // MPGS requires a new transaction id for the refund leg.
  const refundTxId = `RFND-${transactionId}-${Date.now()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    apiOperation: "REFUND",
  };

  if (amount !== undefined && amount !== null && Number(amount) > 0) {
    body.transaction = {
      amount: typeof amount === "string" ? amount : Number(amount).toFixed(2),
      currency,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await mpgsFetch<Record<string, any>>(
    `/order/${encodeURIComponent(orderId)}/transaction/${encodeURIComponent(refundTxId)}`,
    { method: "POST", body }
  );

  return {
    refundId: json.transaction?.id ?? refundTxId,
    status: json.order?.status ?? json.result ?? "REFUNDED",
    amount: json.transaction?.amount,
    currency: json.transaction?.currency,
  };
}

// ─── Webhook Verification ─────────────────────────────────────────

/**
 * Verify an MPGS Hosted Checkout webhook notification.
 *
 * Two verification modes are supported, selected via the `MPGS_WEBHOOK_HMAC`
 * environment flag:
 *
 * - **Plain mode** (default, backwards compatible): MPGS sends the shared
 *   secret verbatim in the `x-notification-secret` header. We do a
 *   timing-safe equal against `secret`. This is what the historical Drupal
 *   integration used and matches MPGS' default Hosted Checkout notification
 *   format. (See MPGS Webhook Notifications, "Authentication" section.)
 *
 * - **HMAC mode** (`MPGS_WEBHOOK_HMAC=true`): MPGS computes
 *   `HMAC-SHA256(rawBody, secret)` and sends the hex digest in the
 *   `x-notification-signature` header (this is the format MPGS recommends
 *   for newer integrations). We recompute the HMAC over the exact raw body
 *   bytes and compare timing-safely.
 *
 * Callers MUST pass the raw request body (string) — re-serialising parsed
 * JSON will not match because whitespace/key ordering differ.
 *
 * @param rawBody       - exact, unparsed request body string
 * @param secret        - expected shared secret (from getMpgsCredentials().webhookSecret)
 * @param signatureOrSecret - in plain mode: value of `x-notification-secret`;
 *                           in HMAC mode: value of `x-notification-signature`.
 */
export function verifyMpgsWebhook(
  rawBody: string,
  secret: string,
  signatureOrSecret: string
): boolean {
  if (!secret || !signatureOrSecret) return false;

  const useHmac = process.env.MPGS_WEBHOOK_HMAC === "true";

  if (useHmac) {
    try {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(rawBody, "utf8")
        .digest("hex");

      const a = Buffer.from(expected, "utf8");
      // Strip an optional "sha256=" prefix some gateways prepend.
      const provided = signatureOrSecret.replace(/^sha256=/i, "");
      const b = Buffer.from(provided, "utf8");
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  // Plain shared-secret comparison (legacy path)
  try {
    const a = Buffer.from(signatureOrSecret);
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
