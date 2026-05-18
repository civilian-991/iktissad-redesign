import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateCsrfToken } from "@/lib/csrf";

// =============================================================================
// PUBLIC API KEY VALIDATION (Phase 10.2)
// =============================================================================

/**
 * SHA-256 hash a string using the Web Crypto API (available in Node.js 18+ and Edge).
 */
async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate a public API key from `Authorization: Bearer <key>` header.
 *
 * - Hashes the key, looks up in `api_keys` table
 * - Checks: is_active, expiry, rate limit (last-minute window)
 * - Logs the request to `api_usage_log`
 * - Returns key details on success
 */
export async function validateApiKey(
  request: Request,
  opts?: { endpoint?: string; statusCode?: number; responseTimeMs?: number }
): Promise<{
  valid: boolean;
  keyId?: string;
  scopes?: string[];
  rateLimitPerMinute?: number;
  error?: string;
}> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, error: "Missing Authorization header" };
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return { valid: false, error: "Empty API key" };
  }

  let keyHash: string;
  try {
    keyHash = await sha256Hex(rawKey);
  } catch {
    return { valid: false, error: "Key hashing failed" };
  }

  const admin = createAdminClient();

  // Look up key
  const { data: keyRow, error: lookupError } = await admin
    .from("api_keys")
    .select("id, is_active, expires_at, scopes, rate_limit_per_minute")
    .eq("key_hash", keyHash)
    .single();

  if (lookupError || !keyRow) {
    return { valid: false, error: "Invalid API key" };
  }

  const row = keyRow as unknown as {
    id: string;
    is_active: boolean;
    expires_at: string | null;
    scopes: string[];
    rate_limit_per_minute: number;
  };

  if (!row.is_active) {
    return { valid: false, error: "API key is inactive" };
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Rate limit check: count requests in last minute
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from("api_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", row.id)
    .gte("requested_at", oneMinuteAgo);

  if (count !== null && count >= row.rate_limit_per_minute) {
    return { valid: false, error: "Rate limit exceeded" };
  }

  // Update last_used_at (fire-and-forget, don't block response)
  void (admin as any)
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  // Log usage
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const userAgent = request.headers.get("user-agent") ?? null;

  void (admin as any).from("api_usage_log").insert({
    api_key_id: row.id,
    endpoint: opts?.endpoint ?? new URL(request.url).pathname,
    method: request.method,
    status_code: opts?.statusCode ?? null,
    response_time_ms: opts?.responseTimeMs ?? null,
    ip_address: ip,
    user_agent: userAgent,
  });

  return {
    valid: true,
    keyId: row.id,
    scopes: row.scopes,
    rateLimitPerMinute: row.rate_limit_per_minute,
  };
}

/**
 * Return a standard 401 response for invalid API key requests.
 */
export function apiKeyUnauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

/**
 * Return a standard 429 response for rate-limited requests.
 */
export function apiKeyRateLimitResponse() {
  return NextResponse.json(
    { success: false, error: "Rate limit exceeded. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": "60" },
    }
  );
}

/**
 * Verify Supabase Auth session for protected API routes (server-side).
 *
 * Uses the Supabase SSR server client (cookie-based session) which is the
 * correct approach post-Stack Auth removal.
 *
 * Optionally accepts the request to also validate the CSRF token (double-submit
 * cookie pattern). Pass `request` for any mutation endpoint that should be
 * CSRF-protected. Returns `csrfFailed: true` if CSRF validation fails.
 *
 * Returns { authenticated: true, userId } on success, or { authenticated: false }.
 */
export async function requireAuth(
  request?: Request
): Promise<{ authenticated: boolean; userId?: string; csrfFailed?: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      // Validate CSRF token when request is provided (mutation routes)
      if (request) {
        const csrfValid = await validateCsrfToken(request);
        if (!csrfValid) {
          return { authenticated: true, userId: user.id, csrfFailed: true };
        }
      }
      return { authenticated: true, userId: user.id };
    }
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}

/** Return a 403 response for CSRF validation failures. */
export function csrfForbiddenResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
}

/**
 * Overload that accepts a Request so we can also check the Authorization header.
 * Useful for service-to-service calls and CLI tools.
 */
export async function requireAuthFromRequest(
  request: Request
): Promise<{ authenticated: boolean; userId?: string }> {
  // First try cookie-based session (standard browser requests)
  const cookieAuth = await requireAuth();
  if (cookieAuth.authenticated) return cookieAuth;

  // Then try Authorization: Bearer <token>
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    // Allow service-role key as a shared secret for server-to-server calls
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey && token === serviceKey) {
      return { authenticated: true, userId: "service-role" };
    }

    // Try as a Supabase user access token
    const supabase = createAdminClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      return { authenticated: true, userId: user.id };
    }
  }

  return { authenticated: false };
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}

/**
 * Admin role gate — requires the caller to be authenticated AND hold one of
 * the specified roles in the `admin_roles` table.
 *
 * Wraps `requireAuth(request)` (which also handles CSRF when `request` is
 * provided) and then looks up the caller's `admin_roles.role`.
 *
 * Returns:
 * - { ok: true, userId, role } on success
 * - { ok: false, response } with a ready-made NextResponse on failure
 *   (401 unauthenticated, 403 csrf, 403 forbidden role)
 *
 * The caller's `userId` is also returned for downstream audit logging.
 */
export type AdminRole =
  | "super_admin"
  | "editor"
  | "writer"
  | "finance"
  | "advertiser_manager";

export async function requireRole(
  request: Request,
  allowed: ReadonlyArray<AdminRole>
): Promise<
  | { ok: true; userId: string; role: AdminRole }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireAuth(request);
  if (!auth.authenticated || !auth.userId) {
    return { ok: false, response: unauthorizedResponse() };
  }
  if (auth.csrfFailed) {
    return { ok: false, response: csrfForbiddenResponse() };
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin.from("admin_roles") as any)
    .select("role")
    .eq("user_id", auth.userId)
    .single();

  const role = (row as { role: AdminRole } | null)?.role ?? null;
  if (!role || !allowed.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden — insufficient role" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: auth.userId, role };
}
