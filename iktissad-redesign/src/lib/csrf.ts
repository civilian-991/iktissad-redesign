/**
 * CSRF Protection — double-submit cookie pattern.
 *
 * Flow:
 *   1. Client calls GET /api/auth/csrf → receives token + cookie is set
 *   2. Client stores token and sends it as X-CSRF-Token header on all mutations
 *   3. Server calls validateCsrfToken(request) — compares header vs cookie
 *
 * Security: SameSite=Strict on the cookie means cross-site pages can't read or
 * include it, so header == cookie is a reliable proof of same-origin intent.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Defined in the client-safe module so both sides share one source of truth.
export { CSRF_COOKIE, CSRF_HEADER } from "./csrf-client";
import { CSRF_COOKIE, CSRF_HEADER } from "./csrf-client";

/** Generate a cryptographically random hex token. */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Read the CSRF token from the current request's cookies.
 * Returns null if no token cookie is set.
 */
export async function getCsrfTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE)?.value ?? null;
}

/**
 * Validate that the X-CSRF-Token request header matches the csrf-token cookie.
 * Safe methods (GET, HEAD, OPTIONS) always pass.
 * Returns true if valid, false if the token is missing or mismatched.
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;
  // Constant-time comparison to avoid timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/** Return a 403 response for failed CSRF validation. */
export function csrfForbiddenResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
}

/** Timing-safe string comparison (prevents timing oracle attacks). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
