import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600; // re-generate every hour

const BASE_URL = "https://www.iktissadonline.com";
const PUBLICATION_NAME = "الإقتصاد والأعمال";
const PUBLICATION_LANGUAGE = "ar";

export async function GET() {
  // Google News sitemap only includes articles published in the last 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  let articles: Array<{
    slug: string;
    title: string;
    published_at: string;
    tags: string[] | null;
  }> = [];

  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("articles")
      .select("slug, title, published_at, tags")
      .eq("status", "published")
      .eq("archived", false)
      .gte("published_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(1000);

    if (data) articles = data;
  } catch {
    // Supabase not configured — return empty sitemap
  }

  const urlEntries = articles
    .map((article) => {
      const keywords =
        Array.isArray(article.tags) && article.tags.length > 0
          ? `<news:keywords>${escapeXml(article.tags.join(", "))}</news:keywords>`
          : "";

      return `  <url>
    <loc>${BASE_URL}/${escapeXml(article.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(PUBLICATION_NAME)}</news:name>
        <news:language>${PUBLICATION_LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${article.published_at}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
      ${keywords}
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
