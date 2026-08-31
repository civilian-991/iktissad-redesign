/**
 * Supabase Row <-> Frontend Type Mappers
 *
 * Converts between snake_case DB rows and camelCase frontend types.
 * Used by API routes when reading from / writing to the database.
 */

import type {
  ArticleRow,
  MagazineIssueRow,
  UserRow,
  MediaRow,
  ProfileRow,
  CountryRow,
  SectionRow,
  SectorRow,
  TagRow,
  MagazineSectionRow,
  MagazineSpreadRow,
  SubscriptionPlanRow,
  SubscriberRow,
  PaymentRow,
  PromoCodeRow,
  CommentRow,
  AuditLogRow,
  AdminNotificationRow,
  ArticleSeriesRow,
} from "./types";
import type {
  Article,
  MagazineIssue,
  AdminUser,
  MediaItem,
  Profile,
  Country,
  Section,
  Sector,
  Tag,
  MagazineSection,
  MagazineSpread,
  SubscriptionPlan,
  Subscriber,
  Payment,
  PromoCode,
  Comment,
  AuditLogEntry,
  AdminNotification,
  Newsletter,
  NewsletterBlock,
  ArticleSeries,
} from "@/types";

// ──────────────────────────────────────────────────────────────
// Articles
// ──────────────────────────────────────────────────────────────

/** Strip HTML tags from a string (used to clean Drupal-migrated titles) */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/** article row + joined author -> frontend Article */
export function mapArticleRow(
  row: ArticleRow & {
    users?: { name: string; avatar: string; slug?: string | null } | null;
    sections?: { slug: string; name: string } | null;
    sectors?: { slug: string; name: string } | null;
    countries?: { slug: string; name: string } | null;
    /** Full country set (join table). Only present on selects that embed it. */
    article_countries?: Array<{
      position?: number | null;
      countries?: { slug: string; name: string } | null;
    }> | null;
  }
): Article {
  // Multi-country: the join-table embed is the authoritative set, ordered by
  // `position` (0 = primary). Selects that don't embed it fall back to the
  // single primary country so older callers keep working.
  const countrySet = (row.article_countries ?? [])
    .filter((ac) => ac.countries?.slug)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((ac) => ({
      slug: ac.countries!.slug,
      name: ac.countries!.name || ac.countries!.slug,
    }));
  const countries =
    countrySet.length > 0
      ? countrySet
      : row.countries?.slug
        ? [{ slug: row.countries.slug, name: row.countries.name || row.countries.slug }]
        : [];

  return {
    id: row.id,
    title: stripHtml(row.title),
    titleEn: row.title_en,
    slug: row.slug,
    excerpt: row.excerpt,
    excerptEn: row.excerpt_en,
    content: row.content,
    contentEn: row.content_en,
    featuredImage: row.featured_image,
    section: row.sections?.name ?? row.sections?.slug ?? "",
    sectionSlug: row.sections?.slug ?? "",
    sector: row.sectors?.name ?? row.sectors?.slug ?? "",
    sectorSlug: row.sectors?.slug ?? "",
    country: row.countries?.name ?? row.countries?.slug ?? countries[0]?.name ?? "",
    countrySlug: row.countries?.slug ?? countries[0]?.slug ?? "",
    countries,
    author: {
      id: row.author_id ?? undefined,
      slug: row.users?.slug ?? undefined,
      name: row.users?.name ?? "",
      avatar: row.users?.avatar ?? "",
    },
    tags: row.tags,
    status: row.status,
    featured: row.featured ?? false,
    editorChoice: row.editor_choice ?? false,
    views: row.views,
    publishedAt: row.published_at ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deck: (row as any).deck ?? undefined,
    deckEn: (row as any).deck_en ?? undefined,
    accentColor: (row as any).accent_color ?? undefined,
    featuredImageFocalX: (row as any).featured_image_focal_x ?? 0.5,
    featuredImageFocalY: (row as any).featured_image_focal_y ?? 0.5,
    featuredImageCaption: (row as any).featured_image_caption || undefined,
    featuredImageCredit: (row as any).featured_image_credit || undefined,
    featuredImageCreditUrl: (row as any).featured_image_credit_url || undefined,
    body: (row as any).body ?? undefined,
    isBreaking: (row as any).is_breaking ?? false,
    paywalled: (row as any).is_paywalled ?? false,
    articlePrice: (row as any).article_price ?? null,
    articleType: (row as any).article_type ?? undefined,
    videoUrl: (row as any).video_url ?? undefined,
    metaTitle: (row as any).meta_title ?? undefined,
    metaDescription: (row as any).meta_description ?? undefined,
    ogImage: (row as any).og_image ?? undefined,
    canonicalUrl: (row as any).canonical_url ?? undefined,
    noIndex: (row as any).no_index ?? false,
    summary: (row as any).summary ?? null,
    summaryEn: (row as any).summary_en ?? null,
  };
}

