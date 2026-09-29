import type { AdCampaign, SectionSponsorship, SocialPost } from "@/lib/ads/admin";

/** Shapes returned by GET /api/admin/ad-reports. */

export interface CampaignReport {
  campaign: AdCampaign;
  impressions: number;
  clicks: number;
  ctr: number;
  /** Delivered value at the booked rate (CPM × impressions, or the flat fee), US cents. */
  valueCents: number | null;
  byPlacement: { placement: string; impressions: number; clicks: number }[];
  daily: { day: string; impressions: number; clicks: number }[];
}

export interface ContentReport {
  id: string;
  title: string;
  slug: string;
  publicId: number | null;
  sponsorship: "sponsored" | "partner" | null;
  status: string;
  publishedAt: string | null;
  lifetimeViews: number;
  /** Reads in the period. */
  views: number;
  avgReadSeconds: number | null;
  readThroughRate: number | null;
  topReferrers: { source: string; count: number }[];
  shares: { platform: string; count: number }[];
  /** Promotional posts for the article (the rate card includes one). */
  socialPosts: SocialPost[];
  /** Sum of the reach entered for those posts; null when none was entered. */
  socialReach: number | null;
}

export interface NewsletterReport {
  id: string;
  title: string;
  status: string;
  sentAt: string | null;
  delivered: number;
  opens: number;
  clicks: number;
  openRate: number | null;
  clickRate: number | null;
  sponsorClicks: number;
  sponsorMessage: string;
}

export interface AdvertiserReport {
  advertiser: { id: string; name: string; logoUrl: string | null };
  period: { from: string; to: string };
  totals: {
    impressions: number;
    clicks: number;
    ctr: number;
    contentViews: number;
    newsletterSponsorClicks: number;
    socialReach: number | null;
  };
  campaigns: CampaignReport[];
  content: ContentReport[];
  newsletters: NewsletterReport[];
  sections: SectionSponsorship[];
}
