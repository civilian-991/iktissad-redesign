import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authEndpointLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ code: z.string().min(1).max(32) });

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * POST /api/auth/2fa/recover
 *
 * Exchange a recovery code for session elevation (AAL2).
 * Called during login when the user loses access to their TOTP app.
 *
 * The user must already have a valid AAL1 session.
 * On success: marks the code as used and returns { success: true }.
 * The frontend should then redirect to /admin (AAL1 is sufficient after
 * code consumption — the admin layout re-checks on each request).
 */
export async function POST(request: NextRequest) {
  // Strict rate limit: 10 attempts/min per IP
  const rl = authEndpointLimit(`2fa-recover:${getClientIp(request)}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  // Require an existing session (AAL1)
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
  }

  const { code } = parsed.data;
  const codeHash = await sha256Hex(code.toUpperCase().trim());
  const admin = createAdminClient();

  // Look up the code — must belong to this user and be unused
  const { data: row, error: lookupError } = await (admin as any)
    .from("totp_recovery_codes")
    .select("id, used_at")
    .eq("user_id", user.id)
    .eq("code_hash", codeHash)
    .maybeSingle();

  if (lookupError || !row) {
    return NextResponse.json({ error: "رمز الاسترداد غير صحيح" }, { status: 400 });
  }

  if (row.used_at) {
    return NextResponse.json({ error: "تم استخدام هذا الرمز مسبقاً" }, { status: 400 });
  }

  // Mark the code as used
  await (admin as any)
    .from("totp_recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  return NextResponse.json({ data: { success: true } });
}
