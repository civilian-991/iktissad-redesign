import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  authWriteLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

const sendSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional(),
  articleId: z.string().uuid().optional(),
});

/**
 * POST /api/admin/notifications/push/send
 * Broadcast a web push notification to all subscribers.
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const ip = getClientIp(request);
  const rl = authWriteLimit(`push-send:${ip}`);
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

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: "VAPID keys not configured" } satisfies ApiResponse<never>,
      { status: 503 }
    );
  }

  const admin = createAdminClient();

  // Get all push subscriptions
  const { data: subs, error: subsError } = await (
    admin.from("push_subscriptions") as any
  )
    .select("id, endpoint, p256dh, auth")
    .order("created_at", { ascending: false });

  if (subsError) {
    return NextResponse.json(
      { error: subsError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const subscriptions = (subs ?? []) as Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>;

  if (subscriptions.length === 0) {
    return NextResponse.json({
      data: { sent: 0, failed: 0 },
    } satisfies ApiResponse<{ sent: number; failed: number }>);
  }

  const payload = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url ?? "/",
    articleId: parsed.data.articleId,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
  });

  // Use web-push library if available, otherwise use fetch-based approach
  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  try {
    // Dynamic import of web-push
    const webpush = await import("web-push").catch(() => null);

    if (webpush) {
      webpush.setVapidDetails(
        "mailto:info@iktissad.com",
        vapidPublicKey,
        vapidPrivateKey
      );

      const results = await Promise.allSettled(
        subscriptions.map((sub) =>
          webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            { TTL: 60 * 60 } // 1 hour TTL
          )
        )
      );

      for (let i = 0; i < results.length; i++) {
        if (results[i].status === "fulfilled") {
          sent++;
        } else {
          failed++;
          const reason = (results[i] as PromiseRejectedResult).reason;
          // Remove expired subscriptions (410 Gone)
          if (reason?.statusCode === 410 || reason?.statusCode === 404) {
            expiredEndpoints.push(subscriptions[i].endpoint);
          }
        }
      }
    } else {
      // web-push not installed — return info
      return NextResponse.json({
        data: {
          sent: 0,
          failed: 0,
          message: "web-push package not installed. Run: npm install web-push",
        },
      });
    }
  } catch (err) {
    console.error("Push send error:", err);
    return NextResponse.json(
      { error: "Failed to send push notifications" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    void admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints)
      .then(() => {});
  }

  return NextResponse.json({
    data: { sent, failed, total: subscriptions.length },
  } satisfies ApiResponse<{ sent: number; failed: number; total: number }>);
}
