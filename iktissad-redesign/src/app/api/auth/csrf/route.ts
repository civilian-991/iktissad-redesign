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
 * - Otherwise generates a new one and sets the cookie.
 *
 * Clients should call this once on mount and include the returned token
 * as the X-CSRF-Token header on all POST/PUT/DELETE requests.
 */
export async function GET() {
  let token = await getCsrfTokenFromCookie();
  const isNew = !token;

  if (!token) {
    token = generateCsrfToken();
  }

  const response = NextResponse.json({ csrfToken: token });

  if (isNew) {
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false, // Must be JS-readable so client can include in header
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 86400, // 24 hours
    });
  }

  return response;
}
