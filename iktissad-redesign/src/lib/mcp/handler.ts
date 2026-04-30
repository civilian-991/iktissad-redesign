/**
 * MCP Tool Call Handler
 *
 * Executes each MCP tool by querying Supabase via the admin client.
 * Returns MCP content format: { content: [{ type: "text", text: string }] }
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { MCPToolResult } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract plain text from TipTap JSON content or return raw string. */
function extractPlainText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") {
    // Already a string — strip any residual HTML tags
    return content.replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").trim();
  }
  // TipTap JSON doc: recursively collect text nodes
  if (typeof content === "object") {
    const node = content as Record<string, unknown>;
    let text = "";
    if (node.type === "text" && typeof node.text === "string") {
      text += node.text;
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        text += " " + extractPlainText(child);
      }
    }
    return text.replace(/\s{2,}/g, " ").trim();
  }
  return "";
}

function clampLimit(limit: unknown, defaultVal = 10, max = 50): number {
  const n = typeof limit === "number" ? Math.floor(limit) : defaultVal;
  return Math.min(Math.max(n, 1), max);
}

function ok(text: string): MCPToolResult {
  return { content: [{ type: "text", text }] };
}

function err(message: string): MCPToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

// ── Article SELECT fragment ───────────────────────────────────────────────────

const ARTICLE_SELECT = `
  id,
  title,
  slug,
  excerpt,
  content,
  published_at,
  tags,
  sections:section_id ( slug, name ),
  users:author_id ( name )
`;

// ── Tool Implementations ──────────────────────────────────────────────────────

