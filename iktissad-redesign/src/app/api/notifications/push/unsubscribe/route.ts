import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  publicReadLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = publicReadLimit(`push-unsubscribe:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { success: true } } satisfies ApiResponse<{ success: boolean }>);
}
