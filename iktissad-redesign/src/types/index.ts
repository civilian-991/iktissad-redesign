// =============================================================================
// IKTISSAD Shared Types
// =============================================================================
//
// These are the camelCase frontend types used by components and pages.
// For the snake_case database row types, see src/lib/supabase/types.ts.
// Mappers to convert between the two live in src/lib/supabase/mappers.ts.
// =============================================================================

// =============================================================================
// ARTICLE BLOCK TYPES (Phase 1A — Block-Based Content Model)
// =============================================================================

export interface ParagraphBlock {
  _type: "paragraph";
  html: string;
  /** Optional paragraph-level dir override (for mixed-language content) */
  dir?: "rtl" | "ltr";
}

export interface HeadingBlock {
  _type: "heading";
  level: 2 | 3 | 4;
  text: string;
  textEn?: string;
}

export interface PullQuoteBlock {
  _type: "pullQuote";
  text: string;
  textEn?: string;
  attribution?: string;
  attributionEn?: string;
}

export interface FigureBlock {
  _type: "figure";
  src: string;
  alt: string;
  altEn?: string;
  caption?: string;
  captionEn?: string;
  credit?: string;
  /** Focal point X 0-1 for object-position */
  focalX?: number;
  /** Focal point Y 0-1 for object-position */
  focalY?: number;
  size?: "normal" | "wide" | "full";
}

export interface SidebarBlock {
  _type: "sidebar";
  title?: string;
  titleEn?: string;
  body: string;
  theme?: "gold" | "navy" | "cream";
  float?: "start" | "end";
}

export interface DataChartBlock {
  _type: "dataChart";
  chartType: "bar" | "line" | "area" | "donut" | "pie";
  title?: string;
  titleEn?: string;
  source?: string;
  data: Array<{ label: string; labelEn?: string; value: number; color?: string }>;
}

export interface DataTableBlock {
  _type: "dataTable";
  title?: string;
  titleEn?: string;
  source?: string;
  headers: string[];
  headersEn?: string[];
  rows: string[][];
}

export interface PhotoEssayBlock {
  _type: "photoEssay";
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
    focalX?: number;
    focalY?: number;
  }>;
}

export interface CalloutBlock {
  _type: "callout";
  variant: "stat" | "info" | "quote" | "warning";
  value?: string;
  label?: string;
  labelEn?: string;
  body?: string;
}

export interface DividerBlock {
  _type: "divider";
  style?: "line" | "ornament" | "space";
}

export interface EmbedBlock {
  _type: "embed";
  src: string;
  provider?: "youtube" | "twitter" | "instagram" | "custom";
  caption?: string;
  aspectRatio?: "16/9" | "4/3" | "1/1";
}

export interface BeforeAfterBlock {
  _type: "beforeAfter";
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  caption?: string;
}

/** Discriminated union of all article block variants */
export type ArticleBlock =
  | ParagraphBlock
  | HeadingBlock
  | PullQuoteBlock
  | FigureBlock
  | SidebarBlock
  | DataChartBlock
  | DataTableBlock
  | PhotoEssayBlock
  | CalloutBlock
  | DividerBlock
  | EmbedBlock
  | BeforeAfterBlock;

// =============================================================================
// ARTICLE (updated with Phase 1A fields)
// =============================================================================

export interface Article {
  id: string;
  title: string;
  titleEn: string;
  slug: string;
  excerpt: string;
  excerptEn: string;
  content: string;
  contentEn: string;
  /** Rich block-based body (Phase 1A) — replaces flat content string for new articles */
  body?: ArticleBlock[];
  /** Arabic standfirst / deck line */
  deck?: string;
  /** English deck */
  deckEn?: string;
  /** Optional accent color (hex) for magazine layout theming */
  accentColor?: string;
  featuredImage: string;
  featuredImageFocalX?: number;
  featuredImageFocalY?: number;
  section: string;
  sectionSlug: string;
  sector: string;
  sectorSlug: string;
  country: string;
  countrySlug: string;
  author: {
    id?: string;
    name: string;
    avatar: string;
  };
  tags: string[];
  status: "published" | "draft" | "review" | "scheduled";
  featured: boolean;
  editorChoice: boolean;
  paywalled?: boolean;
  /** Per-article price for single-article micropayment. null = use global default. */
  articlePrice?: number | null;
  isBreaking?: boolean;
  /** Editorial article type: news | report | analysis | interview | opinion */
  articleType?: string;
  views: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  /** Video URL from awalan ArticleVideo table (MP4 or embed URL) */
  videoUrl?: string;
  // ── SEO metadata (overrides title/excerpt/featuredImage in <head>) ──────────
  /** Custom <title> tag (max ~65 chars). Falls back to title. */
  metaTitle?: string;
  /** Custom meta description (max ~160 chars). Falls back to excerpt. */
  metaDescription?: string;
  /** Custom Open Graph image URL. Falls back to featuredImage. */
  ogImage?: string;
  /** Custom canonical URL — for syndicated / duplicate content. */
  canonicalUrl?: string;
  /** When true, adds noindex,nofollow robots directive. */
  noIndex?: boolean;
  /** AI-generated 2-3 sentence Arabic summary (TLDR). */
  summary?: string | null;
  /** AI-generated 2-3 sentence English summary (TLDR). */
  summaryEn?: string | null;
}

