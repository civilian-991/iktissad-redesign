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
 * GA4 measurement ID.
 *
 * Not a secret — it ships in the page source of every site that uses it, which
 * is why it lives here with the same `env || default` shape as SITE_URL rather
 * than only in the Vercel dashboard. NEXT_PUBLIC_GA_MEASUREMENT_ID still wins,
 * so a separate property can be pointed at any environment without a code change.
 *
 * Whether it actually loads is decided twice more: `analyticsEnabled` in
 * src/app/layout.tsx keeps preview and local builds out of the property, and
 * ConsentScripts only injects gtag once the visitor accepts analytics cookies.
 */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-FCRSHXCDP4';

export const siteConfig = {
  name: 'الإقتصاد والأعمال',
  url: SITE_URL,
  logoPath: '/logo.png',
  defaultLocale: 'ar',
};
