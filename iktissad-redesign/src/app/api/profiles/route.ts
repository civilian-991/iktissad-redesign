import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, Profile } from "@/types";

const mockProfiles: Profile[] = [
  {
    id: "prof-001",
    name: "أرامكو السعودية",
    nameEn: "Saudi Aramco",
    description: "أكبر شركة نفط في العالم ومن أكثر الشركات قيمة سوقية على مستوى العالم",
    descriptionEn: "The world's largest oil company and one of the most valuable companies globally",
    logo: "/images/profiles/aramco-logo.png",
    sector: "oil-gas",
    country: "saudi-arabia",
    website: "https://www.aramco.com",
    founded: "1933",
    type: "corporation",
  },
  {
    id: "prof-002",
    name: "طيران الإمارات",
    nameEn: "Emirates Airlines",
    description: "شركة طيران دولية مقرها دبي وتعد من أكبر شركات الطيران في العالم",
    descriptionEn: "An international airline based in Dubai, one of the largest airlines in the world",
    logo: "/images/profiles/emirates-logo.png",
    sector: "aviation",
    country: "uae",
    website: "https://www.emirates.com",
    founded: "1985",
    type: "corporation",
  },
  {
    id: "prof-003",
    name: "البنك المركزي المصري",
    nameEn: "Central Bank of Egypt",
    description: "الهيئة الرقابية المسؤولة عن السياسة النقدية والإشراف على القطاع المصرفي في مصر",
    descriptionEn: "The regulatory body responsible for monetary policy and banking sector supervision in Egypt",
    logo: "/images/profiles/cbe-logo.png",
    sector: "banking",
    country: "egypt",
    website: "https://www.cbe.org.eg",
    founded: "1961",
    type: "government",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const sector = searchParams.get("sector");
  const country = searchParams.get("country");

  let filtered = [...mockProfiles];

  if (sector) {
    filtered = filtered.filter((p) => p.sector === sector);
  }
  if (country) {
    filtered = filtered.filter((p) => p.country === country);
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedData = filtered.slice(start, start + pageSize);

  const response: ApiResponse<Profile[]> = {
    data: paginatedData,
    pagination: { page, pageSize, total, totalPages },
  };

  return NextResponse.json(response);
}
