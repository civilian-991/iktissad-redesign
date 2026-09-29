import { NextRequest, NextResponse } from "next/server";
import { adsGuard, badRequest, serverError } from "@/lib/ads/admin";
import { getAudienceSnapshot, type AudienceSnapshot } from "@/lib/ads/audience";
import type { ApiResponse } from "@/types";

/**
 * GET /api/admin/audience?from=YYYY-MM-DD&to=YYYY-MM-DD
 * The rate card's audience snapshot. Defaults to the last 30 complete days.
 */
export async function GET(request: NextRequest) {
  const denied = await adsGuard(request, "read");
  if (denied) return denied;

  const from = request.nextUrl.searchParams.get("from") ?? undefined;
  const to = request.nextUrl.searchParams.get("to") ?? undefined;
  const day = /^\d{4}-\d{2}-\d{2}$/;
  if ((from && !day.test(from)) || (to && !day.test(to)) || (from && to && to < from)) {
    return badRequest("فترة غير صالحة");
  }

  try {
    const data = await getAudienceSnapshot(from, to);
    return NextResponse.json({ data } satisfies ApiResponse<AudienceSnapshot>);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "audience query failed");
  }
}
