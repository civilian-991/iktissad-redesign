import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLikelyBot, deviceFromUserAgent } from "@/lib/ads/bots";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/track/pageview — one public page view (sent by <AudiencePing>).
 *
 * sendBeacon can't set headers, so this is CSRF-exempt in the proxy; all it
 * can do is add 1 to an anonymous daily counter. Country comes from Vercel's
 * edge geolocation header; device is classified from the user agent. Bots
 * and link-preview fetchers are dropped.
 */

const schema = z.object({ visitorId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent");
  if (isLikelyBot(ua)) return new NextResponse(null, { status: 204 });

  const rl = rateLimit(`pageview:${getClientIp(request)}`, { limit: 120, windowMs: 60_000 });
  if (!rl.allowed) return new NextResponse(null, { status: 204 });

  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(await request.text()));
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: "Invalid visitor" }, { status: 400 });

  const country = (request.headers.get("x-vercel-ip-country") ?? "").slice(0, 2).toUpperCase();

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).rpc("record_page_view", {
    p_visitor: parsed.data.visitorId,
    p_country: country,
    p_device: deviceFromUserAgent(ua ?? ""),
  });
  if (error) console.error("[track/pageview]", error.message);

  return new NextResponse(null, { status: 204 });
}
