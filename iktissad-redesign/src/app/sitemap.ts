import { SITE_URL } from '@/lib/site-config';
import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = SITE_URL;

const sectionSlugs = [
  "economy",
  "companies",
  "markets",
  "technology",
  "energy-innovation",
  "opinion",
  "files",
  "video",
];

const sectorSlugs = [
  "industry",
  "agriculture",
  "trade",
  "finance",
  "investment",
  "insurance",
  "real-estate",
  "transport",
  "automotive",
  "tourism-entertainment",
  "education",
  "health",
  "energy-environment",
  "entrepreneurship",
  "luxury",
  "wealth",
];

const countrySlugs = [
  "uae",
  "saudi",
  "qatar",
  "kuwait",
  "bahrain",
  "oman",
  "egypt",
  "jordan",
  "lebanon",
  "iraq",
  "morocco",
  "algeria",
  "tunisia",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "hourly", priority: 1.0 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/team`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    {
      url: `${BASE_URL}/subscribe`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/advertise`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/magazine`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/search`, changeFrequency: "daily", priority: 0.5 },
    { url: `${BASE_URL}/group`, changeFrequency: "monthly", priority: 0.5 },
    {
      url: `${BASE_URL}/profiles`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/sections`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    { url: `${BASE_URL}/sectors`, changeFrequency: "daily", priority: 0.8 },
    {
      url: `${BASE_URL}/countries`,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const sectionPages: MetadataRoute.Sitemap = sectionSlugs.map((slug) => ({
    url: `${BASE_URL}/topics/${slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const sectorPages: MetadataRoute.Sitemap = sectorSlugs.map((slug) => ({
    url: `${BASE_URL}/industries/${slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const countryPages: MetadataRoute.Sitemap = countrySlugs.map((slug) => ({
    url: `${BASE_URL}/countries/${slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // ── Dynamic magazine issue pages ──────────────────────────────────────────
  let issuePages: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: issues } = await (supabase as any)
      .from("magazine_issues")
      .select("id, updated_at")
      .eq("status", "published")
      .order("publish_date", { ascending: false })
      .limit(50);

    if (issues) {
      issuePages = (issues as Array<{ id: string; updated_at: string }>).map(
        (issue) => ({
          url: `${BASE_URL}/magazine/${issue.id}`,
          lastModified: issue.updated_at,
          changeFrequency: "monthly" as const,
          priority: 0.8,
        }),
      );
    }
  } catch {
    // Supabase not configured — skip dynamic issue pages
  }

  // ── Dynamic article pages (paginated to handle >1000 articles) ────────────
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const BATCH = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase as any)
        .from("articles")
        .select("slug, updated_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .range(from, from + BATCH - 1);

      if (error || !rows || rows.length === 0) break;

      const batch = (rows as Array<{ slug: string; updated_at: string | null }>).map(
        (row) => ({
          url: `${BASE_URL}/${row.slug}`,
          lastModified: row.updated_at ?? undefined,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }),
      );

      articlePages = articlePages.concat(batch);
      hasMore = rows.length === BATCH;
      from += BATCH;
    }
  } catch {
    // Supabase not configured — skip dynamic article pages
  }

  return [
    ...staticPages,
    ...sectionPages,
    ...sectorPages,
    ...countryPages,
    ...issuePages,
    ...articlePages,
  ];
}