// ──────────────────────────────────────────────────────────────
// Magazine Issues
// ──────────────────────────────────────────────────────────────

export function mapMagazineIssueRow(
  row: MagazineIssueRow,
  articles: Article[] = []
): MagazineIssue {
  return {
    id: row.id,
    issueNumber: row.issue_number,
    title: row.title,
    titleEn: row.title_en,
    subtitle: row.subtitle,
    coverImage: row.cover_image,
    publishDate: row.publish_date,
    articles,
    pdfUrl: row.pdf_url,
    pages: row.pages,
    views: row.views,
    downloads: row.downloads,
    featured: row.featured,
    status: row.status,
    highlights: row.highlights,
  };
}

// ──────────────────────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────────────────────

export function mapUserRow(row: UserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    department: row.department,
    status: row.status,
    articleCount: row.article_count,
    lastActive: row.last_active,
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Media
// ──────────────────────────────────────────────────────────────

export function mapMediaRow(row: MediaRow): MediaItem {
  return {
    id: row.id,
    url: row.url,
    filename: row.filename,
    mimeType: row.mime_type,
    size: row.size,
    alt: row.alt,
    altEn: row.alt_en,
    folder: row.folder,
    uploadedBy: row.uploaded_by ?? "",
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Profiles
// ──────────────────────────────────────────────────────────────

export function mapProfileRow(
  row: ProfileRow & {
    sectors?: { slug: string } | null;
    countries?: { slug: string } | null;
  }
): Profile {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    description: row.description,
    descriptionEn: row.description_en,
    logo: row.logo,
    sector: row.sectors?.slug ?? "",
    country: row.countries?.slug ?? "",
    website: row.website,
    founded: row.founded,
    type: row.type,
    quote: row.quote ?? null,
    image: row.image ?? null,
    category: row.category ?? null,
  };
}

// ──────────────────────────────────────────────────────────────
// Countries
// ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCountryRow(row: CountryRow & { article_count?: any }): Country {
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    flag: row.flag,
    region: row.region ?? 'world',
    economicOverview: row.economic_overview,
    economicOverviewEn: row.economic_overview_en,
    keyIndicators: row.key_indicators as Record<string, string | number>,
    articleCount: row.article_count !== undefined ? Number(row.article_count) : undefined,
  };
}

// ──────────────────────────────────────────────────────────────
// Sections
// ──────────────────────────────────────────────────────────────

export function mapSectionRow(
  row: SectionRow,
  articleCount: number = 0
): Section {
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    description: row.description,
    descriptionEn: row.description_en,
    articleCount,
  };
}

// ──────────────────────────────────────────────────────────────
// Sectors
// ──────────────────────────────────────────────────────────────

export function mapSectorRow(
  row: SectorRow,
  articleCount: number = 0
): Sector {
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    description: row.description,
    descriptionEn: row.description_en,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
    articleCount,
  };
}

