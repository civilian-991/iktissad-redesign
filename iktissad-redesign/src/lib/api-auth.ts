import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Verify Supabase Auth session for protected API routes (server-side).
 *
 * Uses the Supabase SSR server client (cookie-based session) which is the
 * correct approach post-Stack Auth removal.
 *
 * Returns { authenticated: true, userId } on success, or { authenticated: false }.
 */
export async function requireAuth(): Promise<{ authenticated: boolean; userId?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      return { authenticated: true, userId: user.id };
    }
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
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
