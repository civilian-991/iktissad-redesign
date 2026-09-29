import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLACEMENT_KEYS } from "@/lib/ads/placements";
import { isLikelyBot } from "@/lib/ads/bots";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/ads/click/[id]?p=<placement> — counts a click, then sends the
 * reader to the advertiser.
 *
 * The destination always comes from the database, never from the URL, so this
 * can't be used as an open redirect. HTML5 creatives receive this URL as their
 * clickTag.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ad } = await (admin.from("ads") as any)
    .select("target_url, placement")
    .eq("id", id)
    .maybeSingle();

  if (!ad?.target_url) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const p = request.nextUrl.searchParams.get("p");
  const placement = p && (PLACEMENT_KEYS as string[]).includes(p) ? p : ad.placement ?? "";

  const rl = rateLimit(`ads:click:${getClientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (rl.allowed && !isLikelyBot(request.headers.get("user-agent"))) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).rpc("record_ad_event", {
      p_subject_type: "ad",
      p_subject_id: id,
      p_placement: placement,
      p_kind: "click",
    });
    if (error) console.error("[ads/click]", error.message);
  }

  return NextResponse.redirect(ad.target_url, { status: 302 });
}
