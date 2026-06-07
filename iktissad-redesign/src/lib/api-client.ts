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
  MagazineSpread,
  SpreadRevision,
  Newsletter,
  Section,
  Sector,
  Tag,
  Country,
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

// ─── CSRF token cache ────────────────────────────────────────────

let cachedCsrfToken: string | null = null;

/**
 * Fetch (and cache) the CSRF token from /api/auth/csrf.
 * Called automatically before any mutation request.
 */
async function fetchCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    const res = await fetch("/api/auth/csrf");
    if (res.ok) {
      const data = (await res.json()) as { csrfToken?: string };
      if (data.csrfToken) {
        cachedCsrfToken = data.csrfToken;
        return cachedCsrfToken;
      }
    }
  } catch {
    // CSRF fetch failure is non-fatal — server will return 403 if required
  }
  return "";
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
 * Kept for future use — currently scheduled internally via setTimeout only.
 */
function _drainQueue(): void {
  const now = Date.now();
  if (rateLimitResumeAt !== null && now < rateLimitResumeAt) {
    // Still in the window – schedule another drain attempt
    setTimeout(_drainQueue, rateLimitResumeAt - now + 50);
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

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function api<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal }
): Promise<ApiResponse<T>> {
  const method = (init?.method ?? "GET").toUpperCase();
  const extraHeaders: Record<string, string> = {};

  // Automatically include CSRF token for all mutation requests
  if (MUTATION_METHODS.has(method)) {
    const csrfToken = await fetchCsrfToken();
    if (csrfToken) {
      extraHeaders["x-csrf-token"] = csrfToken;
    }
  }

  const mergedInit: RequestInit & { signal?: AbortSignal } = {
    ...init,
    headers: { ...extraHeaders, ...(init?.headers ?? {}) },
  };

  return fetchWithRetry<T>(path, mergedInit);
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
  sortBy?: 'date' | 'views' | 'title';
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

// ─── Bulk actions ───────────────────────────────────────────────

export type ArticleBulkAction = "delete" | "publish" | "unpublish" | "archive";
export type UserBulkAction = "delete" | "disable" | "enable";

export interface BulkActionResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Bulk-mutate a set of articles. `ids` must be ≤ 100 UUIDs.
 * Caller must hold super_admin or editor role.
 */
export async function bulkArticles(
  ids: string[],
  action: ArticleBulkAction
): Promise<ApiResponse<BulkActionResult>> {
  return api<BulkActionResult>("/api/admin/articles/bulk", {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });
}

/**
 * Bulk-mutate a set of users. `ids` must be ≤ 100 UUIDs.
 * Caller must hold super_admin role. For `delete`, also cascades
 * through admin_roles server-side.
 */
export async function bulkUsers(
  ids: string[],
  action: UserBulkAction
): Promise<ApiResponse<BulkActionResult>> {
  return api<BulkActionResult>("/api/admin/users/bulk", {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });
}

// ─── Media ──────────────────────────────────────────────────────

export interface MediaListParams {
  page?: number;
  pageSize?: number;
  folder?: string;
  type?: string;
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

export interface CreateMediaInput {
  url: string;
  filename: string;
  mimeType?: string;
  size?: number;
  alt?: string;
  altEn?: string;
  folder?: string;
}

export async function createMedia(input: CreateMediaInput): Promise<ApiResponse<MediaItem>> {
  return api<MediaItem>("/api/media", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── Sections / Sectors / Countries ─────────────────────────────

export function sectionsKey(): string {
  return "/api/sections";
}

export function sectorsKey(): string {
  return "/api/sectors";
}

export function countriesKey(): string {
  return "/api/countries";
}

export interface CreateSectionInput {
  slug?: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
}

export type UpdateSectionInput = Partial<CreateSectionInput>;

export async function getSections(): Promise<ApiResponse<Section[]>> {
  return api<Section[]>(sectionsKey());
}

export async function createSection(
  input: CreateSectionInput
): Promise<ApiResponse<Section>> {
  return api<Section>(sectionsKey(), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSection(
  slug: string,
  patch: UpdateSectionInput
): Promise<ApiResponse<Section>> {
  return api<Section>(`/api/sections/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteSection(
  slug: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/sections/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}

// ─── Tags ───────────────────────────────────────────────────────

export function tagsKey(search = "", limit = 50): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return `/api/tags${qs ? `?${qs}` : ""}`;
}

export interface CreateTagInput {
  name: string;
  nameEn?: string;
  slug?: string;
  description?: string;
}

export type UpdateTagInput = Partial<CreateTagInput>;

export async function getTags(
  search = "",
  limit = 50
): Promise<ApiResponse<Tag[]>> {
  return api<Tag[]>(tagsKey(search, limit));
}

export async function createTag(
  input: CreateTagInput
): Promise<ApiResponse<Tag>> {
  return api<Tag>("/api/tags", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTag(
  id: string,
  patch: UpdateTagInput
): Promise<ApiResponse<Tag>> {
  return api<Tag>(`/api/tags/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteTag(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/tags/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export interface CreateSectorInput {
  slug?: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  icon?: string;
  color?: string;
}

export type UpdateSectorInput = Partial<CreateSectorInput>;

export async function getSectors(): Promise<ApiResponse<Sector[]>> {
  return api<Sector[]>(sectorsKey());
}

export async function createSector(
  input: CreateSectorInput
): Promise<ApiResponse<Sector>> {
  return api<Sector>(sectorsKey(), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSector(
  slug: string,
  patch: UpdateSectorInput
): Promise<ApiResponse<Sector>> {
  return api<Sector>(`/api/sectors/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteSector(
  slug: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/sectors/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}

export interface CreateCountryInput {
  slug?: string;
  name: string;
  nameEn?: string;
  flag?: string;
  region?: "gulf" | "mashreq" | "northafrica" | "world";
  economicOverview?: string;
  economicOverviewEn?: string;
  keyIndicators?: Record<string, string | number>;
}

export type UpdateCountryInput = Partial<CreateCountryInput>;

export async function getCountries(): Promise<ApiResponse<Country[]>> {
  return api<Country[]>(countriesKey());
}

export async function createCountry(
  input: CreateCountryInput
): Promise<ApiResponse<Country>> {
  return api<Country>(countriesKey(), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCountry(
  slug: string,
  patch: UpdateCountryInput
): Promise<ApiResponse<Country>> {
  return api<Country>(`/api/countries/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteCountry(
  slug: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/countries/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
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
  const [articles, users, totals] = await Promise.all([
    api<Article[]>("/api/articles?pageSize=1"),
    api<AdminUser[]>("/api/users?pageSize=1"),
    api<{ totalViews: number }>("/api/admin/analytics/totals").catch(() => null),
  ]);

  return {
    articleCount: articles.pagination?.total ?? 0,
    userCount: users.pagination?.total ?? 0,
    totalViews: totals?.data?.totalViews ?? 0,
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

// ─── Admin: Refunds ──────────────────────────────────────────────

export interface RefundResult {
  purchaseId: string;
  refundId: string;
  status: string;
}

/**
 * Issue a refund against a single-article purchase.
 *
 * Requires the caller to have the `super_admin` or `finance` admin role.
 * Pass `amount` to issue a partial refund (defaults to full).
 */
export async function refundPurchase(
  purchaseId: string,
  options: { amount?: number; reason?: string } = {}
): Promise<ApiResponse<RefundResult>> {
  return api<RefundResult>("/api/admin/refunds", {
    method: "POST",
    body: JSON.stringify({ purchaseId, ...options }),
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

// ─── Phase 5 AI Features ─────────────────────────────────────────────────────

export async function aiAutoTag(
  content: string,
  title: string,
  existingTags: string[] = []
): Promise<ApiResponse<{ tags: string[] }>> {
  return api<{ tags: string[] }>('/api/ai/auto-tag', {
    method: 'POST',
    body: JSON.stringify({ content, title, existingTags }),
  });
}

export async function aiSummarize(
  articleId: string,
  content: string,
  title: string
): Promise<ApiResponse<{ summary: string; summaryEn: string }>> {
  return api<{ summary: string; summaryEn: string }>('/api/ai/summarize', {
    method: 'POST',
    body: JSON.stringify({ articleId, content, title }),
  });
}

export async function aiGenerateSocialCards(
  articleId: string,
  title: string,
  featuredImage?: string,
  accentColor?: string
): Promise<ApiResponse<{ twitter: string; linkedin: string; whatsapp: string }>> {
  return api<{ twitter: string; linkedin: string; whatsapp: string }>('/api/ai/social-card', {
    method: 'POST',
    body: JSON.stringify({ articleId, title, featuredImage, accentColor }),
  });
}

// ─── Phase 7: Analytics & Insights ──────────────────────────────────────────

import type { RealtimeAnalytics } from '@/app/api/admin/analytics/realtime/route';

// SegmentAnalytics type — will be exported from the segments route once created
export type { RealtimeAnalytics };

export const realtimeAnalyticsKey = () => '/api/admin/analytics/realtime';

export const segmentAnalyticsKey = (period?: string) =>
  period ? `/api/admin/analytics/segments?period=${period}` : '/api/admin/analytics/segments';

export const headlineTestsKey = (params: { status?: string; articleId?: string } = {}) =>
  buildQuery('/api/admin/headline-tests', params);

export const headlineTestKey = (id: string) => `/api/admin/headline-tests/${id}`;

export async function createHeadlineTest(
  data: { articleId: string; variants: string[]; minSample?: number }
): Promise<ApiResponse<unknown>> {
  return api<unknown>('/api/admin/headline-tests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateHeadlineTest(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  return api<unknown>(`/api/admin/headline-tests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function trackShareEvent(
  data: { articleId: string; platform: string; sessionId?: string }
): Promise<ApiResponse<{ ok: true }>> {
  return api<{ ok: true }>('/api/analytics/share-event', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export const shareAnalyticsKey = (period?: string) =>
  period ? `/api/admin/analytics/shares?period=${period}` : '/api/admin/analytics/shares';

export const seoScoresKey = (params: { page?: number; pageSize?: number; sortBy?: string } = {}) =>
  buildQuery('/api/admin/analytics/seo-scores', params);

// ─── Admin: API Keys (Phase 10.2) ────────────────────────────────────────────

import type {
  ApiKey,
  ApiKeyScope,
  ApiKeyUsageStats,
  Webhook as WebhookType,
  WebhookDelivery,
  WebhookEventType,
  AutomationRule,
  Source,
} from '@/types';

export const apiKeysKey = () => '/api/admin/api-keys';
export const apiKeyUsageKey = (id: string) => `/api/admin/api-keys/${id}/usage`;

export async function getApiKeys(): Promise<ApiResponse<ApiKey[]>> {
  return api<ApiKey[]>('/api/admin/api-keys');
}

export async function getApiKeyUsage(
  id: string
): Promise<ApiResponse<ApiKeyUsageStats>> {
  return api<ApiKeyUsageStats>(`/api/admin/api-keys/${id}/usage`);
}

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiKeyScope[];
  rateLimitPerMinute: number;
}

export async function createApiKey(
  data: CreateApiKeyInput
): Promise<ApiResponse<ApiKey> & { rawKey?: string }> {
  return api<ApiKey>('/api/admin/api-keys', {
    method: 'POST',
    body: JSON.stringify(data),
  }) as Promise<ApiResponse<ApiKey> & { rawKey?: string }>;
}

export async function updateApiKey(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<ApiKey>> {
  return api<ApiKey>(`/api/admin/api-keys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteApiKey(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/admin/api-keys/${id}`, {
    method: 'DELETE',
  });
}

// ─── Admin: Webhooks ─────────────────────────────────────────────────────────

export const webhooksKey = () => '/api/admin/webhooks';
export const webhookDeliveriesKey = (id: string) =>
  `/api/admin/webhooks/${id}/deliveries`;

export async function getWebhooks(): Promise<ApiResponse<WebhookType[]>> {
  return api<WebhookType[]>('/api/admin/webhooks');
}

export async function getWebhookDeliveries(
  id: string
): Promise<ApiResponse<WebhookDelivery[]>> {
  return api<WebhookDelivery[]>(`/api/admin/webhooks/${id}/deliveries`);
}

export interface CreateWebhookInput {
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
}

export async function createWebhook(
  data: CreateWebhookInput
): Promise<ApiResponse<WebhookType>> {
  return api<WebhookType>('/api/admin/webhooks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWebhook(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<WebhookType>> {
  return api<WebhookType>(`/api/admin/webhooks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteWebhook(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/admin/webhooks/${id}`, {
    method: 'DELETE',
  });
}

export async function testWebhook(
  id: string
): Promise<ApiResponse<{ success: boolean }>> {
  return api<{ success: boolean }>(`/api/admin/webhooks/${id}/test`, {
    method: 'POST',
  });
}

// ─── Admin: Automations ──────────────────────────────────────────────────────

export const automationsKey = () => '/api/admin/automations';

export async function getAutomations(): Promise<ApiResponse<AutomationRule[]>> {
  return api<AutomationRule[]>('/api/admin/automations');
}

export async function updateAutomation(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<AutomationRule>> {
  return api<AutomationRule>(`/api/admin/automations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── Admin: Social Accounts (Phase 10.3) ─────────────────────────────────────

import type { SocialAccount } from '@/app/api/admin/social-accounts/route';

export const socialAccountsKey = () => '/api/admin/social-accounts';

export async function getSocialAccounts(): Promise<ApiResponse<SocialAccount[]>> {
  return api<SocialAccount[]>('/api/admin/social-accounts');
}

export interface CreateSocialAccountInput {
  platform: 'twitter' | 'linkedin' | 'telegram';
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

export async function createSocialAccount(
  data: CreateSocialAccountInput
): Promise<ApiResponse<SocialAccount>> {
  return api<SocialAccount>('/api/admin/social-accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSocialAccount(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<SocialAccount>> {
  return api<SocialAccount>(`/api/admin/social-accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSocialAccount(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/admin/social-accounts/${id}`, {
    method: 'DELETE',
  });
}

// ─── Admin: Contact Submissions ──────────────────────────────────────────────

import type { ContactSubmission } from '@/app/api/admin/contact-submissions/route';

export interface ContactSubmissionsListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export function contactSubmissionsKey(params: ContactSubmissionsListParams = {}): string {
  return buildQuery('/api/admin/contact-submissions', params);
}

export async function deleteContactSubmission(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/admin/contact-submissions/${id}`, {
    method: 'DELETE',
  });
}

// Type re-export so consumers can use it via api-client
export type { ContactSubmission };

// ─── Admin: Newsletter Subscribers (free tier) ───────────────────────────────

import type { NewsletterSubscriber } from '@/app/api/admin/newsletter-subscribers/route';

export interface NewsletterSubscribersListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'unsubscribed' | '';
}

export function newsletterSubscribersKey(
  params: NewsletterSubscribersListParams = {}
): string {
  return buildQuery('/api/admin/newsletter-subscribers', params);
}

export async function updateNewsletterSubscriber(
  id: string,
  data: { status: 'active' | 'unsubscribed' }
): Promise<ApiResponse<NewsletterSubscriber>> {
  return api<NewsletterSubscriber>(`/api/admin/newsletter-subscribers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteNewsletterSubscriber(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/admin/newsletter-subscribers/${id}`, {
    method: 'DELETE',
  });
}

export type { NewsletterSubscriber };

// ─── Admin: Notifications ────────────────────────────────────────────────────

export const adminNotificationsKey = () => '/api/admin/notifications';

export async function getAdminNotifications<T = unknown>(): Promise<ApiResponse<T[]>> {
  return api<T[]>('/api/admin/notifications');
}

export async function markAdminNotificationRead(
  id: string
): Promise<ApiResponse<unknown>> {
  return api<unknown>(`/api/admin/notifications/${id}`, { method: 'PUT' });
}

export async function markAllAdminNotificationsRead(): Promise<ApiResponse<unknown>> {
  return api<unknown>('/api/admin/notifications', { method: 'PUT' });
}

// ─── Admin: A/B Tests (Headlines) ────────────────────────────────────────────

export interface CreateAbTestInput {
  articleId: string;
  variantA: string;
  variantB: string;
  durationHours: number;
  trafficSplit: number;
}

export async function createAbTest(
  data: CreateAbTestInput
): Promise<ApiResponse<unknown>> {
  return api<unknown>('/api/admin/ab-tests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAbTest(
  data: { id: string; status: string }
): Promise<ApiResponse<unknown>> {
  return api<unknown>('/api/admin/ab-tests', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Live Blogs ──────────────────────────────────────────────────────────────

export const liveBlogsKey = () => '/api/live-blogs';
export const liveBlogKey = (id: string) => `/api/live-blogs/${id}`;

export async function createLiveBlog(
  data: { articleId: string }
): Promise<ApiResponse<unknown>> {
  return api<unknown>('/api/live-blogs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLiveBlog(
  id: string,
  data: { status: 'active' | 'ended' }
): Promise<ApiResponse<unknown>> {
  return api<unknown>(`/api/live-blogs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function postLiveBlogUpdate(
  blogId: string,
  data: { content: string }
): Promise<ApiResponse<unknown>> {
  return api<unknown>(`/api/live-blogs/${blogId}/updates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Series (extra mutations needed beyond existing helpers) ────────────────
// createSeries / updateSeries / deleteSeries / addArticleToSeries /
// reorderSeriesArticles / removeArticleFromSeries already exist above.

// ─── Comments ────────────────────────────────────────────────────────────────

export async function updateComment(
  id: string,
  data: { status: 'approved' | 'rejected' | 'spam' }
): Promise<ApiResponse<unknown>> {
  return api<unknown>(`/api/comments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteComment(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/comments/${id}`, {
    method: 'DELETE',
  });
}

// ─── Sources (extra: delete) ─────────────────────────────────────────────────

export async function deleteSource(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/sources/${id}`, {
    method: 'DELETE',
  });
}

// ─── Advertisers ─────────────────────────────────────────────────────────────

import type { Advertiser } from '@/app/api/advertisers/route';

export interface AdvertiserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function advertisersKey(params: AdvertiserListParams = {}): string {
  return buildQuery('/api/advertisers', params);
}

export async function createAdvertiser(
  data: Record<string, unknown>
): Promise<ApiResponse<Advertiser>> {
  return api<Advertiser>('/api/advertisers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdvertiser(
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<Advertiser>> {
  return api<Advertiser>(`/api/advertisers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdvertiser(
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api<{ deleted: boolean }>(`/api/advertisers/${id}`, {
    method: 'DELETE',
  });
}

// Silence "unused" for re-exported source type
export type { Source };

