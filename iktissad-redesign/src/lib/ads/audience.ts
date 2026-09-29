import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The "Audience snapshot" on the rate card, from first-party data:
 * page views and unique visitors (AudiencePing), country and device split,
 * article reads (reading_sessions) and newsletter subscribers.
 */

export interface AudienceSnapshot {
  period: { from: string; to: string; days: number };
  /** Days in the period that actually have tracking data. */
  daysWithData: number;
  pageViews: number;
  visitors: number;
  articleReads: number;
  countries: { country: string; visitors: number; share: number }[];
  devices: { device: "mobile" | "tablet" | "desktop"; views: number; share: number }[];
  mobileShare: number | null;
  newsletter: { confirmed: number; unconfirmed: number };
}

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export async function getAudienceSnapshot(from?: string, to?: string): Promise<AudienceSnapshot> {
  const toDay = to ?? isoDay(new Date(Date.now() - DAY_MS)); // yesterday: today is incomplete
  const fromDay = from ?? isoDay(new Date(Date.parse(toDay) - 29 * DAY_MS));
  const admin = createAdminClient();

  const [summaryRes, readsRes, confirmedRes, unconfirmedRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).rpc("audience_summary", { p_from: fromDay, p_to: toDay }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("reading_sessions") as any)
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromDay)
      .lt("created_at", isoDay(new Date(Date.parse(toDay) + DAY_MS))),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("newsletter_subscribers") as any).select("id", { count: "exact", head: true }).eq("status", "active"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("newsletter_subscribers") as any).select("id", { count: "exact", head: true }).eq("status", "unconfirmed"),
  ]);
  if (summaryRes.error) throw new Error(summaryRes.error.message);

  const s = summaryRes.data as {
    pageViews: number;
    visitors: number;
    daysWithData: number;
    countries: { country: string; visitors: number }[];
    devices: { device: "mobile" | "tablet" | "desktop"; views: number }[];
  };

  const visitors = Number(s.visitors);
  const pageViews = Number(s.pageViews);
  const devices = s.devices.map((d) => ({
    device: d.device,
    views: Number(d.views),
    share: pageViews ? Number(d.views) / pageViews : 0,
  }));

  return {
    period: { from: fromDay, to: toDay, days: Math.round((Date.parse(toDay) - Date.parse(fromDay)) / DAY_MS) + 1 },
    daysWithData: Number(s.daysWithData),
    pageViews,
    visitors,
    articleReads: readsRes.count ?? 0,
    countries: s.countries.map((c) => ({
      country: c.country || "??",
      visitors: Number(c.visitors),
      share: visitors ? Number(c.visitors) / visitors : 0,
    })),
    devices,
    mobileShare: pageViews ? devices.find((d) => d.device === "mobile")?.share ?? 0 : null,
    newsletter: { confirmed: confirmedRes.count ?? 0, unconfirmed: unconfirmedRes.count ?? 0 },
  };
}

/** Compact public figure: 12,345 → "12K", 1,234,567 → "1.2M". */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString("en-US");
}
