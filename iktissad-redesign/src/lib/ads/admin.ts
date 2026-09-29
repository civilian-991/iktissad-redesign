import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
  csrfForbiddenResponse,
} from "@/lib/api-auth";
import type { AdPlacement, AdSize } from "@/lib/ads/placements";
import { SOCIAL_PLATFORMS, type SocialPost } from "@/lib/ads/social";

/**
 * Shared model for the admin advertising API (advertisers, campaigns, ads,
 * section sponsorships, reports).
 *
 * All of these tables are RLS-locked to the service role, so the routes check
 * the caller's role here and then query with the admin client. (They used to
 * read through the cookie client, which RLS silently turned into empty lists.)
 */

/** Who may view the advertising admin: sales, finance, and editors (who pick sponsors on articles). */
export const ADS_READ_ROLES = ["super_admin", "advertiser_manager", "finance", "editor"];
/** Who may change bookings. */
export const ADS_WRITE_ROLES = ["super_admin", "advertiser_manager"];

/** Returns an error response, or null when the caller may proceed. */
export async function adsGuard(request: Request, mode: "read" | "write"): Promise<NextResponse | null> {
  const auth = await requireRole(
    mode === "write" ? request : undefined,
    mode === "write" ? ADS_WRITE_ROLES : ADS_READ_ROLES
  );
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();
  return null;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

// ─── Advertisers ──────────────────────────────────────────────────────────────

export interface Advertiser {
  id: string;
  name: string;
  nameEn: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAdvertiserRow(row: any): Advertiser {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? null,
    contactName: row.contact_name ?? null,
    contactEmail: row.contact_email ?? null,
    contactPhone: row.contact_phone ?? null,
    notes: row.notes ?? null,
    logoUrl: row.logo_url ?? null,
    websiteUrl: row.website_url ?? null,
    createdAt: row.created_at,
  };
}

const optionalUrl = z.string().url("رابط غير صالح").optional().nullable().or(z.literal(""));

export const advertiserSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  nameEn: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email("بريد إلكتروني غير صالح").optional().nullable().or(z.literal("")),
  contactPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  logoUrl: optionalUrl,
  websiteUrl: optionalUrl,
});

// ─── Campaigns ────────────────────────────────────────────────────────────────

export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type PricingModel = "cpm" | "flat";

export interface AdCampaign {
  id: string;
  advertiserId: string | null;
  advertiserName: string | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number | null;
  status: CampaignStatus;
  pricingModel: PricingModel;
  /** CPM rate (per 1,000 impressions) or the flat fee, in US cents. */
  rateCents: number | null;
  /** Booked impressions; a CPM campaign stops serving when it reaches this. */
  impressionGoal: number | null;
  createdAt: string;
}

export const CAMPAIGN_SELECT = "*, advertisers:advertiser_id ( name )";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCampaignRow(row: any): AdCampaign {
  return {
    id: row.id,
    advertiserId: row.advertiser_id ?? null,
    advertiserName: row.advertisers?.name ?? null,
    name: row.name,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    budgetCents: row.budget_cents ?? null,
    status: row.status ?? "draft",
    pricingModel: row.pricing_model ?? "cpm",
    rateCents: row.rate_cents ?? null,
    impressionGoal: row.impression_goal != null ? Number(row.impression_goal) : null,
    createdAt: row.created_at,
  };
}


const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح");

export const campaignFields = z.object({
    name: z.string().min(1, "الاسم مطلوب"),
    advertiserId: z.string().uuid().nullable().optional(),
    startDate: dateStr.nullable().optional(),
    endDate: dateStr.nullable().optional(),
    budgetCents: z.number().int().min(0).nullable().optional(),
    status: z.enum(["draft", "active", "paused", "completed"]).optional(),
    pricingModel: z.enum(["cpm", "flat"]).optional(),
    rateCents: z.number().int().min(0).nullable().optional(),
    impressionGoal: z.number().int().min(0).nullable().optional(),
});

export const campaignSchema = campaignFields.refine(
  (d) => !d.startDate || !d.endDate || d.endDate >= d.startDate,
  { message: "تاريخ النهاية قبل تاريخ البداية" }
);

type CampaignInput = Partial<z.infer<typeof campaignFields>>;

