import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse, Article } from "@/types";

const mockArticles: Article[] = [
  {
    id: "art-001",
    title: "الاقتصاد السعودي يحقق نمواً بنسبة 3.5% في الربع الثالث",
    titleEn: "Saudi Economy Achieves 3.5% Growth in Q3",
    slug: "saudi-economy-q3-growth",
    excerpt: "حقق الاقتصاد السعودي نمواً ملحوظاً في الربع الثالث مدفوعاً بالقطاعات غير النفطية",
    excerptEn: "Saudi economy achieves notable growth in Q3 driven by non-oil sectors",
    content: "<p>تفاصيل المقال الكامل هنا...</p>",
    contentEn: "<p>Full article content here...</p>",
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
    excerpt: "أعلنت دولة الإمارات عن استراتيجية شاملة لتعزيز استخدام الذكاء الاصطناعي في القطاعات الحكومية والخاصة",
    excerptEn: "The UAE announces a comprehensive strategy to enhance AI use in public and private sectors",
    content: "<p>تفاصيل المقال الكامل هنا...</p>",
    contentEn: "<p>Full article content here...</p>",
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
    excerptEn: "Egypt successfully attracts massive foreign investments in infrastructure and renewable energy sectors",
    content: "<p>تفاصيل المقال الكامل هنا...</p>",
    contentEn: "<p>Full article content here...</p>",
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
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const section = searchParams.get("section");
  const country = searchParams.get("country");
  const status = searchParams.get("status");

  let filtered = [...mockArticles];

  if (section) {
    filtered = filtered.filter((a) => a.section === section);
  }
  if (country) {
    filtered = filtered.filter((a) => a.country === country);
  }
  if (status) {
    filtered = filtered.filter((a) => a.status === status);
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedData = filtered.slice(start, start + pageSize);

  const response: ApiResponse<Article[]> = {
    data: paginatedData,
    pagination: { page, pageSize, total, totalPages },
  };

  return NextResponse.json(response);
}

export async function POST() {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  return NextResponse.json(
    {
      error: "Not implemented – database integration pending",
    } satisfies ApiResponse<never>,
    { status: 501 }
  );
}
