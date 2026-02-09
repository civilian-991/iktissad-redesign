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
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const profile = mockProfiles.find((p) => p.id === id);

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<Profile> = { data: profile };
  return NextResponse.json(response);
}
