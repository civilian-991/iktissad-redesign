import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  experimental: {
    // Enable View Transitions API integration for smooth article-to-article navigation
    viewTransition: true,
  },
  // Mark exceljs (and its transitive unzipper) as external for server bundles.
  // unzipper@0.12 lazily requires '@aws-sdk/client-s3' only when reading from S3,
  // but Turbopack's static analysis still tries to resolve it. Externalizing
  // exceljs ensures Node.js's runtime require() is used (which only loads s3
  // when actually called).
  serverExternalPackages: ["exceljs", "unzipper"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.defaiya.com",
      },
      {
        protocol: "https",
        hostname: "www.iktissadonline.com",
      },
      {
        protocol: "https",
        hostname: "api.awalan.com",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
      // Supabase Storage: signed object URLs
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      // Supabase Storage: public object URLs
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Supabase Storage: catch-all for other storage paths
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      // Drupal date-prefixed URLs: /news/YYYY/MM/DD/slug → /slug
      {
        source: '/news/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug',
        destination: '/:slug',
        permanent: true,
      },
      // Drupal simple news URLs: /news/slug → /slug
      {
        source: '/news/:slug',
        destination: '/:slug',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        // IndexNow key verification: /{key}.txt → /api/indexnow/key
        source: '/:key(\\w{32,}).txt',
        destination: '/api/indexnow/key',
      },
    ];
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    // Content-Security-Policy
    // Allowlist for the active third-party stack:
    //   - Supabase (DB / Storage / Realtime over wss)
    //   - Sentry (error reports + tunnel via /monitoring)
    //   - Cloudflare Turnstile (bot protection on public forms)
    //   - Google Analytics 4 + Google Ad Manager (GAM)
    //   - Mastercard MPGS / MIGS payment gateway iframes
    // 'unsafe-inline' on script-src is required by Next.js's inline runtime
    // bootstrap; 'unsafe-eval' is needed in dev (HMR) and by some libs.
    // 'unsafe-inline' on style-src is required by Tailwind v4 + next/font.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.googletagmanager.com https://*.google-analytics.com https://*.googletagservices.com https://securepubads.g.doubleclick.net https://*.mastercard.com.au https://*.mastercard.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://challenges.cloudflare.com https://*.google-analytics.com https://*.googletagmanager.com https://*.mastercard.com.au https://*.mastercard.com",
      "frame-src 'self' https://challenges.cloudflare.com https://*.mastercard.com.au https://*.mastercard.com https://*.youtube.com https://www.youtube-nocookie.com https://securepubads.g.doubleclick.net",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.mastercard.com.au https://*.mastercard.com",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // X-Frame-Options kept for older browsers; modern browsers use CSP frame-ancestors
          { key: "X-Frame-Options", value: "DENY" },
          // X-XSS-Protection: 0 is the OWASP-recommended value — the "1; mode=block" variant
          // can introduce XSS vulnerabilities in older IE and is not needed in modern browsers
          { key: "X-XSS-Protection", value: "0" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS: enforce HTTPS for 1 year, including all subdomains
          // max-age=31536000 = 1 year in seconds
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

// Bundle analyzer: run `ANALYZE=true npm run build` to open the report
const analyzed = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);

// PWA: generates service worker at build time via Workbox
const withPwa = withPWA({
  dest: "public",
  // Only register SW in production to avoid dev-mode cache confusion
  disable: process.env.NODE_ENV !== "production",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    // Cache the offline page so it's available without a network
    additionalManifestEntries: [{ url: "/offline", revision: null }],
    runtimeCaching: [
      {
        // Cache article pages for offline reading
        urlPattern: /^\/.+$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "article-pages",
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
      {
        // Cache API responses (articles list)
        urlPattern: /^\/api\/articles/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-articles",
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 },
        },
      },
    ],
  },
})(analyzed);

export default withSentryConfig(withPwa, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Source map upload auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a larger set of source maps to improve stack trace fidelity
  widenClientFileUpload: true,

  // Route Sentry requests through Next.js to avoid ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress Sentry CLI output outside of CI
  silent: !process.env.CI,
});
