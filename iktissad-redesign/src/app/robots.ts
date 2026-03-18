import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",          // Admin area — protected
        "/api/",            // API routes — not indexable
        "/account/",        // User account pages — private
        "/print/",          // Print mode pages — not for indexing
        "/magazine/*/reader",  // Web reader — subscriber-only
        "/magazine/*/read/",   // Article reading mode — subscriber-only
      ],
    },
    sitemap: [
      "https://www.iktissadonline.com/sitemap.xml",
      "https://www.iktissadonline.com/news-sitemap.xml",
    ],
  };
}
