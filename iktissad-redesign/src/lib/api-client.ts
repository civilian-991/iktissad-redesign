/**
 * Typed API client for IKTISSAD admin pages.
 *
 * Wraps fetch() with JSON parsing, error handling, and typed responses
 * matching the ApiResponse<T> shape returned by our API routes.
 */

import type {
  ApiResponse,
  Article,
  MagazineIssue,
  AdminUser,
  MediaItem,
  Section,
  Sector,
  Country,
  MagazineSpread,
  SpreadRevision,
} from "@/types";

// ─── Subscription domain types ───────────────────────────────────
// Mirrored from the route files; keep in sync with DB schema

export interface Subscriber {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  countryCode: string | null;
  planId: string | null;
  status: "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete";
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

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr: string;
  description: string | null;
  descriptionAr: string | null;
  priceMonthly: number;
  priceAnnual: number | null;
  interval: "monthly" | "annual" | "quarterly";
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
  discountType: "percent" | "fixed";
  discountValue: number;
  maxUses: number | null;
  usesCount: number;
  validFrom: string;
  validUntil: string | null;
  plans: string[] | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
}

// Re-export ApiResponse for consumers that need it
export type { ApiResponse } from "@/types";

// ─── Base fetcher ───────────────────────────────────────────────

async function api<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? `Request failed (${res.status})`);
  }

  return json;
}

/**
 * SWR-compatible fetcher. Throws on error so SWR surfaces it correctly.
 */
export async function swrFetcher<T>(url: string): Promise<ApiResponse<T>> {
  return api<T>(url);
}

// ─── Articles ───────────────────────────────────────────────────

export interface ArticleListParams {
  page?: number;
  pageSize?: number;
  section?: string;
  sector?: string;
  country?: string;
  status?: string;
  search?: string;
}

