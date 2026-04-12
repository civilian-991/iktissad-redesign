import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const CODE_COUNT = 10;
const CODE_LENGTH = 8; // characters, alphanumeric, uppercase

/** Generate a random alphanumeric recovery code. */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * POST /api/auth/2fa/recovery-codes
 *
 * Generate a fresh set of recovery codes for the authenticated user.
 * Deletes existing unused codes before inserting new ones.
 * Returns the plaintext codes ONCE — they are never stored in plaintext.
 */
export async function POST() {
  const auth = await requireAuth();
  if (!auth.authenticated || !auth.userId) return unauthorizedResponse();

  const admin = createAdminClient();
  const userId = auth.userId;

  // Delete all existing recovery codes for this user
  await (admin as any).from("totp_recovery_codes").delete().eq("user_id", userId);

  // Generate new codes
  const plainCodes: string[] = [];
  for (let i = 0; i < CODE_COUNT; i++) {
    plainCodes.push(generateCode());
  }

  // Hash and insert
  const rows = await Promise.all(
    plainCodes.map(async (code) => ({
      user_id: userId,
      code_hash: await sha256Hex(code),
    }))
  );

  const { error } = await (admin as any).from("totp_recovery_codes").insert(rows);
  if (error) {
    return NextResponse.json({ error: "فشل إنشاء رموز الاسترداد" }, { status: 500 });
  }

  // Return plaintext codes — shown once, never retrievable again
  return NextResponse.json({ data: { codes: plainCodes } }, { status: 201 });
}

/**
 * DELETE /api/auth/2fa/recovery-codes
 *
 * Revoke all recovery codes (called when 2FA is disabled).
 */
export async function DELETE() {
  const auth = await requireAuth();
  if (!auth.authenticated || !auth.userId) return unauthorizedResponse();

  const admin = createAdminClient();
  await (admin as any).from("totp_recovery_codes").delete().eq("user_id", auth.userId);

  return NextResponse.json({ data: { success: true } });
}
