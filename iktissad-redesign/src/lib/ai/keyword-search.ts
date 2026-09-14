/**
 * Keyword Search Helpers
 *
 * Semantic search at launch is implemented as Postgres full-text search over a
 * weighted `tsvector` column (`articles.search_vector`), maintained by a DB
 * trigger (migration `20260401_020_semantic_search.sql`).
 *
 * No vector-embedding model is wired up — this module talks to tsvector RPCs
 * directly and falls back to ILIKE when the RPCs are unavailable. The
 * `articles.embedding vector(1536)` column exists in the schema but is unused;
 * its index was dropped in migration `20260518_042_drop_unused_embeddings.sql`
 * to avoid carrying ivfflat storage cost for an empty column. The column is
 * retained so a future embedding pipeline can be slotted in without another
 * schema change.
 *
 * Public surface:
 *   - updateArticleSearchVector(articleId)
 *   - findSimilarArticles(articleId, limit)
 *   - hybridSearch(query, limit, offset)
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
  featuredImage: string;
  /** Section name, for the badge on related cards. */
  section: string;
  /** Sector name; takes precedence over section on the badge. */
  sector: string;
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
 * Returns articles similar to `articleId`, ranked by the `find_similar_articles`
 * RPC: tag overlap + full-text overlap on the rare terms of the title + shared
 * country, with sector/section as weak tiebreakers and a mild freshness term.
 *
 * There is deliberately no JS-side fallback. The previous one caught the RPC's
 * error and quietly answered with "newest articles in the same section" — it
 * applied ORDER BY published_at and LIMIT in SQL, then computed a similarity
 * score in JS that nothing sorted on. The RPC had been raising 42702 on every
 * call since it was written, and the fallback is why nobody noticed. An error
 * here now surfaces as a 500 rather than as plausible-looking wrong answers.
 */
export async function findSimilarArticles(
  articleId: string,
  limit: number = 5
): Promise<SimilarArticle[]> {
  const supabase = createAdminClient();

  // Cast to any: the RPC is not in the generated Database type (project gotcha).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("find_similar_articles", {
    source_article_id: articleId,
    result_limit: limit,
  });

  if (error) {
    throw new Error(`find_similar_articles failed for ${articleId}: ${error.message}`);
  }

  if (!Array.isArray(data)) return [];

  return data.map((row: {
    id: string;
    title: string;
    excerpt: string | null;
    slug: string;
    featured_image: string | null;
    section: string | null;
    sector: string | null;
    published_at: string | null;
    similarity: number | null;
  }) => ({
    id: row.id,
    title: row.title,
    excerpt: row.excerpt ?? "",
    slug: row.slug,
    featuredImage: row.featured_image ?? "",
    section: row.section ?? "",
    sector: row.sector ?? "",
    publishedAt: row.published_at ?? "",
    similarity: row.similarity ?? 0,
  }));
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