/** Maps only the fields present in the body, so a PUT never nulls what it didn't send. */
export function campaignToRow(d: CampaignInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (d.name !== undefined) row.name = d.name;
  if (d.advertiserId !== undefined) row.advertiser_id = d.advertiserId;
  if (d.startDate !== undefined) row.start_date = d.startDate;
  if (d.endDate !== undefined) row.end_date = d.endDate;
  if (d.budgetCents !== undefined) row.budget_cents = d.budgetCents;
  if (d.status !== undefined) row.status = d.status;
  if (d.pricingModel !== undefined) row.pricing_model = d.pricingModel;
  if (d.rateCents !== undefined) row.rate_cents = d.rateCents;
  if (d.impressionGoal !== undefined) row.impression_goal = d.impressionGoal;
  return row;
}

// ─── Ads ──────────────────────────────────────────────────────────────────────

export type PrintAdType = "full-page" | "half-page" | "banner" | "sponsor-card";

export interface Ad {
  id: string;
  campaignId: string;
  type: PrintAdType;
  /** Web placement; null for print-magazine ads. */
  placement: AdPlacement | null;
  format: "image" | "html5";
  imageUrl: string;
  mobileImageUrl: string | null;
  size: AdSize | null;
  sectionId: string | null;
  weight: number;
  targetUrl: string | null;
  altText: string | null;
  impressions: number;
  clicks: number;
  issueId: string | null;
  spreadNumber: number | null;
  active: boolean;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAdRow(row: any): Ad {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    type: row.type,
    placement: row.placement ?? null,
    format: row.creative_format ?? "image",
    imageUrl: row.image_url,
    mobileImageUrl: row.mobile_image_url ?? null,
    size: row.size ?? null,
    sectionId: row.section_id ?? null,
    weight: row.weight ?? 1,
    targetUrl: row.target_url ?? null,
    altText: row.alt_text ?? null,
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    issueId: row.issue_id ?? null,
    spreadNumber: row.spread_number ?? null,
    active: row.active ?? true,
    createdAt: row.created_at,
  };
}


const PLACEMENT_ENUM = [
  "homepage_billboard", "article_leaderboard", "in_article_mpu", "sticky_mobile", "run_of_site",
] as const;
const SIZE_ENUM = ["970x250", "728x90", "300x250", "300x600", "320x50", "320x100"] as const;
const creativeUrl = z.string().url("رابط غير صالح").refine((u) => u.startsWith("https://"), "يجب أن يبدأ الرابط بـ https://");

export const adSchema = z.object({
  campaignId: z.string().uuid("اختر الحملة"),
  type: z.enum(["full-page", "half-page", "banner", "sponsor-card"]).optional(),
  placement: z.enum(PLACEMENT_ENUM).nullable().optional(),
  format: z.enum(["image", "html5"]).optional(),
  imageUrl: z.string().min(1, "رابط التصميم مطلوب"),
  mobileImageUrl: creativeUrl.nullable().optional().or(z.literal("")),
  size: z.enum(SIZE_ENUM).nullable().optional(),
  sectionId: z.string().uuid().nullable().optional(),
  weight: z.number().int().min(1).max(100).optional(),
  targetUrl: z.string().url("رابط غير صالح").nullable().optional().or(z.literal("")),
  altText: z.string().nullable().optional(),
  issueId: z.string().uuid().nullable().optional(),
  spreadNumber: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
});

type AdInput = Partial<z.infer<typeof adSchema>>;

export function adToRow(d: AdInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (d.campaignId !== undefined) row.campaign_id = d.campaignId;
  if (d.type !== undefined) row.type = d.type;
  if (d.placement !== undefined) row.placement = d.placement;
  if (d.format !== undefined) row.creative_format = d.format;
  if (d.imageUrl !== undefined) row.image_url = d.imageUrl;
  if (d.mobileImageUrl !== undefined) row.mobile_image_url = d.mobileImageUrl || null;
  if (d.size !== undefined) row.size = d.size;
  if (d.sectionId !== undefined) row.section_id = d.sectionId;
  if (d.weight !== undefined) row.weight = d.weight;
  if (d.targetUrl !== undefined) row.target_url = d.targetUrl || null;
  if (d.altText !== undefined) row.alt_text = d.altText || null;
  if (d.issueId !== undefined) row.issue_id = d.issueId;
  if (d.spreadNumber !== undefined) row.spread_number = d.spreadNumber;
  if (d.active !== undefined) row.active = d.active;
  // Web placements use the generic print type column as "banner".
  if (d.placement && d.type === undefined) row.type = "banner";
  return row;
}

