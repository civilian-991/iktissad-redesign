/**
 * Crawlers and link-preview fetchers must not count as ad impressions or
 * clicks: advertisers are billed on these numbers. Not exhaustive — the goal
 * is to drop the obvious automated traffic, not to be an anti-fraud system.
 */
const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp|telegram|headless|lighthouse|pagespeed|curl|wget|python-requests|axios|node-fetch/i;

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return BOT_RE.test(userAgent);
}

/** Coarse device class for the audience figures (rate card: mobile share). */
export function deviceFromUserAgent(ua: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|Opera Mini/i.test(ua)) return "mobile";
  return "desktop";
}
