import { NextRequest, NextResponse } from "next/server";
import { selectAd } from "@/lib/ads/serve";
import { SLOTS, type AdSlotName, type ServedAd } from "@/lib/ads/placements";
import { publicReadLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

/**
 * GET /api/ads/serve?slot=<slot>&section=<section-slug>
 *
 * Returns the creative for one page slot, or `data: null` when nothing is
 * booked (the slot then collapses). Never cached: every call is a fresh
 * rotation pick.
 */
export async function GET(request: NextRequest) {
  const rl = publicReadLimit(`ads:serve:${getClientIp(request)}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const slot = request.nextUrl.searchParams.get("slot") as AdSlotName | null;
  if (!slot || !(slot in SLOTS)) {
    return NextResponse.json({ error: "Unknown slot" } satisfies ApiResponse<never>, { status: 400 });
  }
  const section = request.nextUrl.searchParams.get("section");

  let ad: ServedAd | null = null;
  try {
    ad = await selectAd(slot, section);
  } catch (err) {
    // An ad failure must never break the page — serve nothing.
    console.error("[ads/serve]", err);
  }

  return NextResponse.json({ data: ad } satisfies ApiResponse<ServedAd | null>, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
