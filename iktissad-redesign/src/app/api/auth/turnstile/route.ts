import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";
import type { ApiResponse } from "@/types";

/**
 * POST /api/auth/turnstile
 * Verifies a Cloudflare Turnstile token before the login page proceeds
 * with Supabase auth (which has no server-side hook for bot checks).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const token = (body as Record<string, unknown>)?.turnstileToken;
  if (typeof token !== "string" || !token) {
    return NextResponse.json(
      { error: "Missing turnstileToken" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const isHuman = await verifyTurnstile(token, ip);
  if (!isHuman) {
    return NextResponse.json(
      { error: "Bot verification failed" } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  return NextResponse.json(
    { data: { success: true } } satisfies ApiResponse<{ success: boolean }>,
    { status: 200 }
  );
}
