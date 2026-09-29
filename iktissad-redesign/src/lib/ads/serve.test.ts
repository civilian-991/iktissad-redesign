import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Fake database ────────────────────────────────────────────────────────────
// selectAd() loads three things: live ads (with their campaign), running
// section sponsorships, and the section slug → id map.

type Row = Record<string, unknown>;
let adRows: Row[] = [];
let sponsorRows: Row[] = [];
const sectionRows = [
  { id: "sec-banking", slug: "banking" },
  { id: "sec-energy", slug: "energy" },
];

function query(rows: () => Row[]) {
  const q = {
    select: () => q,
    eq: () => q,
    not: () => q,
    lte: () => q,
    gte: () => q,
    then: (resolve: (v: { data: Row[] }) => unknown) => resolve({ data: rows() }),
  };
  return q;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) =>
      table === "ads" ? query(() => adRows)
        : table === "section_sponsorships" ? query(() => sponsorRows)
        : query(() => sectionRows),
  }),
}));

const TODAY = new Date().toISOString().slice(0, 10);
const campaign = (over: Row = {}) => ({
  status: "active",
  start_date: null,
  end_date: null,
  pricing_model: "cpm",
  impression_goal: null,
  ...over,
});
const ad = (over: Row = {}): Row => ({
  id: "ad-" + Math.random().toString(36).slice(2),
  campaign_id: "c1",
  placement: "article_leaderboard",
  creative_format: "image",
  image_url: "https://x.supabase.co/a.png",
  mobile_image_url: null,
  size: null,
  section_id: null,
  weight: 1,
  alt_text: "",
  target_url: "https://advertiser.example",
  impressions: 0,
  ad_campaigns: campaign(),
  ...over,
});

// The serving state is cached per module; load a fresh copy for each test.
async function selectAd(...args: Parameters<typeof import("./serve").selectAd>) {
  vi.resetModules();
  const mod = await import("./serve");
  return mod.selectAd(...args);
}

beforeEach(() => {
  adRows = [];
  sponsorRows = [];
});

describe("selectAd", () => {
  it("returns null when nothing is booked, so the slot collapses", async () => {
    expect(await selectAd("article_leaderboard")).toBeNull();
  });

  it("serves the slot's own placement with the rate-card size and a tracked click URL", async () => {
    adRows = [ad({ id: "lb" })];
    const served = await selectAd("article_leaderboard");
    expect(served).toMatchObject({ id: "lb", width: 728, height: 90, mobileWidth: 320, mobileHeight: 50 });
    expect(served?.clickUrl).toBe("/api/ads/click/lb");
  });

  it("gives an exclusive flat-fee booking the slot over CPM rotation", async () => {
    adRows = [
      ad({ id: "cpm", placement: "homepage_billboard", weight: 100 }),
      ad({ id: "flat", placement: "homepage_billboard", campaign_id: "c2", ad_campaigns: campaign({ pricing_model: "flat" }) }),
    ];
    for (let i = 0; i < 5; i++) {
      expect((await selectAd("homepage_billboard"))?.id).toBe("flat");
    }
  });

  it("skips campaigns that are paused, not started, ended, or fully delivered", async () => {
    adRows = [
      ad({ id: "paused", ad_campaigns: campaign({ status: "paused" }) }),
      ad({ id: "future", campaign_id: "c2", ad_campaigns: campaign({ start_date: "2999-01-01" }) }),
      ad({ id: "ended", campaign_id: "c3", ad_campaigns: campaign({ end_date: "2000-01-01" }) }),
      ad({ id: "delivered", campaign_id: "c4", impressions: 1000, ad_campaigns: campaign({ impression_goal: 1000 }) }),
    ];
    expect(await selectAd("article_leaderboard")).toBeNull();
  });

  it("falls back to Run-of-Site creatives in a size the slot takes", async () => {
    adRows = [
      ad({ id: "ros-600", placement: "run_of_site", size: "300x600" }),
      ad({ id: "ros-728", placement: "run_of_site", size: "728x90" }),
    ];
    expect((await selectAd("article_leaderboard"))?.id).toBe("ros-728");
    expect((await selectAd("in_article_mpu"))).toBeNull();
    expect((await selectAd("article_sidebar"))?.id).toBe("ros-600");
  });

  it("keeps section-targeted ads inside their section", async () => {
    adRows = [ad({ id: "banking-only", section_id: "sec-banking" })];
    expect((await selectAd("article_leaderboard", "banking"))?.id).toBe("banking-only");
    expect(await selectAd("article_leaderboard", "energy")).toBeNull();
    expect(await selectAd("article_leaderboard")).toBeNull();
  });

  it("reserves the in-article MPU in a sponsored section for the sponsor", async () => {
    sponsorRows = [{ section_id: "sec-banking", campaign_id: "sponsor", sections: { slug: "banking" } }];
    adRows = [
      ad({ id: "other-mpu", placement: "in_article_mpu", weight: 100 }),
      ad({ id: "sponsor-mpu", placement: "in_article_mpu", campaign_id: "sponsor" }),
    ];
    for (let i = 0; i < 5; i++) {
      expect((await selectAd("in_article_mpu", "banking"))?.id).toBe("sponsor-mpu");
    }
    // …and the sponsor's creative doesn't leak into other sections.
    expect((await selectAd("in_article_mpu", "energy"))?.id).toBe("other-mpu");
  });

  it("serves a campaign on its first and last day", async () => {
    adRows = [ad({ id: "today", ad_campaigns: campaign({ start_date: TODAY, end_date: TODAY }) })];
    expect((await selectAd("article_leaderboard"))?.id).toBe("today");
  });
});
