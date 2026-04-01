/**
 * Typed API client for IKTISSAD admin pages.
 *
 * Wraps fetch() with JSON parsing, error handling, and typed responses
 * matching the ApiResponse<T> shape returned by our API routes.
 *
 * Features:
 *  - Typed ApiError with status, message, retryAfter fields
 *  - 429 rate-limit detection: reads Retry-After header (seconds or HTTP date)
 *  - Automatic retry with exact Retry-After wait (max 3 retries)
 *  - Exponential back-off when no Retry-After header: 1s → 2s → 4s
 *  - In-memory request queue (max 20) paused during rate-limit window
 *  - Sonner toast on first 429 (debounced), error toast when retries exhausted
 *  - 30-second request timeout via AbortController
 *  - AbortController signal threading through retry loop
 */

import { toast } from "sonner";

import type {
  ApiResponse,
  Article,
  ArticleVersion,
  MagazineIssue,
  AdminUser,
  MediaItem,
  Section,
  Sector,
  Country,
  MagazineSpread,
  SpreadRevision,
  Newsletter,
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

// ─── Typed error ────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Rate-limit queue & state ────────────────────────────────────

const MAX_QUEUE_SIZE = 20;
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 30_000;
const BACKOFF_SEQUENCE_MS = [1_000, 2_000, 4_000];

// Global pause state – when a 429 is received, all queued requests wait here.
let rateLimitResumeAt: number | null = null; // epoch ms when queue can resume

// Pending queue entries: each entry is a thunk that resolves when executed.
type QueueEntry = {
  run: () => void;
  reject: (err: unknown) => void;
};
const requestQueue: QueueEntry[] = [];

// Toast deduplication – only one "rate limited" toast per burst window.
let rateLimitToastActive = false;

/**
 * Parse the Retry-After header value.
 * Supports both integer-seconds ("30") and HTTP-date formats.
 * Returns seconds to wait, or null if unparseable.
 */
function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = parseInt(value, 10);
  if (!isNaN(seconds) && seconds >= 0) return seconds;
  // Try HTTP-date
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    const diff = Math.ceil((date.getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }
  return null;
}

/**
 * Show a single debounced "rate limited" toast.
 * Clears the dedup flag after the wait window expires.
 */
function showRateLimitToast(waitSeconds: number | null): void {
  if (rateLimitToastActive) return;
  rateLimitToastActive = true;

  const message =
    waitSeconds !== null
      ? `جارٍ الانتظار ${waitSeconds} ثانية قبل إعادة المحاولة…`
      : "جارٍ الانتظار قبل إعادة المحاولة…";

  toast.loading(message, { id: "rate-limit", duration: (waitSeconds ?? 5) * 1_000 });

  const clearAfter = ((waitSeconds ?? 5) + 1) * 1_000;
  setTimeout(() => {
    rateLimitToastActive = false;
  }, clearAfter);
}

/**
 * Drain the request queue after a rate-limit window expires.
 * Each entry's `run()` re-invokes the fetch; errors surface to the original caller.
 */
function drainQueue(): void {
  const now = Date.now();
  if (rateLimitResumeAt !== null && now < rateLimitResumeAt) {
    // Still in the window – schedule another drain attempt
    setTimeout(drainQueue, rateLimitResumeAt - now + 50);
    return;
  }
  rateLimitResumeAt = null;
  // Drain all pending entries (they will self-retry from inside api())
  while (requestQueue.length > 0) {
    const entry = requestQueue.shift()!;
    entry.run();
  }
}

/**
 * Enqueue a deferred request. If the queue is full, reject the oldest entry
 * to avoid unbounded memory growth.
 */
function enqueue(entry: QueueEntry): void {
  if (requestQueue.length >= MAX_QUEUE_SIZE) {
    // Reject the oldest (front) item
    const oldest = requestQueue.shift()!;
    oldest.reject(
      new ApiError(429, "تم تجاوز الحد الأقصى لقائمة الانتظار — حاول مجدداً لاحقاً", 0)
    );
  }
  requestQueue.push(entry);
}

// ─── Core fetch with retry ───────────────────────────────────────

/**
 * Internal fetch wrapper that handles:
 * - 30-second timeout
 * - 429 detection with Retry-After parsing
 * - Exponential backoff (up to MAX_RETRIES)
 * - Propagation of AbortController signal
 */
async function fetchWithRetry<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal },
  attempt = 0
): Promise<ApiResponse<T>> {
  // If we are in a rate-limit window and this is a fresh attempt (not a retry
  // inside the wait), queue the request and wait.
  if (rateLimitResumeAt !== null && Date.now() < rateLimitResumeAt && attempt === 0) {
    return new Promise<ApiResponse<T>>((resolve, reject) => {
      enqueue({
        run: () => fetchWithRetry<T>(path, init, 0).then(resolve).catch(reject),
        reject,
      });
    });
  }

  // Combine caller signal with a per-request timeout signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutController.abort(new DOMException("Request timed out", "TimeoutError")),
    DEFAULT_TIMEOUT_MS
  );

  // Merge signals: abort if either the caller or timeout fires
  let combinedSignal: AbortSignal;
  if (init.signal) {
    // AbortSignal.any is widely available in modern environments
    try {
      combinedSignal = AbortSignal.any
        ? AbortSignal.any([init.signal, timeoutController.signal])
        : timeoutController.signal;
    } catch {
      combinedSignal = timeoutController.signal;
    }
  } else {
    combinedSignal = timeoutController.signal;
  }

  let res: Response;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json", ...init.headers },
      ...init,
      signal: combinedSignal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  // ── 429 handling ──────────────────────────────────────────────
  if (res.status === 429) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const waitSeconds = parseRetryAfter(retryAfterHeader);

    // Compute actual wait in ms
    const waitMs =
      waitSeconds !== null
        ? waitSeconds * 1_000
        : BACKOFF_SEQUENCE_MS[Math.min(attempt, BACKOFF_SEQUENCE_MS.length - 1)];

    // Show toast (debounced)
    showRateLimitToast(waitSeconds ?? Math.round(waitMs / 1_000));

    if (attempt >= MAX_RETRIES) {
      toast.error("تعذّر إتمام الطلب — حاول مجدداً لاحقاً", { id: "rate-limit-exhausted" });
      throw new ApiError(429, "تعذّر إتمام الطلب — تجاوزت حد إعادة المحاولة", waitSeconds ?? undefined);
    }

    // Record the global resume time so concurrent requests queue up
    rateLimitResumeAt = Date.now() + waitMs;

    // Wait, then retry (but only if the caller hasn't aborted)
    await new Promise<void>((resolve, reject) => {
      const tid = setTimeout(resolve, waitMs);
      if (init.signal) {
        init.signal.addEventListener("abort", () => {
          clearTimeout(tid);
          reject(init.signal!.reason ?? new DOMException("Aborted", "AbortError"));
        });
      }
    });

    return fetchWithRetry<T>(path, init, attempt + 1);
  }

  // ── Non-429 error ─────────────────────────────────────────────
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(res.status, `HTTP ${res.status}: response is not JSON`);
  }

  if (!res.ok) {
    throw new ApiError(res.status, json.error ?? `Request failed (${res.status})`);
  }

  return json;
}

