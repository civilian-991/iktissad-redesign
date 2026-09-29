import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { adsGuard, serverError } from "@/lib/ads/admin";
import { getAudienceSnapshot, compactNumber } from "@/lib/ads/audience";
import { getSiteSetting, type AdvertiseStats } from "@/lib/site-settings";
import type { ApiResponse } from "@/types";

/**
 * POST /api/admin/audience/publish
 *
 * Replaces the four headline figures on the public /advertise page with the
 * measured last-30-days numbers: monthly visitors, monthly page views,
 * confirmed newsletter subscribers, mobile share. The audience-profile bars
 * on that page are left as they are (they're editorial, not measured).
 */
export async function POST(request: NextRequest) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  try {
    const a = await getAudienceSnapshot();
    const current = (await getSiteSetting<AdvertiseStats>("advertise_stats")) ?? {};

    const next: AdvertiseStats = {
      ...current,
      stats: [
        { value: compactNumber(a.visitors), label: { ar: "زائر شهرياً", en: "Monthly visitors" } },
        { value: compactNumber(a.pageViews), label: { ar: "مشاهدة شهرياً", en: "Monthly page views" } },
        { value: compactNumber(a.newsletter.confirmed), label: { ar: "مشترك في النشرة", en: "Newsletter subscribers" } },
        {
          value: a.mobileShare == null ? "—" : `${Math.round(a.mobileShare * 100)}%`,
          label: { ar: "من الجوال", en: "On mobile" },
        },
      ],
    };

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from("site_settings") as any).upsert(
      { key: "advertise_stats", value: next, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) return serverError(error.message);

    revalidatePath("/advertise");
    return NextResponse.json({ data: next } satisfies ApiResponse<AdvertiseStats>);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "publish failed");
  }
}
