import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  experimental: {
    // Enable View Transitions API integration for smooth article-to-article navigation
    viewTransition: true,
  },
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
