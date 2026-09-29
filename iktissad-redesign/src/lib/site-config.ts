/**
 * Static site-wide configuration and stats.
 * Import from here instead of hardcoding values in components.
 */

export const siteStats = {
  foundingYear: 1977,
  monthlyReaders: '+50K',
  totalArticles: '+2M',
  /** Number of countries with active correspondents */
  correspondentCountries: 22,
};

/**
 * The site's own origin — the single source of truth for canonical URLs,
 * sitemaps, robots.txt, OpenGraph and anything else that has to name us.
 *
 * This was `https://www.iktissadonline.com`, the LEGACY domain, and it was
 * copied into ~10 other files. The live consequence: every article on
 * iktissad.com carried `<link rel="canonical" href="https://www.iktissadonline.com/…">`
 * and robots.txt pointed crawlers at the legacy sitemaps — i.e. the new site was
 * telling search engines that the old site is the authoritative copy. When the
 * legacy domain is switched off, those canonicals would point at nothing.
 *
 * Override per-environment with NEXT_PUBLIC_SITE_URL (previews, staging).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iktissad.com'
).replace(/\/+$/, '');

/**
 * GA4 measurement IDs — every hit goes to each property listed.
 *
 *   G-9BXDFP1487  the legacy iktissadonline.com property. Reporting here keeps
 *                 the audience history continuous across the migration: the
 *                 years of traffic advertisers are sold on live in this one.
 *   G-FCRSHXCDP4  the property created for the new site (collecting since
 *                 2026-09-15), kept so its data doesn't stop.
 *
 * Not secrets — they ship in the page source. NEXT_PUBLIC_GA_MEASUREMENT_ID
 * (comma-separated) overrides the list without a code change.
 *
 * Whether gtag actually loads is decided twice more: `analyticsEnabled` in
 * src/app/layout.tsx keeps preview and local builds out, and ConsentScripts
 * only injects it once the visitor accepts analytics cookies.
 */
export const GA_MEASUREMENT_IDS: string[] = (
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-9BXDFP1487,G-FCRSHXCDP4'
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

/**
 * Google Ad Manager network — the legacy site's network, so the orders and
 * line items already trafficked against its ad units keep delivering on the
 * new site (see GAM_UNITS in src/lib/ads/placements.ts). Public: it appears in
 * every ad request. NEXT_PUBLIC_GAM_NETWORK_CODE overrides; set it to "off"
 * to disable Ad Manager entirely.
 */
const gamEnv = process.env.NEXT_PUBLIC_GAM_NETWORK_CODE;
export const GAM_NETWORK_CODE = gamEnv === 'off' ? '' : gamEnv || '21805397792';

export const siteConfig = {
  name: 'الإقتصاد والأعمال',
  url: SITE_URL,
  logoPath: '/logo.png',
  defaultLocale: 'ar',
};
