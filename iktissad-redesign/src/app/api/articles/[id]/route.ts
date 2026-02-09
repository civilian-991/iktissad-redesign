import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse, Article } from "@/types";

const mockArticle: Article = {
  id: "art-001",
  title: "الاقتصاد السعودي يحقق نمواً بنسبة 3.5% في الربع الثالث",
  titleEn: "Saudi Economy Achieves 3.5% Growth in Q3",
  slug: "saudi-economy-q3-growth",
  excerpt: "حقق الاقتصاد السعودي نمواً ملحوظاً في الربع الثالث مدفوعاً بالقطاعات غير النفطية",
  excerptEn: "Saudi economy achieves notable growth in Q3 driven by non-oil sectors",
  content: "<p>تفاصيل المقال الكامل هنا مع تحليل شامل للأرقام والمؤشرات الاقتصادية...</p>",
  contentEn: "<p>Full article content with comprehensive analysis of economic figures and indicators...</p>",
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
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (id !== mockArticle.id) {
    return NextResponse.json(
      { error: "Article not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<Article> = { data: mockArticle };
  return NextResponse.json(response);
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
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
