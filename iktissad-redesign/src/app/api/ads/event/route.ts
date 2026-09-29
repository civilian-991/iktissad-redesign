import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServableAd } from "@/lib/ads/serve";
import { PLACEMENT_KEYS } from "@/lib/ads/placements";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isLikelyBot } from "@/lib/ads/bots";

/**
 * POST /api/ads/event — counts one viewable impression.
 *
 * Sent with navigator.sendBeacon once at least half of the creative has been
 * on screen for a second (the IAB viewability standard), so the numbers we
 * bill CPM on are views, not page loads. sendBeacon can't set headers, so this
 * route is CSRF-exempt in the proxy; it only ever increments a counter for an
 * ad that is currently live, and is rate-limited per IP.
 *
 * Clicks are counted by the redirect at /api/ads/click/[id].
 */

const schema = z.object({
  id: z.string().uuid(),
  placement: z.enum(PLACEMENT_KEYS as [string, ...string[]]),
});

export async function POST(request: NextRequest) {
  if (isLikelyBot(request.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 204 });
  }

  // A reader sees a handful of ads per page; 60/min is generous for a person.
  const rl = rateLimit(`ads:event:${getClientIp(request)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    // sendBeacon posts text/plain.
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const { id, placement } = parsed.data;
  if (!(await isServableAd(id))) {
    return new NextResponse(null, { status: 204 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).rpc("record_ad_event", {
    p_subject_type: "ad",
    p_subject_id: id,
    p_placement: placement,
    p_kind: "impression",
  });
  if (error) console.error("[ads/event]", error.message);

  return new NextResponse(null, { status: 204 });
}
