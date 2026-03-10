import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = "https://www.iktissadonline.com";

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
    url: `${BASE_URL}/sections/${slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const sectorPages: MetadataRoute.Sitemap = sectorSlugs.map((slug) => ({
    url: `${BASE_URL}/sectors/${slug}`,
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

  return [
    ...staticPages,
    ...sectionPages,
    ...sectorPages,
    ...countryPages,
    ...issuePages,
  ];
}
