import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, Article } from "@/types";

const mockArticles: Article[] = [
  {
    id: "art-001",
    title: "الاقتصاد السعودي يحقق نمواً بنسبة 3.5% في الربع الثالث",
    titleEn: "Saudi Economy Achieves 3.5% Growth in Q3",
    slug: "saudi-economy-q3-growth",
    excerpt: "حقق الاقتصاد السعودي نمواً ملحوظاً في الربع الثالث مدفوعاً بالقطاعات غير النفطية",
    excerptEn: "Saudi economy achieves notable growth in Q3 driven by non-oil sectors",
    content: "",
    contentEn: "",
    featuredImage: "/images/articles/saudi-economy.jpg",
    section: "economics",
    sector: "oil-gas",
    country: "saudi-arabia",
    author: { name: "أحمد الخالدي", avatar: "/images/authors/ahmed.jpg" },
    tags: ["اقتصاد", "السعودية", "نمو"],
    status: "published",
    views: 12540,
    publishedAt: "2025-11-15T08:00:00Z",
    createdAt: "2025-11-14T10:30:00Z",
    updatedAt: "2025-11-15T08:00:00Z",
  },
  {
    id: "art-002",
    title: "الإمارات تطلق استراتيجية جديدة للذكاء الاصطناعي",
    titleEn: "UAE Launches New AI Strategy",
    slug: "uae-ai-strategy-2025",
    excerpt: "أعلنت دولة الإمارات عن استراتيجية شاملة لتعزيز استخدام الذكاء الاصطناعي",
    excerptEn: "The UAE announces a comprehensive strategy to enhance AI use",
    content: "",
    contentEn: "",
    featuredImage: "/images/articles/uae-ai.jpg",
    section: "technology",
    sector: "technology",
    country: "uae",
    author: { name: "فاطمة المري", avatar: "/images/authors/fatima.jpg" },
    tags: ["تكنولوجيا", "الإمارات", "ذكاء اصطناعي"],
    status: "published",
    views: 8320,
    publishedAt: "2025-11-12T10:00:00Z",
    createdAt: "2025-11-11T14:00:00Z",
    updatedAt: "2025-11-12T10:00:00Z",
  },
  {
    id: "art-003",
    title: "مصر تستقطب استثمارات أجنبية بقيمة 10 مليارات دولار",
    titleEn: "Egypt Attracts $10 Billion in Foreign Investment",
    slug: "egypt-foreign-investment-2025",
    excerpt: "نجحت مصر في استقطاب استثمارات أجنبية ضخمة في قطاعات البنية التحتية والطاقة المتجددة",
    excerptEn: "Egypt successfully attracts massive foreign investments in infrastructure and renewable energy",
    content: "",
    contentEn: "",
    featuredImage: "/images/articles/egypt-investment.jpg",
    section: "investment",
    sector: "energy",
    country: "egypt",
    author: { name: "محمد السيد", avatar: "/images/authors/mohammed.jpg" },
    tags: ["استثمار", "مصر", "طاقة متجددة"],
    status: "published",
    views: 6750,
    publishedAt: "2025-11-10T12:00:00Z",
    createdAt: "2025-11-09T09:00:00Z",
    updatedAt: "2025-11-10T12:00:00Z",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  if (!query.trim()) {
    return NextResponse.json(
      { error: "Search query parameter 'q' is required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const lowerQuery = query.toLowerCase();

  // Simple mock search: filter articles where title, titleEn, excerpt, or tags match
  const results = mockArticles.filter(
    (article) =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.titleEn.toLowerCase().includes(lowerQuery) ||
      article.excerpt.toLowerCase().includes(lowerQuery) ||
      article.excerptEn.toLowerCase().includes(lowerQuery) ||
      article.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      article.section.toLowerCase().includes(lowerQuery) ||
      article.country.toLowerCase().includes(lowerQuery)
  );

  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedData = results.slice(start, start + pageSize);

  const response: ApiResponse<Article[]> = {
    data: paginatedData,
    pagination: { page, pageSize, total, totalPages },
  };

  return NextResponse.json(response);
}
