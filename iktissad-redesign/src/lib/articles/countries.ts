/**
 * Multi-country articles.
 *
 * `articles.country_id` remains the *primary* country (it feeds the
 * `countries:country_id ( slug, name )` embed every card and feed already
 * reads); the `article_countries` join table holds the full set and is what
 * country pages, country feeds and per-country counts filter on.
 *
 * These helpers keep the two in step: the caller passes an ordered list of
 * country slugs, gets back the primary id for `articles.country_id`, and then
 * writes the set with `setArticleCountries`.
 */

/** The PostgREST embed that hydrates the full country set on an article select. */
export const ARTICLE_COUNTRIES_EMBED =
  "article_countries ( position, countries ( slug, name ) )";

// The admin/anon Supabase clients are typed loosely across this codebase
// (postgrest-js infers `never` for several of our hand-written table types),
// so these helpers take the same escape hatch the API routes already use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export interface ResolvedCountry {
  id: string;
  slug: string;
  name: string;
}

/**
 * Resolves country slugs to rows, preserving the caller's order and dropping
 * unknown or duplicate slugs.
 */
export async function resolveCountrySlugs(
  client: Client,
  slugs: string[]
): Promise<ResolvedCountry[]> {
  const wanted = slugs.map((s) => s.trim()).filter(Boolean);
  if (wanted.length === 0) return [];

  const { data } = await client
    .from("countries")
    .select("id, slug, name")
    .in("slug", wanted);

  const bySlug = new Map<string, ResolvedCountry>(
    ((data ?? []) as ResolvedCountry[]).map((c) => [c.slug, c])
  );

  const resolved: ResolvedCountry[] = [];
  for (const slug of wanted) {
    const c = bySlug.get(slug);
    if (c && !resolved.some((r) => r.id === c.id)) resolved.push(c);
  }
  return resolved;
}

/** The `article_countries` embed shape mapArticleRow expects, for write paths
 *  that already know the set and want to avoid a re-select. */
export function countriesEmbed(countries: ResolvedCountry[]) {
  return countries.map((c, position) => ({
    position,
    countries: { slug: c.slug, name: c.name },
  }));
}

/**
 * Makes `article_countries` hold exactly `countryIds`, in that order
 * (position 0 = primary). Rows the editor removed are deleted; the rest are
 * upserted so positions stay correct after a reorder.
 */
export async function setArticleCountries(
  client: Client,
  articleId: string,
  countryIds: string[]
): Promise<void> {
  if (countryIds.length === 0) {
    await client.from("article_countries").delete().eq("article_id", articleId);
    return;
  }

  // Drop the ones no longer selected, then upsert the current set.
  await client
    .from("article_countries")
    .delete()
    .eq("article_id", articleId)
    .not("country_id", "in", `(${countryIds.join(",")})`);

  await client.from("article_countries").upsert(
    countryIds.map((country_id, position) => ({
      article_id: articleId,
      country_id,
      position,
    })),
    { onConflict: "article_id,country_id" }
  );
}