export interface ArticleVersion {
  id: string;
  articleId: string;
  versionNumber: number;
  title: string;
  titleEn: string;
  excerpt: string;
  content: string;
  body?: import('@tiptap/core').JSONContent | null;
  changedBy: string | null;
  changedByName?: string | null;
  changedByAvatar?: string | null;
  summary?: string | null;
  createdAt: string;
}

export interface MagazineIssue {
  id: string;
  issueNumber: number;
  title: string;
  titleEn: string;
  subtitle: string;
  coverImage: string;
  publishDate: string;
  articles: Article[];
  pdfUrl: string;
  pages: number;
  views: number;
  downloads: number;
  featured: boolean;
  status: "published" | "draft" | "scheduled";
  highlights: string[];
  /** Spread page images for in-browser reader (Phase 1A — not yet in DB) */
  pagesImages?: string[];
  /** Whether spread pages are processed and ready (Phase 1A — not yet in DB) */
  pagesReady?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "author" | "contributor";
  avatar: string;
  department: string;
  status: "active" | "inactive" | "suspended";
  articleCount: number;
  lastActive: string;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  alt: string;
  altEn: string;
  /** Optional description for media search (not yet in DB) */
  description?: string;
  folder: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  logo: string;
  sector: string;
  country: string;
  website: string;
  founded: string;
  type: string;
  quote?: string | null;
  image?: string | null;
  category?: string | null;
}

export interface Country {
  slug: string;
  name: string;
  nameEn: string;
  flag: string;
  region: string;
  economicOverview: string;
  economicOverviewEn: string;
  keyIndicators: Record<string, string | number>;
  articleCount?: number;
}

export interface Section {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  articleCount: number;
}

