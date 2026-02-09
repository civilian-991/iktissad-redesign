import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse, MediaItem } from "@/types";

const mockMedia: MediaItem[] = [
  {
    id: "med-001",
    url: "/uploads/2025/11/saudi-economy-banner.jpg",
    filename: "saudi-economy-banner.jpg",
    mimeType: "image/jpeg",
    size: 245000,
    alt: "لافتة الاقتصاد السعودي",
    altEn: "Saudi economy banner",
    uploadedBy: "usr-001",
    createdAt: "2025-11-14T10:30:00Z",
  },
  {
    id: "med-002",
    url: "/uploads/2025/11/uae-ai-strategy.png",
    filename: "uae-ai-strategy.png",
    mimeType: "image/png",
    size: 382000,
    alt: "استراتيجية الإمارات للذكاء الاصطناعي",
    altEn: "UAE AI strategy illustration",
    uploadedBy: "usr-002",
    createdAt: "2025-11-11T14:00:00Z",
  },
  {
    id: "med-003",
    url: "/uploads/2025/11/egypt-investment-infographic.jpg",
    filename: "egypt-investment-infographic.jpg",
    mimeType: "image/jpeg",
    size: 198000,
    alt: "إنفوجرافيك استثمارات مصر",
    altEn: "Egypt investment infographic",
    uploadedBy: "usr-001",
    createdAt: "2025-11-09T09:00:00Z",
  },
];

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const total = mockMedia.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedData = mockMedia.slice(start, start + pageSize);

  const response: ApiResponse<MediaItem[]> = {
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
