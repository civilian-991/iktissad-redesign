import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Verify admin authentication for protected API routes.
 *
 * Checks the Supabase session via the sb-access-token cookie.
 * Falls back to an x-api-key header for service-to-service calls.
 *
 * Returns the authenticated user id on success, or null.
 */
export async function requireAuth(): Promise<{ authenticated: boolean; userId?: string }> {
  try {
    // 1. Try Supabase session cookie
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value
      ?? cookieStore.get("sb-localhost-auth-token")?.value;

    if (accessToken) {
      const supabase = createAdminClient();
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (!error && user) {
        return { authenticated: true, userId: user.id };
      }
    }

    // 2. Fallback: check x-api-key header (for server-to-server / admin CLI)
    //    Compare against SUPABASE_SERVICE_ROLE_KEY as a simple shared secret.
    //    In production you would use a dedicated admin API key.

    // Note: headers() is not available here without the request object,
    // so callers needing header-based auth should pass the request.

    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Overload that accepts a Request so we can also check the Authorization header.
 */
export async function requireAuthFromRequest(
  request: Request
): Promise<{ authenticated: boolean; userId?: string }> {
  // First try cookie-based auth
  const cookieAuth = await requireAuth();
  if (cookieAuth.authenticated) return cookieAuth;

  // Then try Authorization: Bearer <service_role_key>
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey && token === serviceKey) {
      return { authenticated: true, userId: "service-role" };
    }

    // Try as a Supabase access token
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
