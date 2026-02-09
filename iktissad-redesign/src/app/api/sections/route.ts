import { NextResponse } from "next/server";
import type { ApiResponse, Section } from "@/types";

const mockSections: Section[] = [
  {
    slug: "economics",
    name: "اقتصاد",
    nameEn: "Economics",
    description: "أخبار وتحليلات اقتصادية شاملة تغطي الأسواق العربية والعالمية",
    descriptionEn: "Comprehensive economic news and analysis covering Arab and global markets",
    articleCount: 245,
  },
  {
    slug: "technology",
    name: "تكنولوجيا",
    nameEn: "Technology",
    description: "آخر المستجدات في عالم التكنولوجيا والتحول الرقمي في المنطقة العربية",
    descriptionEn: "Latest developments in technology and digital transformation in the Arab region",
    articleCount: 128,
  },
  {
    slug: "investment",
    name: "استثمار",
    nameEn: "Investment",
    description: "فرص الاستثمار والتحليلات المالية وأخبار الأسواق والبورصات",
    descriptionEn: "Investment opportunities, financial analysis, and stock market news",
    articleCount: 187,
  },
];

export async function GET() {
  const response: ApiResponse<Section[]> = {
    data: mockSections,
    pagination: {
      page: 1,
      pageSize: 50,
      total: mockSections.length,
      totalPages: 1,
    },
  };

  return NextResponse.json(response);
}