async function searchArticles(args: Record<string, unknown>): Promise<MCPToolResult> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return err("query is required");

  const limit = clampLimit(args.limit);
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from("articles") as any)
    .select(ARTICLE_SELECT)
    .eq("status", "published")
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,content.ilike.%${query}%`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (typeof args.section === "string" && args.section) {
    // Resolve section slug → id first
    const { data: sec } = await admin
      .from("sections")
      .select("id")
      .eq("slug", args.section)
      .single();
    if (sec) {
      q = q.eq("section_id", (sec as { id: string }).id);
    }
  }

  const { data: rows, error } = await q;
  if (error) return err(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = (rows ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt ?? "",
    section: r.sections?.name ?? r.sections?.slug ?? "",
    publishedAt: r.published_at ?? "",
    url: `/articles/${r.slug}`,
  }));

  return ok(JSON.stringify(articles, null, 2));
}

async function getArticle(args: Record<string, unknown>): Promise<MCPToolResult> {
  const slug = typeof args.slug === "string" ? args.slug.trim() : "";
  if (!slug) return err("slug is required");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("articles") as any)
    .select(ARTICLE_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !row) return err(error?.message ?? "Article not found");

  const article = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? "",
    content: extractPlainText(row.content),
    section: row.sections?.name ?? row.sections?.slug ?? "",
    author: row.users?.name ?? "",
    publishedAt: row.published_at ?? "",
    tags: row.tags ?? [],
    url: `/articles/${row.slug}`,
  };

  return ok(JSON.stringify(article, null, 2));
}

async function listSections(): Promise<MCPToolResult> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (admin.from("sections") as any)
    .select("id, slug, name, name_en")
    .order("name");

  if (error) return err(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections = (rows ?? []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    nameEn: r.name_en ?? "",
  }));

  return ok(JSON.stringify(sections, null, 2));
}

async function listSeries(): Promise<MCPToolResult> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (admin.from("article_series") as any)
    .select("id, slug, title, title_en, description, series_articles(count)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) return err(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series = (rows ?? []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description ?? "",
    articleCount: Array.isArray(r.series_articles) ? r.series_articles.length : 0,
  }));

  return ok(JSON.stringify(series, null, 2));
}

async function getSeries(args: Record<string, unknown>): Promise<MCPToolResult> {
  const slug = typeof args.slug === "string" ? args.slug.trim() : "";
  if (!slug) return err("slug is required");

  const admin = createAdminClient();

  // Fetch series metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: seriesRow, error: seriesErr } = await (admin.from("article_series") as any)
    .select("id, title, description")
    .eq("slug", slug)
    .single();

  if (seriesErr || !seriesRow) return err(seriesErr?.message ?? "Series not found");

  // Fetch articles in reading order via series_articles join
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: links, error: linksErr } = await (admin.from("series_articles") as any)
    .select("order_index, articles:article_id ( id, title, slug, published_at, status )")
    .eq("series_id", seriesRow.id)
    .order("order_index", { ascending: true });

  if (linksErr) return err(linksErr.message);

   
  const articles = (links ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((l: any) => l.articles?.status === "published")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any) => ({
      orderIndex: l.order_index,
      title: l.articles.title,
      slug: l.articles.slug,
      publishedAt: l.articles.published_at ?? "",
    }));

  const result = {
    title: seriesRow.title,
    description: seriesRow.description ?? "",
    articles,
  };

  return ok(JSON.stringify(result, null, 2));
}

async function getLatestArticles(args: Record<string, unknown>): Promise<MCPToolResult> {
  const limit = clampLimit(args.limit);
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from("articles") as any)
    .select(ARTICLE_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (typeof args.section === "string" && args.section) {
    const { data: sec } = await admin
      .from("sections")
      .select("id")
      .eq("slug", args.section)
      .single();
    if (sec) {
      q = q.eq("section_id", (sec as { id: string }).id);
    }
  }

  const { data: rows, error } = await q;
  if (error) return err(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = (rows ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt ?? "",
    section: r.sections?.name ?? r.sections?.slug ?? "",
    publishedAt: r.published_at ?? "",
    url: `/articles/${r.slug}`,
  }));

  return ok(JSON.stringify(articles, null, 2));
}

async function getArticleContext(args: Record<string, unknown>): Promise<MCPToolResult> {
  const topic = typeof args.topic === "string" ? args.topic.trim() : "";
  if (!topic) return err("topic is required");

  const admin = createAdminClient();

  // Search for related articles using the topic as a keyword
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (admin.from("articles") as any)
    .select(ARTICLE_SELECT)
    .eq("status", "published")
    .or(`title.ilike.%${topic}%,excerpt.ilike.%${topic}%,content.ilike.%${topic}%`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(15);

  if (error) return err(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relatedArticles = (rows ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt ?? "",
    section: r.sections?.name ?? r.sections?.slug ?? "",
    publishedAt: r.published_at ?? "",
    url: `/articles/${r.slug}`,
  }));

  // Derive key sections that cover this topic
  const sectionCounts: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of rows ?? [] as any[]) {
    const sName = r.sections?.name ?? r.sections?.slug ?? "";
    if (sName) sectionCounts[sName] = (sectionCounts[sName] ?? 0) + 1;
  }
  const keySections = Object.entries(sectionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const result = {
    relatedArticles,
    keySections,
  };

  return ok(JSON.stringify(result, null, 2));
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function handleToolCall(
  toolName: string,
  args: unknown
): Promise<MCPToolResult> {
  const safeArgs = (typeof args === "object" && args !== null ? args : {}) as Record<string, unknown>;

  try {
    switch (toolName) {
      case "search_articles":    return await searchArticles(safeArgs);
      case "get_article":        return await getArticle(safeArgs);
      case "list_sections":      return await listSections();
      case "list_series":        return await listSeries();
      case "get_series":         return await getSeries(safeArgs);
      case "get_latest_articles":return await getLatestArticles(safeArgs);
      case "get_article_context":return await getArticleContext(safeArgs);
      default:
        return err(`Unknown tool: ${toolName}`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[mcp/handler] tool="${toolName}" error:`, msg);
    return err(`Internal error: ${msg}`);
  }
}
