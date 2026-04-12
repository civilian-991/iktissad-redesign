import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authEndpointLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

/**
 * GET /api/user/data-export
 *
 * GDPR Article 20 — Right to Data Portability.
 * Returns all data held for the authenticated user as a JSON download.
 *
 * Collected tables: auth profile, users row, subscribers row,
 * newsletter_subscribers row, comments.
 */
export async function GET(request: NextRequest) {
  // Strict rate limit: 5 exports/hour per IP (prevent scraping)
  const ip = getClientIp(request);
  const rl = authEndpointLimit(`data-export:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const auth = await requireAuth();
  if (!auth.authenticated || !auth.userId) return unauthorizedResponse();

  const userId = auth.userId;
  const supabase = await createClient();
  const admin = createAdminClient();

  // Collect all data in parallel — failures on individual tables are non-fatal
  const [
    authUserResult,
    userRowResult,
    subscriberResult,
    newsletterSubResult,
    commentsResult,
  ] = await Promise.allSettled([
    supabase.auth.getUser(),
    (admin as any).from("users").select("*").eq("id", userId).maybeSingle(),
    (admin as any)
      .from("subscribers")
      .select("id, email, status, plan_id, created_at, current_period_start, current_period_end, canceled_at")
      .eq("user_id", userId)
      .maybeSingle(),
    (admin as any)
      .from("newsletter_subscribers")
      .select("email, subscribed_at, status")
      .eq("user_id", userId)
      .maybeSingle(),
    (admin as any)
      .from("comments")
      .select("id, article_id, content, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    userId,
    authProfile:
      authUserResult.status === "fulfilled"
        ? {
            email: authUserResult.value.data?.user?.email,
            emailConfirmedAt: authUserResult.value.data?.user?.email_confirmed_at,
            lastSignInAt: authUserResult.value.data?.user?.last_sign_in_at,
            createdAt: authUserResult.value.data?.user?.created_at,
          }
        : null,
    profile:
      userRowResult.status === "fulfilled" ? userRowResult.value.data : null,
    subscription:
      subscriberResult.status === "fulfilled"
        ? subscriberResult.value.data
        : null,
    newsletterSubscription:
      newsletterSubResult.status === "fulfilled"
        ? newsletterSubResult.value.data
        : null,
    comments:
      commentsResult.status === "fulfilled"
        ? (commentsResult.value.data ?? [])
        : [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="iktissad-data-export-${userId.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
