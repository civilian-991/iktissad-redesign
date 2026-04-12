import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  publicReadLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = publicReadLimit(`push-subscribe:${ip}`);
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

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  // Get user if authenticated (optional — anonymous push is allowed)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data, error } = await (admin.from("push_subscriptions") as any)
    .upsert(
      {
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_id: user?.id ?? null,
      },
      { onConflict: "endpoint" }
    )
    .select("id, endpoint, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data } satisfies ApiResponse<typeof data>, {
    status: 201,
  });
}
