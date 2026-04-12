import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, csrfForbiddenResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authEndpointLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

/**
 * DELETE /api/user/delete-account
 *
 * GDPR Article 17 — Right to Erasure.
 * Deletes the authenticated user's personal data and Supabase Auth account.
 *
 * Steps:
 *   1. Soft-delete / anonymise the users row (keep id for FK integrity)
 *   2. Remove newsletter subscription
 *   3. Anonymise comments (replace content with deletion notice)
 *   4. Cancel active subscription row
 *   5. Delete the Supabase Auth user (hard delete — irreversible)
 *
 * The caller must re-authenticate just before calling this endpoint.
 * Protected by CSRF token validation.
 */
export async function DELETE(request: NextRequest) {
  // Strict rate limit to prevent brute-force account deletion attempts
  const ip = getClientIp(request);
  const rl = authEndpointLimit(`delete-account:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const auth = await requireAuth(request);
  if (!auth.authenticated || !auth.userId) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();

  const userId = auth.userId;
  const supabase = await createClient();
  const admin = createAdminClient();

  // Get user's email before deletion (needed for newsletter lookup)
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const userEmail = authUser?.email ?? null;

  // Step 1: Anonymise the users row (keep id for FK references)
  await (admin as any)
    .from("users")
    .update({
      name: "[حساب محذوف]",
      email: `deleted-${userId}@deleted.invalid`,
      avatar: "",
      status: "inactive",
    })
    .eq("id", userId);

  // Step 2: Remove newsletter subscription
  if (userEmail) {
    await (admin as any)
      .from("newsletter_subscribers")
      .delete()
      .eq("email", userEmail);
  }

  // Step 3: Anonymise comments
  await (admin as any)
    .from("comments")
    .update({ content: "[تم حذف هذا التعليق بناءً على طلب المستخدم]" })
    .eq("user_id", userId);

  // Step 4: Cancel active subscription
  await (admin as any)
    .from("subscribers")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"]);

  // Step 5: Delete the Supabase Auth account (irreversible)
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json(
      { error: "تعذر حذف الحساب. يرجى التواصل مع الدعم الفني." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { message: "تم حذف حسابك بنجاح. نأسف لرؤيتك تغادر." },
  });
}
