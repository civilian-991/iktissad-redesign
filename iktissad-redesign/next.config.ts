import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
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