// ─── Section sponsorships ─────────────────────────────────────────────────────

export interface SectionSponsorship {
  id: string;
  sectionId: string;
  sectionName: string | null;
  sectionSlug: string | null;
  advertiserId: string;
  advertiserName: string | null;
  campaignId: string | null;
  logoUrl: string | null;
  startDate: string;
  endDate: string;
  priceCents: number | null;
  active: boolean;
  createdAt: string;
}

export const SPONSORSHIP_SELECT =
  "*, sections:section_id ( name, slug ), advertisers:advertiser_id ( name )";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSponsorshipRow(row: any): SectionSponsorship {
  return {
    id: row.id,
    sectionId: row.section_id,
    sectionName: row.sections?.name ?? null,
    sectionSlug: row.sections?.slug ?? null,
    advertiserId: row.advertiser_id,
    advertiserName: row.advertisers?.name ?? null,
    campaignId: row.campaign_id ?? null,
    logoUrl: row.logo_url ?? null,
    startDate: row.start_date,
    endDate: row.end_date,
    priceCents: row.price_cents ?? null,
    active: row.active ?? true,
    createdAt: row.created_at,
  };
}


export const sponsorshipFields = z.object({
    sectionId: z.string().uuid("اختر القسم"),
    advertiserId: z.string().uuid("اختر المعلن"),
    campaignId: z.string().uuid().nullable().optional(),
    logoUrl: z.string().url("رابط غير صالح").nullable().optional().or(z.literal("")),
    startDate: dateStr,
    endDate: dateStr,
    priceCents: z.number().int().min(0).nullable().optional(),
    active: z.boolean().optional(),
});

export const sponsorshipSchema = sponsorshipFields.refine(
  (d) => d.endDate >= d.startDate,
  { message: "تاريخ النهاية قبل تاريخ البداية" }
);

type SponsorshipInput = Partial<z.infer<typeof sponsorshipFields>>;

export function sponsorshipToRow(d: SponsorshipInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (d.sectionId !== undefined) row.section_id = d.sectionId;
  if (d.advertiserId !== undefined) row.advertiser_id = d.advertiserId;
  if (d.campaignId !== undefined) row.campaign_id = d.campaignId;
  if (d.logoUrl !== undefined) row.logo_url = d.logoUrl || null;
  if (d.startDate !== undefined) row.start_date = d.startDate;
  if (d.endDate !== undefined) row.end_date = d.endDate;
  if (d.priceCents !== undefined) row.price_cents = d.priceCents;
  if (d.active !== undefined) row.active = d.active;
  return row;
}

// ─── Social posts (partner-content reach) ─────────────────────────────────────

export { SOCIAL_PLATFORMS, type SocialPost };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSocialPostRow(row: any): SocialPost {
  return {
    id: row.id,
    articleId: row.article_id,
    platform: row.platform,
    postUrl: row.post_url ?? null,
    status: row.status,
    postedAt: row.posted_at ?? row.created_at ?? null,
    reach: row.reach != null ? Number(row.reach) : null,
    engagements: row.engagements != null ? Number(row.engagements) : null,
    metricsUpdatedAt: row.metrics_updated_at ?? null,
    manual: row.manual ?? false,
  };
}

export const socialPostSchema = z.object({
  articleId: z.string().uuid(),
  platform: z.enum(SOCIAL_PLATFORMS),
  postUrl: z.string().url("رابط غير صالح").nullable().optional().or(z.literal("")),
  postedAt: z.string().datetime({ offset: true }).or(dateStr).nullable().optional(),
  reach: z.number().int().min(0).nullable().optional(),
  engagements: z.number().int().min(0).nullable().optional(),
});

/** Parses page/pageSize with sane bounds. */
export function pageParams(searchParams: URLSearchParams, defaultSize = 10) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") || String(defaultSize), 10) || defaultSize));
  return { page, pageSize, start: (page - 1) * pageSize };
}