export interface Sector {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon?: string;
  color?: string;
  articleCount: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// SOURCE & CONTACT CRM (Phase 10.1)
// =============================================================================

export interface Source {
  id: string;
  name: string;
  nameEn?: string;
  title?: string;
  titleEn?: string;
  organization?: string;
  organizationEn?: string;
  phone?: string;
  email?: string;
  countryId?: string;
  sectorId?: string;
  tags: string[];
  reliabilityRating?: number; // 1-5
  embargoUntil?: string;
  privateNotes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // joined
  country?: { name: string; flag: string };
  sector?: { name: string };
  articleCount?: number;
}

export interface SourceArticleLink {
  id: string;
  sourceId: string;
  articleId: string;
  quoteExcerpt?: string;
  linkedAt: string;
  // joined
  article?: { id: string; title: string; publishedAt?: string };
  source?: { id: string; name: string };
}

// =============================================================================
// MAGAZINE CONTENT MODEL (Phase 1A)
// =============================================================================

export interface MagazineSection {
  id: string;
  issueId: string;
  slug: string;
  name: string;
  nameEn: string;
  sortOrder: number;
  themeColor: string;
  coverImage: string;
  createdAt: string;
}

/** A single configurable zone within a spread template */
export interface SpreadZone {
  id: string;
  type: "image" | "text" | "pullQuote" | "ad" | "article" | "decoration";
  /** CSS Grid area or explicit position/size values */
  gridArea?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Whether the zone is required to have content before publish */
  required?: boolean;
  /** Default placeholder label */
  label?: string;
  labelAr?: string;
}

export interface SpreadTemplate {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  thumbnailSvg: string | null;
  zones: SpreadZone[];
  createdAt: string;
}

export interface MagazineSpread {
  id: string;
  issueId: string;
  sectionId: string | null;
  pageNumber: number;
  templateId: string;
  /** Zone content keyed by zone ID */
  zones: Record<string, unknown>;
  /** Spread-level metadata (background color, theme, etc.) */
  metadata: Record<string, unknown>;
  updatedAt: string;
  updatedBy: string | null;
}

export interface SpreadRevision {
  id: string;
  spreadId: string;
  snapshot: Record<string, unknown>;
  savedAt: string;
  savedBy: string | null;
  label: string | null;
}

// =============================================================================
// SUBSCRIPTION SYSTEM (Phase 1A)
// =============================================================================

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete";
export type SubscriptionInterval = "monthly" | "annual" | "quarterly";
export type DiscountType = "percent" | "fixed";

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr: string;
  description: string | null;
  descriptionAr: string | null;
  priceMonthly: number;
  priceAnnual: number | null;
  interval: SubscriptionInterval;
  features: string[];
  featuresAr: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  usesCount: number;
  validFrom: string;
  validUntil: string | null;
  /** Plan IDs this code applies to (null = all plans) */
  plans: string[] | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface Subscriber {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  countryCode: string | null;
  planId: string | null;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  paymentMethod: Record<string, unknown> | null;
  gatewayCustomerId: string | null;
  gatewaySubscriptionId: string | null;
  promoCodeId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  subscriberId: string;
  planId: string | null;
  amount: number;
  currency: string;
  status: string;
  gatewayPaymentId: string | null;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
}

// =============================================================================
// ANALYTICS (Phase 1A)
// =============================================================================

export interface ArticleRead {
  id: string;
  articleId: string;
  subscriberId: string | null;
  sessionId: string;
  timeOnPage: number;
  scrollDepth: number;
  readThrough: boolean;
  referrer: string | null;
  createdAt: string;
}

export interface MagazineSpreadRead {
  id: string;
  issueId: string;
  subscriberId: string | null;
  sessionId: string;
  spreadNumber: number;
  dwellSeconds: number;
  createdAt: string;
}

// =============================================================================
// ADMIN RBAC + AUDIT (Phase 1A)
// =============================================================================

export type AdminRoleType = "super_admin" | "editor" | "writer" | "finance" | "advertiser_manager";
export type NotificationType =
  | "new_subscriber"
  | "payment_failed"
  | "subscription_canceled"
  | "comment_flagged"
  | "article_published"
  | "manual_change";

export interface AdminRole {
  userId: string;
  role: AdminRoleType;
  permissions: Record<string, unknown>;
  invitedBy: string | null;
  twoFaEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  resourceId: string | null;
  isRead: boolean;
  readBy: string[];
  createdAt: string;
}

// =============================================================================
// EDITORIAL WORKFLOW (Phase 1A)
// =============================================================================

export type AssignmentRole = "writer" | "editor" | "photographer" | "designer";
export type CommentStatus = "pending" | "approved" | "rejected" | "spam";

export interface ArticleAssignment {
  id: string;
  articleId: string | null;
  assigneeId: string | null;
  role: AssignmentRole | null;
  dueDate: string | null;
  note: string | null;
  assignedAt: string;
  assignedBy: string | null;
}

export interface Comment {
  id: string;
  articleId: string | null;
  userId: string | null;
  parentId: string | null;
  body: string;
  status: CommentStatus;
  moderatedBy: string | null;
  moderatedAt: string | null;
  createdAt: string;
}

// =============================================================================
// NEWSLETTER CONTENT BUILDER (Phase 4.3)
// =============================================================================

export type NewsletterBlockType =
  | 'headline'
  | 'article_card'
  | 'text'
  | 'quote'
  | 'cta'
  | 'divider'
  | 'image'
  | 'upgrade_cta'

export interface NewsletterBlock {
  id: string
  type: NewsletterBlockType
  data: Record<string, unknown>
}

export interface Newsletter {
  id: string
  title: string
  subject: string
  previewText: string | null
  senderName: string
  segment: 'all' | 'premium' | 'free'
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'partial' | 'failed'
  blocks: NewsletterBlock[]
  scheduledAt: string | null
  sentAt: string | null
  recipientCount: number | null
  sentCount: number
  failedCount: number
  openCount: number
  clickCount: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

// =============================================================================
// ADVERTISING (Phase 1A)
// =============================================================================

export type AdType = "full-page" | "half-page" | "banner" | "sponsor-card";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export interface Advertiser {
  id: string;
  name: string;
  nameEn: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AdCampaign {
  id: string;
  advertiserId: string | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number | null;
  status: CampaignStatus;
}

export interface Ad {
  id: string;
  campaignId: string | null;
  type: AdType | null;
  imageUrl: string;
  targetUrl: string | null;
  altText: string | null;
  impressions: number;
  clicks: number;
  issueId: string | null;
  spreadNumber: number | null;
  active: boolean;
  createdAt: string;
}

// ─── Phase 5: Content Intelligence & Revenue Attribution ─────────────────────

export type ConversionTouch = {
  id: string;
  subscriberId: string;
  articleId: string;
  sessionId: string | null;
  touchPosition: number;
  createdAt: string;
};

export type ArticleRevenueAttribution = {
  articleId: string;
  title: string;
  conversionCount: number;
  estimatedRevenue: number;
  avgScrollDepth: number;
  readThroughRate: number;
  isPaywalled: boolean;
  articleType: string | null;
};

export type RevenueAttributionData = {
  articles: ArticleRevenueAttribution[];
  totalConversions: number;
  totalAttributedRevenue: number;
  topConvertingArticleType: string | null;
};

export type ContentGapSectionCoverage = {
  sectionName: string;
  articleCount: number;
  targetCount: number;
  gapPercentage: number;
};

export type ContentGapCountryCoverage = {
  country: string;
  articleCount: number;
  lastArticleDate: string | null;
};

export type UnderperformingArticle = {
  id: string;
  title: string;
  views: number;
  avgScrollDepth: number;
  sectionAvgViews: number;
  performanceRatio: number;
  suggestions: string[];
};

export type StoryIdea = {
  topic: string;
  topicAr: string;
  reason: string;
  targetSection: string;
  priority: 'high' | 'medium' | 'low';
};

export type ContentGapData = {
  coverageBySection: ContentGapSectionCoverage[];
  coverageByCountry: ContentGapCountryCoverage[];
  underperformingArticles: UnderperformingArticle[];
  suggestedStoryIdeas: StoryIdea[];
};

export type PaywallSuggestion = {
  type: 'gate' | 'meter' | 'optimize' | 'promote';
  priority: 'high' | 'medium' | 'low';
  titleAr: string;
  descriptionAr: string;
  dataPoint: string;
};

export type PaywallSuggestionData = {
  articleId: string;
  currentStatus: 'free' | 'paywalled';
  engagementScore: number;
  suggestions: PaywallSuggestion[];
};

export type PerformanceRecommendation = {
  category: 'headline' | 'internal_links' | 'content_depth' | 'multimedia' | 'seo';
  titleAr: string;
  descriptionAr: string;
  impactLevel: 'high' | 'medium' | 'low';
  actionable: boolean;
};

export type ArticlePerformanceRecommendations = {
  articleId: string;
  overallScore: number;
  performanceSummaryAr: string;
  recommendations: PerformanceRecommendation[];
};

// =============================================================================
// PHASE 8 — WEBHOOKS & AUTOMATION RULES
// =============================================================================

export type WebhookEventType =
  | 'article.published'
  | 'article.updated'
  | 'article.review'
  | 'article.high_views'
  | 'subscriber.created'
  | 'subscriber.churned'
  | 'payment.received'
  | 'payment.failed'
  | 'comment.flagged';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  attempt: number;
  success: boolean;
  deliveredAt: string;
}

export type AutomationActionType =
  | 'post_telegram'
  | 'send_welcome_email'
  | 'notify_admin'
  | 'add_to_featured'
  | 'notify_editor';

export interface AutomationRule {
  id: string;
  ruleKey: string;
  name: string;
  description: string | null;
  triggerEvent: string;
  actionType: AutomationActionType;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PHASE 10.1 — ARTICLE SERIES / DOSSIERS
// =============================================================================

export interface ArticleSeries {
  id: string;
  slug: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  coverImage?: string;
  status: 'active' | 'archived';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // joined
  articleCount?: number;
  articles?: Array<{
    id: string;
    title: string;
    orderIndex: number;
    publishedAt?: string;
  }>;
}

export interface SeriesArticle {
  id: string;
  seriesId: string;
  articleId: string;
  orderIndex: number;
  addedAt: string;
  article?: {
    id: string;
    title: string;
    slug: string;
    publishedAt?: string;
    excerpt?: string;
  };
}

// =============================================================================
// PHASE 10.2 — PUBLIC API KEYS
// =============================================================================

export type ApiKeyScope =
  | 'read:articles'
  | 'read:sections'
  | 'read:sectors'
  | 'read:countries'
  | 'read:series'

export interface ApiKey {
  id: string
  name: string
  keyHash: string
  keyPrefix: string   // shown in UI e.g. "ikt_a1b2"
  scopes: ApiKeyScope[]
  rateLimitPerMinute: number
  createdBy?: string
  lastUsedAt?: string
  expiresAt?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiUsageLog {
  id: string
  apiKeyId: string
  endpoint: string
  method: string
  statusCode?: number
  responseTimeMs?: number
  ipAddress?: string
  userAgent?: string
  requestedAt: string
}

export interface ApiKeyUsageStats {
  totalRequests: number
  requestsToday: number
  requests7Days: number
  requests30Days: number
  errorRate: number
  avgResponseTimeMs: number
  topEndpoints: Array<{ endpoint: string; count: number }>
}