// ─── Public base fetcher ─────────────────────────────────────────

async function api<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal }
): Promise<ApiResponse<T>> {
  return fetchWithRetry<T>(path, init ?? {});
}

/**
 * SWR-compatible fetcher. Throws on error so SWR surfaces it correctly.
 */
export async function swrFetcher<T>(url: string): Promise<ApiResponse<T>> {
  return api<T>(url);
}

// ─── Rate-limit state accessor (for hooks/banners) ───────────────

/**
 * Returns the number of seconds remaining in the current rate-limit window,
 * or 0 if not currently rate-limited.
 */
export function getRateLimitSecondsRemaining(): number {
  if (rateLimitResumeAt === null) return 0;
  const remaining = Math.ceil((rateLimitResumeAt - Date.now()) / 1_000);
  return Math.max(0, remaining);
}

/**
 * Returns true if requests are currently paused due to a 429 window.
 */
export function isRateLimited(): boolean {
  return rateLimitResumeAt !== null && Date.now() < rateLimitResumeAt;
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

// ─── Newsletters (Phase 4.3) ──────────────────────────────────────

export interface NewsletterListParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export function newslettersKey(params: NewsletterListParams = {}): string {
  return buildQuery("/api/newsletters", params);
}

export function newsletterKey(id: string): string {
  return `/api/newsletters/${id}`;
}

export async function createNewsletter(
  data: Record<string, unknown>
): Promise<ApiResponse<Newsletter>> {
  return api<Newsletter>("/api/newsletters", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateNewsletter(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<Newsletter>> {
  return api<Newsletter>(`/api/newsletters/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteNewsletter(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/newsletters/${id}`, {
    method: "DELETE",
  });
}

export async function sendNewsletter(
  id: string
): Promise<ApiResponse<Newsletter>> {
  return api<Newsletter>(`/api/newsletters/${id}/send`, {
    method: "POST",
  });
}

// ─── Article Versions (Phase 6.1) ────────────────────────────────────────────

export async function fetchArticleVersions(
  articleId: string
): Promise<ApiResponse<ArticleVersion[]>> {
  return api<ArticleVersion[]>(`/api/articles/${articleId}/versions`);
}

export async function createArticleVersion(
  articleId: string,
  summary?: string
): Promise<ApiResponse<ArticleVersion>> {
  return api<ArticleVersion>(`/api/articles/${articleId}/versions`, {
    method: "POST",
    body: JSON.stringify({ summary }),
  });
}

export async function restoreArticleVersion(
  articleId: string,
  versionId: string
): Promise<ApiResponse<{ success: boolean; restoredVersionNumber: number }>> {
  return api<{ success: boolean; restoredVersionNumber: number }>(
    `/api/articles/${articleId}/versions/${versionId}/restore`,
    { method: "POST" }
  );
}

export async function generateVersionSummary(
  previousContent: string,
  currentContent: string,
  previousTitle?: string,
  currentTitle?: string
): Promise<ApiResponse<{ summary: string }>> {
  return api<{ summary: string }>("/api/ai/version-summary", {
    method: "POST",
    body: JSON.stringify({ previousContent, currentContent, previousTitle, currentTitle }),
  });
}

// ─── Phase 5: Content Intelligence ───────────────────────────────────────────

export const revenueAttributionKey = (articleId?: string) =>
  articleId
    ? `/api/admin/revenue-attribution?articleId=${articleId}`
    : '/api/admin/revenue-attribution';

export const contentGapKey = () => '/api/admin/content-gap';

export async function getPaywallSuggestions(
  articleId: string
): Promise<ApiResponse<import('@/types').PaywallSuggestionData>> {
  return api<import('@/types').PaywallSuggestionData>(
    `/api/ai/paywall-suggestions?articleId=${articleId}`
  );
}

export async function getPerformanceRecommendations(
  articleId: string
): Promise<ApiResponse<import('@/types').ArticlePerformanceRecommendations>> {
  return api<import('@/types').ArticlePerformanceRecommendations>(
    '/api/ai/performance-recommendations',
    {
      method: 'POST',
      body: JSON.stringify({ articleId }),
    }
  );
}

// ─── Phase 10.1: Article Series / Dossiers ───────────────────────────────────

import type { ArticleSeries, SeriesArticle } from '@/types';

export interface SeriesListParams {
  page?: number;
  pageSize?: number;
  status?: 'active' | 'archived';
}

export function seriesKey(params: SeriesListParams = {}): string {
  return buildQuery('/api/series', params);
}

export function seriesDetailKey(slug: string): string {
  return `/api/series/${slug}`;
}

export function seriesArticlesKey(slug: string): string {
  return `/api/series/${slug}/articles`;
}

export async function createSeries(
  data: Record<string, unknown>
): Promise<ApiResponse<ArticleSeries>> {
  return api<ArticleSeries>('/api/series', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSeries(
  slug: string,
  data: Record<string, unknown>
): Promise<ApiResponse<ArticleSeries>> {
  return api<ArticleSeries>(`/api/series/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSeries(
  slug: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/series/${slug}`, {
    method: 'DELETE',
  });
}

export async function addArticleToSeries(
  slug: string,
  articleId: string,
  orderIndex?: number
): Promise<ApiResponse<SeriesArticle>> {
  return api<SeriesArticle>(`/api/series/${slug}/articles`, {
    method: 'POST',
    body: JSON.stringify({ articleId, orderIndex }),
  });
}

export async function reorderSeriesArticles(
  slug: string,
  order: Array<{ id: string; orderIndex: number }>
): Promise<ApiResponse<{ reordered: boolean }>> {
  return api<{ reordered: boolean }>(`/api/series/${slug}/articles`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

export async function removeArticleFromSeries(
  slug: string,
  seriesArticleId: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(
    `/api/series/${slug}/articles?seriesArticleId=${seriesArticleId}`,
    { method: 'DELETE' }
  );
}

// ─── Account Preferences ─────────────────────────────────────────

export type SectorKey =
  | 'energy'
  | 'banking'
  | 'realEstate'
  | 'technology'
  | 'industry'
  | 'trade';

export interface AccountPreferences {
  sectors?: SectorKey[];
  onboarded?: boolean;
}

/**
 * PATCH /api/account/preferences
 *
 * Persists the authenticated user's sector interests and/or onboarded flag
 * into Supabase Auth user_metadata. Safe to call from client components.
 */
export async function updatePreferences(
  prefs: AccountPreferences
): Promise<ApiResponse<{ updated: boolean }>> {
  return api<{ updated: boolean }>('/api/account/preferences', {
    method: 'PATCH',
    body: JSON.stringify(prefs),
  });
}
