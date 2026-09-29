import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adsGuard, badRequest, serverError, mapCampaignRow, mapSponsorshipRow, mapSocialPostRow, type SocialPost } from "@/lib/ads/admin";
import type { AdvertiserReport, CampaignReport, ContentReport, NewsletterReport } from "@/lib/ads/report-types";
import type { ApiResponse, NewsletterBlock } from "@/types";

/**
 * GET /api/admin/ad-reports?advertiserId=<uuid>&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * One advertiser's combined report for a period — the end-of-campaign report
 * the rate card promises for every product type:
 *
 *   display     impressions, clicks, CTR, delivery by placement and by day,
 *               delivered value at the booked rate
 *   content     page views, average reading time, read-through, top referral
 *               sources, shares — per sponsored article
 *   newsletter  delivered, open rate, click rate, sponsor-link clicks
 *   sections    the section sponsorships running in the period
 *
 * Defaults to the last 30 days.
 */

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function referrerSource(referrer: string | null): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (/(^|\.)google\./.test(host)) return "google";
    if (/(^|\.)(facebook|fb)\.com$|^l\.facebook\.com$|^m\.facebook\.com$/.test(host)) return "facebook";
    if (host === "t.co" || host === "x.com" || host === "twitter.com") return "x";
    if (host.endsWith("linkedin.com") || host === "lnkd.in") return "linkedin";
    if (host.includes("whatsapp")) return "whatsapp";
    if (host.includes("telegram") || host === "t.me") return "telegram";
    if (host.includes("iktissad")) return "internal";
    return host;
  } catch {
    return "other";
  }
}

