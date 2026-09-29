import { NextResponse } from "next/server";
import {
  generateCsrfToken,
  getCsrfTokenFromCookie,
  CSRF_COOKIE,
} from "@/lib/csrf";

/**
 * GET /api/auth/csrf
 *
 * Returns a CSRF token for the current session.
 * - If a token cookie already exists, returns it (idempotent).
 * - Otherwise generates a new one.
 *
 * The cookie is re-set on every call, so its 24h Max-Age slides forward while
 * someone is working. Setting it only on first mint meant the cookie died
 * exactly 24h after the first visit — mid-edit, if that's where the clock fell.
 *
 * Clients should include the returned token as the X-CSRF-Token header on all
 * POST/PUT/DELETE requests; src/lib/csrf-client.ts does that for them.
 */
export async function GET() {
  const token = (await getCsrfTokenFromCookie()) ?? generateCsrfToken();

  const response = NextResponse.json({ csrfToken: token });

  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // Must be JS-readable so client can include in header
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86400, // 24 hours, refreshed on every call
  });

  // Never let a cache hand one browser another browser's token.
  response.headers.set("Cache-Control", "no-store, private");

  return response;
}
