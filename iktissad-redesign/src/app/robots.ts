import { SITE_URL } from '@/lib/site-config';
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Every crawler, AI ones included: being read and cited by ChatGPT,
      // Perplexity, Gemini and Claude is a traffic source (GEO), and
      // /llms.txt points them at the content.
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
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
    ],
  };
}
