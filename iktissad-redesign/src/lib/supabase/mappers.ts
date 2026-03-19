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
  MagazineSectionRow,
  MagazineSpreadRow,
  SubscriptionPlanRow,
  SubscriberRow,
  PaymentRow,
  PromoCodeRow,
  CommentRow,
  AuditLogRow,
  AdminNotificationRow,
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
  MagazineSection,
  MagazineSpread,
  SubscriptionPlan,
  Subscriber,
  Payment,
  PromoCode,
  Comment,
  AuditLogEntry,
  AdminNotification,
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
    users?: { name: string; avatar: string } | null;
    sections?: { slug: string; name: string } | null;
    sectors?: { slug: string; name: string } | null;
    countries?: { slug: string; name: string } | null;
  }
): Article {
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
    featuredImageFocalX: (row.featured_image_focal_x as number | undefined) ?? 0.5,
    featuredImageFocalY: (row.featured_image_focal_y as number | undefined) ?? 0.5,
    section: row.sections?.name ?? row.sections?.slug ?? "",
    sector: row.sectors?.name ?? row.sectors?.slug ?? "",
    country: row.countries?.name ?? row.countries?.slug ?? "",
    author: {
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
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    description: (row.description as string | undefined) ?? "",
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
  };
}

// ──────────────────────────────────────────────────────────────
// Countries
// ──────────────────────────────────────────────────────────────

export function mapCountryRow(row: CountryRow): Country {
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    flag: row.flag,
    economicOverview: row.economic_overview,
    economicOverviewEn: row.economic_overview_en,
    keyIndicators: row.key_indicators as Record<string, string | number>,
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
    articleCount,
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
