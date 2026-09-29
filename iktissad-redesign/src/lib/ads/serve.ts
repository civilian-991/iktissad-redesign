import { createAdminClient } from "@/lib/supabase/admin";
import {
  PLACEMENTS,
  SLOTS,
  parseSize,
  type AdPlacement,
  type AdSize,
  type AdSlotName,
  type ServedAd,
} from "@/lib/ads/placements";

/**
 * Picks the creative a page slot shows.
 *
 * Order of preference for a slot:
 *   1. In-article MPU in a sponsored section → the section sponsor's creatives
 *      (the rate card reserves "the first MPU slot in every article").
 *   2. Ads booked for the slot's own placement. A flat-fee campaign (the
 *      monthly Homepage Billboard) is exclusive and always wins; CPM ads rotate
 *      by weight.
 *   3. Run-of-Site ads in a size the slot accepts.
 *
 * CPM campaigns stop serving once they've delivered their booked impressions,
 * and every campaign only serves between its start and end dates.
 *
 * The candidate list is cached in memory for a minute: this runs on every
 * page view, and a one-minute lag on a newly activated ad is fine.
 */

interface CandidateAd {
  id: string;
  campaignId: string;
  placement: AdPlacement;
  format: "image" | "html5";
  imageUrl: string;
  mobileImageUrl: string | null;
  size: AdSize | null;
  sectionId: string | null;
  weight: number;
  altText: string;
  targetUrl: string | null;
  pricingModel: "cpm" | "flat";
}

interface Sponsorship {
  sectionId: string;
  sectionSlug: string;
  campaignId: string | null;
}

interface ServingState {
  ads: CandidateAd[];
  sponsorships: Sponsorship[];
  sectionIdBySlug: Map<string, string>;
  loadedAt: number;
}

