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
} from "@/types";

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
