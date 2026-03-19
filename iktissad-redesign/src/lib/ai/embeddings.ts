/**
 * Embeddings & Semantic Search Helpers — Phase 9.4
 *
 * We do not have an embedding model provider installed, so we rely on
 * Supabase's weighted tsvector (`search_vector`) for "semantic" similarity.
 * The column is auto-maintained by a DB trigger (migration 020).
 *
 * When a real embedding model (e.g. @ai-sdk/openai text-embedding-3-small)
 * is added, swap `updateArticleSearchVector` to call `embed()` and persist
 * the vector to the `embedding` column instead.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimilarArticle {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  publishedAt: string;
  /** Composite similarity score (0–1). Higher = more similar. */
  similarity: number;
}

// ---------------------------------------------------------------------------
// updateArticleSearchVector
// ---------------------------------------------------------------------------

/**
 * Ensures the `search_vector` tsvector for the given article is up-to-date.
 *
 * The DB trigger rebuilds `search_vector` on every UPDATE, so touching
 * `updated_at` is sufficient to fire it. This is called at publish time
 * (via /api/ai/embed-article) to guarantee the vector reflects the latest
 * title/excerpt before the article goes live.
 *
 * If a real embedding model is integrated later, extend this function to:
 *   1. Build the embedding text from title + excerpt
 *   2. Call `embed()` to obtain a float[] vector
 *   3. Update the `embedding` column alongside `updated_at`
 */
export async function updateArticleSearchVector(articleId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("articles")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", articleId);

  if (error) {
    throw new Error(`updateArticleSearchVector failed for ${articleId}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// findSimilarArticles
// ---------------------------------------------------------------------------

/**
 * Returns articles similar to `articleId` using section/sector overlap and
 * title-word full-text matching.  Falls back to the Supabase RPC
 * `find_similar_articles` when available, otherwise runs a direct query.
 *
 * Results are sorted by descending similarity then descending `published_at`.
 */
export async function findSimilarArticles(
  articleId: string,
  limit: number = 5
): Promise<SimilarArticle[]> {
  const supabase = createAdminClient();

  // Attempt the DB-side RPC first (preferred — handles scoring in SQL).
  // Cast to any: the new RPC functions aren't in the generated Database type
  // until the migration is applied and types are regenerated (project gotcha).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
    "find_similar_articles",
    { source_article_id: articleId, result_limit: limit }
  );

  if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rpcData.map((row: {
      id: string;
      title: string;
      excerpt: string;
      slug: string;
      published_at: string;
      similarity: number;
    }) => ({
      id: row.id,
      title: row.title,
      excerpt: row.excerpt ?? "",
      slug: row.slug,
      publishedAt: row.published_at ?? "",
      similarity: row.similarity ?? 0,
    }));
  }

  // Fallback: fetch the source article's metadata then do a section/sector query
  const { data: source, error: sourceError } = await supabase
    .from("articles")
    .select("title, section_id, sector_id")
    .eq("id", articleId)
    .single();

  if (sourceError || !source) return [];

  // Build OR filter: same section OR same sector
  const orParts: string[] = [];
  if (source.section_id) orParts.push(`section_id.eq.${source.section_id}`);
  if (source.sector_id)  orParts.push(`sector_id.eq.${source.sector_id}`);
  if (orParts.length === 0) return [];

  const { data: rows, error: rowsError } = await supabase
    .from("articles")
    .select("id, title, excerpt, slug, published_at, section_id, sector_id")
    .eq("status", "published")
    .neq("id", articleId)
    .or(orParts.join(","))
    .order("published_at", { ascending: false })
    .limit(limit);

  if (rowsError || !rows) return [];

  return rows.map((row) => {
    const sectionScore = row.section_id === source.section_id ? 0.4 : 0;
    const sectorScore  = row.sector_id  === source.sector_id  ? 0.3 : 0;
    return {
      id: row.id,
      title: row.title,
      excerpt: (row.excerpt as string) ?? "",
      slug: row.slug,
      publishedAt: (row.published_at as string) ?? "",
      similarity: sectionScore + sectorScore,
    };
  });
}

// ---------------------------------------------------------------------------
// hybridSearch
// ---------------------------------------------------------------------------

export interface HybridSearchResult {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  publishedAt: string;
  rank: number;
}

/**
 * Performs a hybrid full-text search using the `search_articles_hybrid` RPC.
 * Falls back to a plain `ilike` query if the RPC is unavailable or returns
 * no results.
 */
export async function hybridSearch(
  query: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ results: HybridSearchResult[]; total: number; usedFts: boolean }> {
  const supabase = createAdminClient();

  // Try Postgres full-text hybrid RPC.
  // Cast to any: same reason as findSimilarArticles above — RPC not in DB types yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
    "search_articles_hybrid",
    { query_text: query, article_limit: limit, offset_val: offset }
  );

  if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: HybridSearchResult[] = rpcData.map((row: {
      id: string;
      title: string;
      excerpt: string;
      slug: string;
      published_at: string;
      rank: number;
    }) => ({
      id: row.id,
      title: row.title,
      excerpt: row.excerpt ?? "",
      slug: row.slug,
      publishedAt: row.published_at ?? "",
      rank: row.rank ?? 0,
    }));
    return { results, total: results.length, usedFts: true };
  }

  // Fallback: plain ILIKE
  const pattern = `%${query}%`;
  const { data: rows, count, error } = await supabase
    .from("articles")
    .select("id, title, excerpt, slug, published_at", { count: "exact" })
    .eq("status", "published")
    .or(
      `title.ilike.${pattern},excerpt.ilike.${pattern},title_en.ilike.${pattern},excerpt_en.ilike.${pattern}`
    )
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !rows) return { results: [], total: 0, usedFts: false };

  const results: HybridSearchResult[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: (row.excerpt as string) ?? "",
    slug: row.slug,
    publishedAt: (row.published_at as string) ?? "",
    rank: 0,
  }));

  return { results, total: count ?? results.length, usedFts: false };
}
