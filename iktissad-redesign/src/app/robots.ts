import { SITE_URL } from '@/lib/site-config';
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: allow all crawlers except protected paths
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",             // Admin area — protected
          "/api/",               // API routes — not indexable
          "/account/",           // User account pages — private
          "/print/",             // Print mode pages — not for indexing
          "/magazine/*/reader",  // Web reader — subscriber-only
          "/magazine/*/read/",   // Article reading mode — subscriber-only
        ],
      },
      // AI training crawlers — blocked by policy.
      // Our content is proprietary journalism; we do not consent to AI training use.
      // Crawling for search indexing and news aggregation is permitted via separate agreements.
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ChatGPT-User", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "Claude-Web", disallow: "/" },
      { userAgent: "Omgilibot", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "FacebookBot", disallow: "/" },
      { userAgent: "cohere-ai", disallow: "/" },
      { userAgent: "PerplexityBot", disallow: "/" },
      { userAgent: "Applebot-Extended", disallow: "/" },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
    ],
  };
}
