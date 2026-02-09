import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, Country } from "@/types";

const mockCountries: Country[] = [
  {
    slug: "saudi-arabia",
    name: "المملكة العربية السعودية",
    nameEn: "Saudi Arabia",
    flag: "🇸🇦",
    economicOverview: "تعد المملكة العربية السعودية أكبر اقتصاد في منطقة الشرق الأوسط وشمال أفريقيا وعضو فاعل في مجموعة العشرين",
    economicOverviewEn: "Saudi Arabia is the largest economy in the MENA region and an active member of the G20",
    keyIndicators: {
      gdp: "1.1 trillion USD",
      gdpGrowth: "3.5%",
      inflation: "2.1%",
      population: "36 million",
      unemployment: "4.8%",
    },
  },
  {
    slug: "uae",
    name: "الإمارات العربية المتحدة",
    nameEn: "United Arab Emirates",
    flag: "🇦🇪",
    economicOverview: "اقتصاد متنوع يعتمد على السياحة والتجارة والخدمات المالية إلى جانب النفط والغاز",
    economicOverviewEn: "A diversified economy relying on tourism, trade, and financial services alongside oil and gas",
    keyIndicators: {
      gdp: "507 billion USD",
      gdpGrowth: "4.2%",
      inflation: "1.8%",
      population: "10 million",
      unemployment: "2.9%",
    },
  },
  {
    slug: "egypt",
    name: "جمهورية مصر العربية",
    nameEn: "Egypt",
    flag: "🇪🇬",
    economicOverview: "أكبر اقتصاد في شمال أفريقيا من حيث عدد السكان ويشهد إصلاحات اقتصادية واسعة",
    economicOverviewEn: "The largest economy in North Africa by population, undergoing extensive economic reforms",
    keyIndicators: {
      gdp: "476 billion USD",
      gdpGrowth: "4.0%",
      inflation: "14.5%",
      population: "105 million",
      unemployment: "7.1%",
    },
  },
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const country = mockCountries.find((c) => c.slug === slug);

  if (!country) {
    return NextResponse.json(
      { error: "Country not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<Country> = { data: country };
  return NextResponse.json(response);
}
