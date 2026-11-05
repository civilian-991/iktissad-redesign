/**
 * Which image URLs next/image may send through the optimizer.
 *
 * Keep in step with `images.remotePatterns` in next.config.ts. Any other src
 * (an advertiser logo on its own domain, a legacy bare filename like
 * "857~Alain-David.jpg" in users.avatar, an http:// URL) must be rendered with
 * `unoptimized` — next/image throws in dev and the optimizer 400s in prod for
 * hosts it doesn't allow.
 */
const OPTIMIZABLE_HOSTS = new Set([
  "images.unsplash.com",
  "www.defaiya.com",
  "www.iktissadonline.com",
  "api.awalan.com",
  "flagcdn.com",
]);

export function canOptimizeImage(src: string | null | undefined): boolean {
  if (!src) return false;
  // Local files under /public; "//host" is protocol-relative, not local.
  if (src.startsWith("/")) return !src.startsWith("//");
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    return url.hostname.endsWith(".supabase.co") || OPTIMIZABLE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