// ──────────────────────────────────────────────────────────────
// Tags
// ──────────────────────────────────────────────────────────────

// Accepts either a plain TagRow or a row from the search_tags() RPC
// (which carries an extra `article_count`). The explicit `articleCount`
// argument, when provided, wins over any value on the row.
export function mapTagRow(
  row: TagRow & { article_count?: number | string },
  articleCount?: number
): Tag {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? "",
    slug: row.slug ?? "",
    description: row.description ?? "",
    articleCount:
      articleCount ?? Number(row.article_count ?? 0),
  };
}

// ──────────────────────────────────────────────────────────────
// Magazine Sections (Phase 1A)
// ──────────────────────────────────────────────────────────────

export function mapMagazineSection(row: MagazineSectionRow): MagazineSection {
  return {
    id: row.id,
    issueId: row.issue_id ?? "",
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    sortOrder: row.sort_order,
    themeColor: row.theme_color,
    coverImage: row.cover_image,
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Magazine Spreads (Phase 1A)
// ──────────────────────────────────────────────────────────────

export function mapMagazineSpread(row: MagazineSpreadRow): MagazineSpread {
  return {
    id: row.id,
    issueId: row.issue_id ?? "",
    sectionId: row.section_id ?? null,
    pageNumber: row.page_number,
    templateId: row.template_id,
    zones: row.zones as Record<string, unknown>,
    metadata: row.metadata as Record<string, unknown>,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? null,
  };
}

// ──────────────────────────────────────────────────────────────
// Subscription Plans (Phase 1A)
// ──────────────────────────────────────────────────────────────

export function mapSubscriptionPlan(row: SubscriptionPlanRow): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    nameAr: row.name_ar,
    description: row.description ?? null,
    descriptionAr: row.description_ar ?? null,
    priceMonthly: row.price_monthly,
    priceAnnual: row.price_annual ?? null,
    interval: row.interval,
    features: row.features as string[],
    featuresAr: row.features_ar as string[],
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Subscribers (Phase 1A)
// ──────────────────────────────────────────────────────────────

export function mapSubscriber(row: SubscriberRow): Subscriber {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    email: row.email,
    name: row.name ?? null,
    phone: row.phone ?? null,
    countryCode: row.country_code ?? null,
    planId: row.plan_id ?? null,
    status: row.status,
    trialEndsAt: row.trial_ends_at ?? null,
    currentPeriodStart: row.current_period_start ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    canceledAt: row.canceled_at ?? null,
    paymentMethod: row.payment_method as Record<string, unknown> | null,
    gatewayCustomerId: row.gateway_customer_id ?? null,
    gatewaySubscriptionId: row.gateway_subscription_id ?? null,
    promoCodeId: row.promo_code_id ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Payments (Phase 1A)
// ──────────────────────────────────────────────────────────────

export function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    subscriberId: row.subscriber_id,
    planId: row.plan_id ?? null,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    gatewayPaymentId: row.gateway_payment_id ?? null,
    description: row.description ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Promo Codes (Phase 1A)
// ──────────────────────────────────────────────────────────────

export function mapPromoCode(row: PromoCodeRow): PromoCode {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    maxUses: row.max_uses ?? null,
    usesCount: row.uses_count,
    validFrom: row.valid_from,
    validUntil: row.valid_until ?? null,
    plans: row.plans ?? null,
    isActive: row.is_active,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Comments (Phase 1A)
// ──────────────────────────────────────────────────────────────

export function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    articleId: row.article_id ?? null,
    userId: row.user_id ?? null,
    parentId: row.parent_id ?? null,
    body: row.body,
    status: row.status,
    moderatedBy: row.moderated_by ?? null,
    moderatedAt: row.moderated_at ?? null,
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Audit Log (Phase 1A)
// ──────────────────────────────────────────────────────────────

export function mapAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id ?? null,
    actorEmail: row.actor_email ?? null,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id ?? null,
    oldValues: row.old_values as Record<string, unknown> | null,
    newValues: row.new_values as Record<string, unknown> | null,
    ipAddress: row.ip_address ?? null,
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Admin Notifications (Phase 1A)
// ──────────────────────────────────────────────────────────────

export function mapAdminNotification(row: AdminNotificationRow): AdminNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    resourceId: row.resource_id ?? null,
    isRead: row.is_read,
    readBy: row.read_by,
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Newsletters
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
// Article Series (Dossiers)
// ──────────────────────────────────────────────────────────────

export function mapArticleSeriesRow(
  row: ArticleSeriesRow & { article_count?: number; articles?: { id: string; title: string; order_index: number; published_at?: string }[] }
): ArticleSeries {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleEn: row.title_en,
    description: row.description,
    descriptionEn: row.description_en,
    coverImage: row.cover_image,
    status: row.status,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    articleCount: row.article_count ?? 0,
    articles: (row.articles ?? []).map((a: { id: string; title: string; order_index: number; published_at?: string }) => ({
      id: a.id,
      title: a.title,
      orderIndex: a.order_index,
      publishedAt: a.published_at,
    })),
  };
}

// ──────────────────────────────────────────────────────────────
// A/B Tests (headline experiments)
// ──────────────────────────────────────────────────────────────

/**
 * Public ABTest shape consumed by /api/admin/ab-tests and HeadlineABLab.
 * (Defined here to avoid a circular import with the route file.)
 */
export interface ABTestPublic {
  id: string;
  articleId: string;
  variantA: string;
  variantB: string;
  durationHours: number;
  trafficSplit: number;
  status: "active" | "stopped" | "completed";
  startedAt: string;
  endsAt: string;
  createdBy?: string;
}

interface ABTestVariantsPayload {
  articleId: string;
  variantA: string;
  variantB: string;
  trafficSplit: number;
  durationHours: number;
}

function dbStatusToPublic(
  status: "draft" | "running" | "paused" | "completed",
): "active" | "stopped" | "completed" {
  if (status === "running") return "active";
  if (status === "completed") return "completed";
  return "stopped"; // draft + paused → stopped
}

export function publicStatusToDb(
  status: "active" | "stopped" | "completed",
): "running" | "paused" | "completed" {
  if (status === "active") return "running";
  if (status === "completed") return "completed";
  return "paused";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapABTestRow(row: any): ABTestPublic {
  const variants = (row.variants ?? {}) as Partial<ABTestVariantsPayload>;
  const durationHours = Number(variants.durationHours ?? 24);
  const trafficSplit = Number(variants.trafficSplit ?? 50);
  const startedAt: string = row.started_at ?? row.created_at;
  const endedAt: string | null = row.ended_at ?? null;
  const endsAt =
    endedAt ??
    new Date(new Date(startedAt).getTime() + durationHours * 60 * 60 * 1000).toISOString();

  return {
    id: row.id,
    articleId: String(variants.articleId ?? row.name ?? ""),
    variantA: String(variants.variantA ?? ""),
    variantB: String(variants.variantB ?? ""),
    durationHours,
    trafficSplit,
    status: dbStatusToPublic(row.status),
    startedAt,
    endsAt,
    createdBy: row.created_by ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapNewsletterRow(row: any): Newsletter {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    previewText: row.preview_text ?? null,
    senderName: row.sender_name ?? "إكتساد",
    segment: row.segment,
    status: row.status,
    blocks: (row.blocks ?? []) as NewsletterBlock[],
    scheduledAt: row.scheduled_at ?? null,
    sentAt: row.sent_at ?? null,
    recipientCount: row.recipient_count ?? null,
    sentCount: row.sent_count ?? 0,
    failedCount: row.failed_count ?? 0,
    openCount: row.open_count ?? 0,
    clickCount: row.click_count ?? 0,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
