import { NextResponse } from "next/server";
import type { ApiResponse, Sector } from "@/types";

const mockSectors: Sector[] = [
  {
    slug: "oil-gas",
    name: "النفط والغاز",
    nameEn: "Oil & Gas",
    description: "تغطية شاملة لقطاع النفط والغاز في المنطقة العربية والأسواق العالمية",
    descriptionEn: "Comprehensive coverage of the oil and gas sector in the Arab region and global markets",
    articleCount: 312,
  },
  {
    slug: "banking",
    name: "البنوك والخدمات المالية",
    nameEn: "Banking & Financial Services",
    description: "أخبار وتحليلات القطاع المصرفي والخدمات المالية في العالم العربي",
    descriptionEn: "News and analysis of the banking sector and financial services in the Arab world",
    articleCount: 198,
  },
  {
    slug: "energy",
    name: "الطاقة المتجددة",
    nameEn: "Renewable Energy",
    description: "مستجدات قطاع الطاقة المتجددة والاستدامة في المنطقة",
    descriptionEn: "Updates on the renewable energy and sustainability sector in the region",
    articleCount: 145,
  },
];

export async function GET() {
  const response: ApiResponse<Sector[]> = {
    data: mockSectors,
    pagination: {
      page: 1,
      pageSize: 50,
      total: mockSectors.length,
      totalPages: 1,
    },
  };

  return NextResponse.json(response);
}