const TTL_MS = 60_000;
let state: ServingState | null = null;
let loading: Promise<ServingState> | null = null;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadState(): Promise<ServingState> {
  const admin = createAdminClient();
  const day = today();

  const [adsRes, sponsorRes, sectionsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("ads") as any)
      .select(
        "id, campaign_id, placement, creative_format, image_url, mobile_image_url, size, section_id, weight, alt_text, target_url, impressions, ad_campaigns:campaign_id ( status, start_date, end_date, pricing_model, impression_goal )"
      )
      .eq("active", true)
      .not("placement", "is", null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("section_sponsorships") as any)
      .select("section_id, campaign_id, sections:section_id ( slug )")
      .eq("active", true)
      .lte("start_date", day)
      .gte("end_date", day),
    admin.from("sections").select("id, slug"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = adsRes.data ?? [];

  // Delivery per campaign, across all of the campaign's creatives.
  const delivered = new Map<string, number>();
  for (const r of rows) {
    delivered.set(r.campaign_id, (delivered.get(r.campaign_id) ?? 0) + Number(r.impressions ?? 0));
  }

  const ads: CandidateAd[] = rows
    .filter((r) => {
      const c = r.ad_campaigns;
      if (!c || c.status !== "active") return false;
      if (c.start_date && c.start_date > day) return false;
      if (c.end_date && c.end_date < day) return false;
      if (c.pricing_model === "cpm" && c.impression_goal && delivered.get(r.campaign_id)! >= Number(c.impression_goal)) {
        return false;
      }
      return true;
    })
    .map((r) => ({
      id: r.id,
      campaignId: r.campaign_id,
      placement: r.placement,
      format: r.creative_format ?? "image",
      imageUrl: r.image_url,
      mobileImageUrl: r.mobile_image_url ?? null,
      size: r.size ?? null,
      sectionId: r.section_id ?? null,
      weight: r.weight ?? 1,
      altText: r.alt_text ?? "",
      targetUrl: r.target_url ?? null,
      pricingModel: r.ad_campaigns.pricing_model ?? "cpm",
    }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sponsorships: Sponsorship[] = (sponsorRes.data ?? []).map((s: any) => ({
    sectionId: s.section_id,
    sectionSlug: s.sections?.slug ?? "",
    campaignId: s.campaign_id ?? null,
  }));

  const sectionIdBySlug = new Map<string, string>();
  for (const s of (sectionsRes.data ?? []) as { id: string; slug: string }[]) {
    sectionIdBySlug.set(s.slug, s.id);
  }

  return { ads, sponsorships, sectionIdBySlug, loadedAt: Date.now() };
}

async function getState(): Promise<ServingState> {
  if (state && Date.now() - state.loadedAt < TTL_MS) return state;
  if (!loading) {
    loading = loadState()
      .then((s) => {
        state = s;
        return s;
      })
      .finally(() => {
        loading = null;
      });
  }
  // Serve the stale list while a refresh is in flight.
  return state ?? loading;
}

function pickWeighted(ads: CandidateAd[]): CandidateAd | null {
  if (ads.length === 0) return null;
  // An exclusive flat-fee booking takes the slot outright.
  const flat = ads.filter((a) => a.pricingModel === "flat");
  const pool = flat.length > 0 ? flat : ads;
  const total = pool.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of pool) {
    r -= a.weight;
    if (r <= 0) return a;
  }
  return pool[pool.length - 1];
}

/** Default mobile size for a desktop creative when none is booked separately. */
const MOBILE_FALLBACK: Record<AdSize, AdSize> = {
  "970x250": "320x100",
  "728x90": "320x50",
  "300x250": "300x250",
  "300x600": "300x250",
  "320x50": "320x50",
  "320x100": "320x100",
};

function toServed(ad: CandidateAd, slotRosSize: AdSize | null): ServedAd {
  const spec = PLACEMENTS[ad.placement];
  const desktopSize: AdSize | null =
    ad.placement === "run_of_site" ? ad.size ?? slotRosSize : spec.desktopSizes[0] ?? null;
  const mobileSize: AdSize | null =
    ad.placement === "run_of_site"
      ? desktopSize ? MOBILE_FALLBACK[desktopSize] : null
      : spec.mobileSizes[0] ?? null;

  // Sticky mobile has no desktop size; its "desktop" dims are the mobile ones.
  const d = parseSize(desktopSize ?? mobileSize) ?? { width: 300, height: 250 };
  const m = parseSize(mobileSize);

  return {
    id: ad.id,
    placement: ad.placement,
    format: ad.format,
    src: ad.imageUrl,
    mobileSrc: ad.mobileImageUrl,
    width: d.width,
    height: d.height,
    mobileWidth: m?.width ?? null,
    mobileHeight: m?.height ?? null,
    alt: ad.altText,
    clickUrl: ad.targetUrl ? `/api/ads/click/${ad.id}` : null,
  };
}

export async function selectAd(slot: AdSlotName, sectionSlug?: string | null): Promise<ServedAd | null> {
  const s = await getState();
  const spec = SLOTS[slot];
  const sectionId = sectionSlug ? s.sectionIdBySlug.get(sectionSlug) ?? null : null;

  // Section targeting: untargeted ads run everywhere; targeted ads only in
  // their section. A section sponsor's creatives are implicitly targeted to
  // the sponsored section.
  const sponsorSection = new Map(
    s.sponsorships.filter((sp) => sp.campaignId).map((sp) => [sp.campaignId!, sp.sectionId])
  );
  const inSection = (a: CandidateAd) => {
    const target = a.sectionId ?? sponsorSection.get(a.campaignId) ?? null;
    return !target || target === sectionId;
  };

  if (slot === "in_article_mpu" && sectionId) {
    const sponsor = s.sponsorships.find((sp) => sp.sectionId === sectionId);
    if (sponsor?.campaignId) {
      const own = s.ads.filter(
        (a) => a.campaignId === sponsor.campaignId && (a.placement === "in_article_mpu" || a.size === "300x250")
      );
      const pick = pickWeighted(own);
      if (pick) return toServed(pick, "300x250");
    }
  }

  if (spec.placement) {
    const pick = pickWeighted(s.ads.filter((a) => a.placement === spec.placement && inSection(a)));
    if (pick) return toServed(pick, null);
  }

  // Run-of-Site: rotate across every size the slot takes, not size by size.
  const ros = pickWeighted(
    s.ads.filter(
      (a) => a.placement === "run_of_site" && spec.rosSizes.includes(a.size ?? "300x250") && inSection(a)
    )
  );
  return ros ? toServed(ros, ros.size ?? "300x250") : null;
}

/** True if the ad exists and is currently servable — guards the event beacon. */
export async function isServableAd(id: string): Promise<boolean> {
  const s = await getState();
  return s.ads.some((a) => a.id === id);
}

/** Active section sponsor for a section page header, or null. */
export async function getSectionSponsor(sectionSlug: string): Promise<{
  advertiserName: string;
  logoUrl: string | null;
  websiteUrl: string | null;
} | null> {
  const admin = createAdminClient();
  const day = today();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from("section_sponsorships") as any)
    .select("logo_url, sections!inner ( slug ), advertisers:advertiser_id ( name, logo_url, website_url )")
    .eq("sections.slug", sectionSlug)
    .eq("active", true)
    .lte("start_date", day)
    .gte("end_date", day)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.advertisers) return null;
  return {
    advertiserName: data.advertisers.name,
    logoUrl: data.logo_url || data.advertisers.logo_url || null,
    websiteUrl: data.advertisers.website_url || null,
  };
}
