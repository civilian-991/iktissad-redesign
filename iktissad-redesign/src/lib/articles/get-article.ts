import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { mapArticleRow } from "@/lib/supabase/mappers";
import type { Database } from "@/lib/supabase/types";
import type { Article } from "@/types";

// Mirrors ARTICLE_SELECT in src/app/api/articles/[id]/route.ts so server-rendered
// pages return the exact same shape the client SWR call would.
const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug, name ),
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
`;

/**
 * Cookie-free anon Supabase client. Unlike `@/lib/supabase/server`'s
 * createClient (which binds to request cookies), this reads NOTHING from the
 * request, so a page that uses it stays statically prerenderable / cacheable
 * instead of being forced into per-request dynamic rendering.
 *
 * Still safe: it authenticates with the public anon key, so RLS applies exactly
 * as for an anonymous visitor — published articles only, no drafts.
 */
const anonClient = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * Fetches a single article by slug (or UUID) directly from the database for
 * server-side rendering — no HTTP round-trip back to our own API route.
 *
 * The previous approach (`fetch(`${NEXT_PUBLIC_SITE_URL}/api/articles/...`)`)
 * failed in production whenever NEXT_PUBLIC_SITE_URL was unset (→ localhost) or
 * pointed at the legacy domain, causing generateMetadata + JSON-LD to fall back
 * to generic values. Querying the DB directly removes that dependency.
 *
 * Wrapped in unstable_cache so the result is stored in Next's Data Cache
 * (revalidated hourly). This is what lets the article route render as static/ISR
 * (●) instead of on-demand-dynamic (ƒ): supabase-js issues `no-store` fetches,
 * which would otherwise count as dynamic server usage and force the route out of
 * static rendering. The cache wrapper isolates that. React cache() then dedupes
 * the call between generateMetadata and the page within a single render.
 */
const getArticleCached = unstable_cache(
  async (slugOrId: string): Promise<Article | null> => {
    // Next passes non-ASCII dynamic params percent-encoded to the page component
    // but decoded to generateMetadata. Article slugs are Arabic, so normalize to
    // the decoded form the DB stores. (decodeURIComponent is a no-op on an
    // already-decoded slug; guard against a malformed % sequence just in case.)
    let slug = slugOrId;
    try {
      slug = decodeURIComponent(slugOrId);
    } catch {
      /* keep the raw value */
    }

    let query = anonClient.from("articles").select(ARTICLE_SELECT);
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    query = isUuid ? query.eq("id", slug) : query.eq("slug", slug);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = (await query.single()) as {
      data: any;
      error: any;
    };

    if (error || !row) return null;
    return mapArticleRow(row);
  },
  ["article-for-render"],
  { revalidate: 3600, tags: ["articles"] }
);

export const getArticleForRender = cache(
  (slugOrId: string): Promise<Article | null> => getArticleCached(slugOrId)
);