export async function GET(request: NextRequest) {
  const denied = await adsGuard(request, "read");
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const advertiserId = sp.get("advertiserId");
  if (!advertiserId || !/^[0-9a-f-]{36}$/i.test(advertiserId)) return badRequest("advertiserId مطلوب");

  const to = sp.get("to") ?? isoDay(new Date());
  const from = sp.get("from") ?? isoDay(new Date(Date.now() - 29 * DAY_MS));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) {
    return badRequest("فترة غير صالحة");
  }
  const toExclusive = isoDay(new Date(Date.parse(to) + DAY_MS));

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: advertiser } = await (admin.from("advertisers") as any)
    .select("id, name, logo_url")
    .eq("id", advertiserId)
    .maybeSingle();
  if (!advertiser) {
    return NextResponse.json({ error: "Advertiser not found" } satisfies ApiResponse<never>, { status: 404 });
  }

  // ── Display ────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaignRows, error: campErr } = await (admin.from("ad_campaigns") as any)
    .select("*, advertisers:advertiser_id ( name ), ads ( id, placement )")
    .eq("advertiser_id", advertiserId)
    .order("start_date", { ascending: false });
  if (campErr) return serverError(campErr.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adIds: string[] = (campaignRows ?? []).flatMap((c: any) => (c.ads ?? []).map((a: any) => a.id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventRows: any[] = [];
  if (adIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from("ad_events_daily") as any)
      .select("subject_id, day, placement, impressions, clicks")
      .eq("subject_type", "ad")
      .in("subject_id", adIds)
      .gte("day", from)
      .lte("day", to);
    if (error) return serverError(error.message);
    eventRows = data ?? [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaigns: CampaignReport[] = (campaignRows ?? []).map((row: any) => {
    const campaign = mapCampaignRow(row);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = new Set<string>((row.ads ?? []).map((a: any) => a.id));
    const mine = eventRows.filter((e) => ids.has(e.subject_id));

    const byPlacement = new Map<string, { impressions: number; clicks: number }>();
    const byDay = new Map<string, { impressions: number; clicks: number }>();
    let impressions = 0;
    let clicks = 0;
    for (const e of mine) {
      const imp = Number(e.impressions);
      const clk = Number(e.clicks);
      impressions += imp;
      clicks += clk;
      const p = byPlacement.get(e.placement) ?? { impressions: 0, clicks: 0 };
      p.impressions += imp;
      p.clicks += clk;
      byPlacement.set(e.placement, p);
      const d = byDay.get(e.day) ?? { impressions: 0, clicks: 0 };
      d.impressions += imp;
      d.clicks += clk;
      byDay.set(e.day, d);
    }

    // Delivered value: CPM × impressions / 1000, or the flat fee.
    const valueCents =
      campaign.rateCents == null
        ? null
        : campaign.pricingModel === "flat"
          ? campaign.rateCents
          : Math.round((campaign.rateCents * impressions) / 1000);

    return {
      campaign,
      impressions,
      clicks,
      ctr: impressions > 0 ? clicks / impressions : 0,
      valueCents,
      byPlacement: [...byPlacement.entries()]
        .map(([placement, v]) => ({ placement, ...v }))
        .sort((a, b) => b.impressions - a.impressions),
      daily: [...byDay.entries()]
        .map(([day, v]) => ({ day, ...v }))
        .sort((a, b) => a.day.localeCompare(b.day)),
    };
  });

  // ── Content partnerships ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: articleRows, error: artErr } = await (admin.from("articles") as any)
    .select("id, title, slug, public_id, sponsorship, published_at, views, status")
    .eq("sponsor_advertiser_id", advertiserId)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (artErr) return serverError(artErr.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articleIds: string[] = (articleRows ?? []).map((a: any) => a.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sessions: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let shares: any[] = [];
  let socialPosts: SocialPost[] = [];
  if (articleIds.length > 0) {
    const [sessRes, shareRes, postRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin.from("reading_sessions") as any)
        .select("article_id, time_on_page, read_through, referrer")
        .in("article_id", articleIds)
        .gte("created_at", from)
        .lt("created_at", toExclusive)
        .limit(50_000),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin.from("share_events") as any)
        .select("article_id, platform")
        .in("article_id", articleIds)
        .gte("created_at", from)
        .lt("created_at", toExclusive)
        .limit(50_000),
      // All promotional posts for these articles (not period-bound: the post
      // is part of the booked product, whenever it went out).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin.from("social_post_log") as any)
        .select("*")
        .in("article_id", articleIds)
        .eq("status", "sent")
        .order("posted_at", { ascending: true }),
    ]);
    if (sessRes.error) return serverError(sessRes.error.message);
    sessions = sessRes.data ?? [];
    shares = shareRes.data ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socialPosts = (postRes.data ?? []).map((r: any) => mapSocialPostRow(r));
  }

  const reachOf = (posts: SocialPost[]) =>
    posts.some((p) => p.reach != null) ? posts.reduce((sum, p) => sum + (p.reach ?? 0), 0) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: ContentReport[] = (articleRows ?? []).map((a: any) => {
    const s = sessions.filter((x) => x.article_id === a.id);
    // Only sessions that sent a closing event carry a reading time.
    const timed = s.filter((x) => (x.time_on_page ?? 0) > 0);
    const refs = new Map<string, number>();
    for (const x of s) {
      const src = referrerSource(x.referrer);
      refs.set(src, (refs.get(src) ?? 0) + 1);
    }
    const posts = socialPosts.filter((p) => p.articleId === a.id);
    const shareCount = new Map<string, number>();
    for (const x of shares.filter((y) => y.article_id === a.id)) {
      shareCount.set(x.platform, (shareCount.get(x.platform) ?? 0) + 1);
    }
    return {
      id: a.id,
      title: a.title,
      slug: a.slug,
      publicId: a.public_id ?? null,
      sponsorship: a.sponsorship,
      status: a.status,
      publishedAt: a.published_at,
      lifetimeViews: a.views ?? 0,
      views: s.length,
      avgReadSeconds: timed.length
        ? Math.round(timed.reduce((sum, x) => sum + x.time_on_page, 0) / timed.length)
        : null,
      readThroughRate: s.length ? s.filter((x) => x.read_through).length / s.length : null,
      topReferrers: [...refs.entries()]
        .map(([source, count]) => ({ source, count }))
        .sort((x, y) => y.count - x.count)
        .slice(0, 6),
      shares: [...shareCount.entries()]
        .map(([platform, count]) => ({ platform, count }))
        .sort((x, y) => y.count - x.count),
      socialPosts: posts,
      socialReach: reachOf(posts),
    };
  });

  // ── Newsletter sponsorships ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nlRows, error: nlErr } = await (admin.from("newsletters") as any)
    .select("id, title, subject, status, sent_at, scheduled_at, recipient_count, sent_count, open_count, click_count, blocks")
    .contains("blocks", [{ type: "sponsor", data: { advertiserId } }])
    .order("sent_at", { ascending: false, nullsFirst: false });
  if (nlErr) return serverError(nlErr.message);

  // Newsletters count toward the period by send date (unsent ones are listed
  // too, so a booked-but-unsent issue is visible).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nlInPeriod = (nlRows ?? []).filter((n: any) => !n.sent_at || (n.sent_at >= from && n.sent_at < toExclusive));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nlIds: string[] = nlInPeriod.map((n: any) => n.id);
  const sponsorClicks = new Map<string, number>();
  if (nlIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin.from("ad_events_daily") as any)
      .select("subject_id, clicks")
      .eq("subject_type", "newsletter_sponsor")
      .in("subject_id", nlIds);
    for (const r of data ?? []) {
      sponsorClicks.set(r.subject_id, (sponsorClicks.get(r.subject_id) ?? 0) + Number(r.clicks));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newsletters: NewsletterReport[] = nlInPeriod.map((n: any) => {
    const delivered = Number(n.sent_count ?? 0) || Number(n.recipient_count ?? 0);
    const opens = Number(n.open_count ?? 0);
    const clicks = Number(n.click_count ?? 0);
    const block = ((n.blocks ?? []) as NewsletterBlock[]).find((b) => b.type === "sponsor");
    return {
      id: n.id,
      title: n.title || n.subject,
      status: n.status,
      sentAt: n.sent_at,
      delivered,
      opens,
      clicks,
      openRate: delivered ? opens / delivered : null,
      clickRate: delivered ? clicks / delivered : null,
      sponsorClicks: sponsorClicks.get(n.id) ?? 0,
      sponsorMessage: typeof block?.data.message === "string" ? block.data.message : "",
    };
  });

  // ── Section sponsorships ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: spRows } = await (admin.from("section_sponsorships") as any)
    .select("*, sections:section_id ( name, slug ), advertisers:advertiser_id ( name )")
    .eq("advertiser_id", advertiserId)
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections = (spRows ?? []).map((r: any) => mapSponsorshipRow(r));

  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);

  const report: AdvertiserReport = {
    advertiser: { id: advertiser.id, name: advertiser.name, logoUrl: advertiser.logo_url ?? null },
    period: { from, to },
    totals: {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions ? totalClicks / totalImpressions : 0,
      contentViews: content.reduce((s, c) => s + c.views, 0),
      newsletterSponsorClicks: newsletters.reduce((s, n) => s + n.sponsorClicks, 0),
      socialReach: reachOf(socialPosts),
    },
    campaigns,
    content,
    newsletters,
    sections,
  };

  return NextResponse.json({ data: report } satisfies ApiResponse<AdvertiserReport>);
}
