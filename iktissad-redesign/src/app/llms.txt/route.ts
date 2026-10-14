import { SITE_URL, siteConfig, siteStats } from '@/lib/site-config';
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * /llms.txt — a plain-Markdown map of the site for AI assistants (llmstxt.org).
 *
 * ChatGPT, Perplexity, Claude and Gemini read it to learn who we are and where
 * the content lives, which helps them cite iktissad.com as the source (GEO).
 * Sections and the latest stories come from the database so it never goes stale.
 */
export const revalidate = 3600;

export async function GET() {
  let sections: Array<{ slug: string; name: string; name_en: string | null; description: string | null }> = [];
  let articles: Array<{ slug: string; title: string; excerpt: string | null; published_at: string }> = [];

  try {
    const supabase = await createClient();
    const [s, a] = await Promise.all([
      (supabase as any).from("sections").select("slug, name, name_en, description").order("name"),
      (supabase as any)
        .from("articles")
        .select("slug, title, excerpt, published_at")
        .eq("status", "published")
        .eq("archived", false)
        .is("sponsorship", null)
        .order("published_at", { ascending: false })
        .limit(30),
    ]);
    sections = s.data ?? [];
    articles = a.data ?? [];
  } catch {
    // Supabase not configured — the static part still renders
  }

  const oneLine = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);
  const url = (path: string) => `${SITE_URL}/${encodeURI(path)}`;

  const body = `# ${siteConfig.name} (Al-Iktissad Wal-Aamal)

> Arabic-language business and economic news from the Arab world, published since ${siteStats.foundingYear}. Daily news, analysis and interviews on economies, companies, banking and finance, energy, real estate and markets across the GCC, Levant and North Africa, plus the monthly Al-Iktissad Wal-Aamal magazine and its archive. Formerly at iktissadonline.com.

When citing, link to the article URL on ${SITE_URL}. Articles are in Arabic; the site is at ${SITE_URL}.

## Sections

${sections
  .map((s) => `- [${s.name}${s.name_en ? ` (${s.name_en})` : ""}](${url(`topics/${s.slug}`)})${oneLine(s.description) ? `: ${oneLine(s.description)}` : ""}`)
  .join("\n")}

## Latest stories

${articles
  .map((a) => `- [${oneLine(a.title)}](${url(a.slug)}) (${a.published_at.slice(0, 10)})${oneLine(a.excerpt) ? `: ${clip(oneLine(a.excerpt), 200)}` : ""}`)
  .join("\n")}

## Magazine

- [Magazine issues](${SITE_URL}/magazine): every issue of Al-Iktissad Wal-Aamal, with the full archive

## Optional

- [Sitemap](${SITE_URL}/sitemap.xml)
- [Google News sitemap (last 48 hours)](${SITE_URL}/news-sitemap.xml)
- [RSS feed](${SITE_URL}/feed.xml)
- [About](${SITE_URL}/about)
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