function buildQuery(
  base: string,
  params: object
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export function articlesKey(params: ArticleListParams = {}): string {
  return buildQuery("/api/articles", params);
}

export async function createArticle(
  data: Record<string, unknown>
): Promise<ApiResponse<Article>> {
  return api<Article>("/api/articles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateArticle(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<Article>> {
  return api<Article>(`/api/articles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteArticle(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/articles/${id}`, {
    method: "DELETE",
  });
}

// ─── Magazines ──────────────────────────────────────────────────

export interface MagazineListParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export function magazinesKey(params: MagazineListParams = {}): string {
  return buildQuery("/api/magazines", params);
}

export async function createMagazine(
  data: Record<string, unknown>
): Promise<ApiResponse<MagazineIssue>> {
  return api<MagazineIssue>("/api/magazines", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMagazine(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<MagazineIssue>> {
  return api<MagazineIssue>(`/api/magazines/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMagazine(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/magazines/${id}`, {
    method: "DELETE",
  });
}

// ─── Users ──────────────────────────────────────────────────────

export interface UserListParams {
  page?: number;
  pageSize?: number;
  role?: string;
  status?: string;
}

export function usersKey(params: UserListParams = {}): string {
  return buildQuery("/api/users", params);
}

export async function createUser(
  data: Record<string, unknown>
): Promise<ApiResponse<AdminUser>> {
  return api<AdminUser>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<AdminUser>> {
  return api<AdminUser>(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteUser(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/users/${id}`, {
    method: "DELETE",
  });
}

// ─── Media ──────────────────────────────────────────────────────

export interface MediaListParams {
  page?: number;
  pageSize?: number;
  folder?: string;
  mimeType?: string;
}

export function mediaKey(params: MediaListParams = {}): string {
  return buildQuery("/api/media", params);
}

export async function deleteMedia(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/media/${id}`, {
    method: "DELETE",
  });
}

// ─── Sections / Sectors / Countries (read-only for admin) ──────

export function sectionsKey(): string {
  return "/api/sections";
}

export function sectorsKey(): string {
  return "/api/sectors";
}

export function countriesKey(): string {
  return "/api/countries";
}

// ─── Dashboard aggregates ───────────────────────────────────────

export interface DashboardStats {
  articleCount: number;
  userCount: number;
  totalViews: number;
}

/**
 * Fetches lightweight counts for the dashboard.
 * Uses three parallel API calls with pageSize=1 to get totals from pagination.
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [articles, users] = await Promise.all([
    api<Article[]>("/api/articles?pageSize=1"),
    api<AdminUser[]>("/api/users?pageSize=1"),
  ]);

  return {
    articleCount: articles.pagination?.total ?? 0,
    userCount: users.pagination?.total ?? 0,
    totalViews: 0, // would require a dedicated endpoint or DB aggregate
  };
}

// ─── AI Helpers ──────────────────────────────────────────────────

export interface AiStatus {
  available: boolean;
  provider: string | null;
}

export async function fetchAiStatus(): Promise<ApiResponse<AiStatus>> {
  return api<AiStatus>("/api/ai/status");
}

export async function aiTranslate(
  text: string,
  from: "ar" | "en",
  to: "ar" | "en"
): Promise<ApiResponse<{ translatedText: string; from: string; to: string }>> {
  return api<{ translatedText: string; from: string; to: string }>("/api/ai/translate", {
    method: "POST",
    body: JSON.stringify({ text, from, to }),
  });
}

export async function aiGenerateExcerpt(
  content: string,
  language: "ar" | "en",
  maxLength?: number
): Promise<ApiResponse<{ excerpt: string; language: string }>> {
  return api<{ excerpt: string; language: string }>("/api/ai/generate-excerpt", {
    method: "POST",
    body: JSON.stringify({ content, language, maxLength }),
  });
}

// ─── Subscriptions ───────────────────────────────────────────────

export interface SubscriberListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  planId?: string;
  search?: string;
}

export function subscribersKey(params: SubscriberListParams = {}): string {
  return buildQuery("/api/subscriptions", params);
}

export function subscriberKey(id: string): string {
  return `/api/subscriptions/${id}`;
}

export async function getSubscriptions(
  params: SubscriberListParams = {}
): Promise<ApiResponse<Subscriber[]>> {
  return api<Subscriber[]>(subscribersKey(params));
}

export async function getSubscriber(
  id: string
): Promise<ApiResponse<{ subscriber: Subscriber; payments: Payment[] }>> {
  return api<{ subscriber: Subscriber; payments: Payment[] }>(subscriberKey(id));
}

export async function createSubscriber(
  data: Record<string, unknown>
): Promise<ApiResponse<Subscriber>> {
  return api<Subscriber>("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSubscriber(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<Subscriber>> {
  return api<Subscriber>(`/api/subscriptions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSubscriber(
  id: string
): Promise<ApiResponse<{ canceled: boolean }>> {
  return api<{ canceled: boolean }>(`/api/subscriptions/${id}`, {
    method: "DELETE",
  });
}

// ─── Subscription Plans ──────────────────────────────────────────

export interface PlanListParams {
  // Plans list is always unfiltered (returns all active plans)
  // This key is kept simple for SWR caching
  adminAll?: boolean; // future: admin view may want inactive plans too
}

export function subscriptionPlansKey(_params: PlanListParams = {}): string {
  return "/api/subscription-plans";
}

export function subscriptionPlanKey(id: string): string {
  return `/api/subscription-plans/${id}`;
}

export async function getSubscriptionPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
  return api<SubscriptionPlan[]>("/api/subscription-plans");
}

export async function getSubscriptionPlan(
  id: string
): Promise<ApiResponse<SubscriptionPlan>> {
  return api<SubscriptionPlan>(`/api/subscription-plans/${id}`);
}

export async function createPlan(
  data: Record<string, unknown>
): Promise<ApiResponse<SubscriptionPlan>> {
  return api<SubscriptionPlan>("/api/subscription-plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePlan(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<SubscriptionPlan>> {
  return api<SubscriptionPlan>(`/api/subscription-plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePlan(
  id: string
): Promise<ApiResponse<{ deactivated: boolean }>> {
  return api<{ deactivated: boolean }>(`/api/subscription-plans/${id}`, {
    method: "DELETE",
  });
}

// ─── Promo Codes ─────────────────────────────────────────────────

export interface PromoCodeListParams {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
}

export function promoCodesKey(params: PromoCodeListParams = {}): string {
  return buildQuery("/api/promo-codes", params);
}

export function promoCodeKey(id: string): string {
  return `/api/promo-codes/${id}`;
}

export async function getPromoCodes(
  params: PromoCodeListParams = {}
): Promise<ApiResponse<PromoCode[]>> {
  return api<PromoCode[]>(promoCodesKey(params));
}

export async function getPromoCode(
  id: string
): Promise<ApiResponse<PromoCode>> {
  return api<PromoCode>(`/api/promo-codes/${id}`);
}

/**
 * Look up a promo code by its code string (e.g., "SAVE20").
 * The [id]/route.ts handler accepts both UUIDs and code strings.
 */
export async function getPromoCodeByCode(
  code: string
): Promise<ApiResponse<PromoCode>> {
  return api<PromoCode>(`/api/promo-codes/${encodeURIComponent(code.toUpperCase())}`);
}

export async function createPromoCode(
  data: Record<string, unknown>
): Promise<ApiResponse<PromoCode>> {
  return api<PromoCode>("/api/promo-codes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePromoCode(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<PromoCode>> {
  return api<PromoCode>(`/api/promo-codes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePromoCode(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/promo-codes/${id}`, {
    method: "DELETE",
  });
}

// ─── Magazine Sections ───────────────────────────────────────────

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
  articleCount?: number;
}

export function magazineSectionsKey(issueId: string): string {
  return `/api/magazines/${issueId}/sections`;
}

export function magazineSectionKey(issueId: string, sectionId: string): string {
  return `/api/magazines/${issueId}/sections/${sectionId}`;
}

export async function getMagazineSections(
  issueId: string
): Promise<ApiResponse<MagazineSection[]>> {
  return api<MagazineSection[]>(`/api/magazines/${issueId}/sections`);
}

export async function createMagazineSection(
  issueId: string,
  data: Record<string, unknown>
): Promise<ApiResponse<MagazineSection>> {
  return api<MagazineSection>(`/api/magazines/${issueId}/sections`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMagazineSection(
  issueId: string,
  sectionId: string,
  data: Record<string, unknown>
): Promise<ApiResponse<MagazineSection>> {
  return api<MagazineSection>(`/api/magazines/${issueId}/sections/${sectionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMagazineSection(
  issueId: string,
  sectionId: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/magazines/${issueId}/sections/${sectionId}`, {
    method: "DELETE",
  });
}

// ─── Magazine Board Articles ─────────────────────────────────────

export interface BoardArticle {
  id: string;
  title: string;
  titleEn: string;
  status: string;
  wordCount: number | null;
  dueDate: string | null;
  sectionId: string | null;
  sectionName: string | null;
  sectionColor: string | null;
  sortOrder: number;
  author: { id: string; name: string; avatar: string } | null;
  assignee: { id: string; name: string; avatar: string } | null;
}

export function magazineBoardKey(issueId: string): string {
  return `/api/magazines/${issueId}/articles`;
}

export async function getMagazineBoardArticles(
  issueId: string
): Promise<ApiResponse<BoardArticle[]>> {
  return api<BoardArticle[]>(`/api/magazines/${issueId}/articles`);
}

export async function updateArticleStatus(
  articleId: string,
  data: { status: string; note?: string; assigneeId?: string }
): Promise<ApiResponse<{ id: string; status: string; updatedAt: string }>> {
  return api<{ id: string; status: string; updatedAt: string }>(
    `/api/articles/${articleId}/status`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

// ─── Magazine PDF Signed URL ─────────────────────────────────────

export function magazinePdfUrlKey(issueId: string): string {
  return `/api/magazines/${issueId}/pdf-url`;
}

/**
 * Fetch a signed Supabase Storage URL for a magazine PDF.
 * Requires the user to be authenticated with an active/trialing subscription.
 * The URL expires after 1 hour (TTL enforced server-side).
 */
export async function getMagazinePdfUrl(
  issueId: string
): Promise<ApiResponse<{ url: string; expiresAt: string }>> {
  return api<{ url: string; expiresAt: string }>(`/api/magazines/${issueId}/pdf-url`);
}

// ─── Magazine Spreads ─────────────────────────────────────────────

export function magazineSpreadsKey(issueId: string): string {
  return `/api/magazines/${issueId}/spreads`;
}

export function magazineSpreadKey(issueId: string, spreadId: string): string {
  return `/api/magazines/${issueId}/spreads/${spreadId}`;
}

export async function getMagazineSpreads(
  issueId: string
): Promise<ApiResponse<MagazineSpread[]>> {
  return api<MagazineSpread[]>(`/api/magazines/${issueId}/spreads`);
}

export async function createMagazineSpread(
  issueId: string,
  data: { pageNumber: number; templateId: string; sectionId?: string | null }
): Promise<ApiResponse<MagazineSpread>> {
  return api<MagazineSpread>(`/api/magazines/${issueId}/spreads`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMagazineSpread(
  issueId: string,
  spreadId: string,
  data: {
    zones?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    templateId?: string;
    sectionId?: string | null;
    pageNumber?: number;
  }
): Promise<ApiResponse<MagazineSpread>> {
  return api<MagazineSpread>(`/api/magazines/${issueId}/spreads/${spreadId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMagazineSpread(
  issueId: string,
  spreadId: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/magazines/${issueId}/spreads/${spreadId}`, {
    method: "DELETE",
  });
}

export function spreadRevisionsKey(issueId: string, spreadId: string): string {
  return `/api/magazines/${issueId}/spreads/${spreadId}/revisions`;
}

export async function getSpreadRevisions(
  issueId: string,
  spreadId: string
): Promise<ApiResponse<SpreadRevision[]>> {
  return api<SpreadRevision[]>(`/api/magazines/${issueId}/spreads/${spreadId}/revisions`);
}

export async function saveSpreadRevision(
  issueId: string,
  spreadId: string,
  label: string
): Promise<ApiResponse<SpreadRevision>> {
  return api<SpreadRevision>(`/api/magazines/${issueId}/spreads/${spreadId}/revisions`, {
    method: "POST",
    body: JSON.stringify({ label }),
  });
}
