import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

/**
 * Legacy URL → canonical path, looked up in `article_redirects`.
 *
 * This replaces the pattern rewrites that used to live in next.config.ts. Those
 * assumed the legacy slug and our slug were the same string and simply stripped
 * the date prefix — which held for 1,809 of 8,490 Drupal URLs and failed for the
 * rest, because Drupal baked article line-breaks into its aliases as a literal
 * "-br-". Measured against production, 78.7% of legacy article URLs 404'd.
 *
 * A stored map cannot drift like that: every row was generated from the source
 * primary key, so the destination is known rather than derived.
 */
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * Percent-encode a path for the Location header.
 *
 * Destinations are stored decoded (`/تركيا-تفتتح-خط-تاناب`) because that is how
 * they are matched, but an HTTP header must be ASCII — handing Next a raw Arabic
 * path throws "Invalid character in header content" and the redirect 500s.
 * Encode each segment, leaving the separators and any existing query alone.
 */
export function encodePath(path: string): string {
  const [pathname, query] = path.split('?');
  const encoded = pathname
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      // do not double-encode something already escaped
      try {
        if (decodeURIComponent(seg) !== seg) return seg;
      } catch {
        return encodeURIComponent(seg);
      }
      return encodeURIComponent(seg);
    })
    .join('/');
  return query ? `${encoded}?${query}` : encoded;
}

/** Normalise an incoming path the way the map stores it: leading slash, decoded. */
export function normalisePath(path: string): string {
  let p = path.split('#')[0];
  const q = p.indexOf('?');
  if (q !== -1) p = p.slice(0, q);
  if (!p.startsWith('/')) p = '/' + p;
  // Arabic paths arrive percent-encoded; the map stores them decoded.
  try {
    p = decodeURIComponent(p);
  } catch {
    /* malformed encoding — match on the raw form instead */
  }
  return p.replace(/\/+$/, '') || '/';
}

/**
 * Resolve a legacy path. Returns the destination path, or null.
 * Cached per-request so a page that checks twice only queries once.
 */
export const lookupRedirect = cache(async (path: string): Promise<string | null> => {
  const from = normalisePath(path);
  if (from === '/') return null;

  const { data, error } = await anon
    .from('article_redirects')
    .select('to_path')
    .eq('from_path', from)
    .maybeSingle();

  if (error || !data) {
    // Try the still-encoded form: a few legacy slugs contain characters that do
    // not survive a decode/encode round-trip (quotation marks, for one).
    const raw = path.startsWith('/') ? path : '/' + path;
    if (raw !== from) {
      const { data: alt } = await anon
        .from('article_redirects')
        .select('to_path')
        .eq('from_path', raw)
        .maybeSingle();
      return alt?.to_path ?? null;
    }
    return null;
  }
  return data.to_path;
});

/** Awalan served /Article/<id>/<slug>; the id is authoritative, the slug decorative. */
export const lookupAwalanArticle = cache(async (id: string): Promise<string | null> => {
  const { data } = await anon
    .from('article_redirects')
    .select('to_path')
    .eq('from_path', `/Article/${id}`)
    .maybeSingle();
  return data?.to_path ?? null;
});
