import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse, MagazineIssue } from "@/types";

const mockMagazines: MagazineIssue[] = [
  {
    id: "mag-001",
    issueNumber: 42,
    title: "مجلة اقتصاد - العدد 42",
    titleEn: "Iktissad Magazine - Issue 42",
    coverImage: "/images/magazines/issue-42-cover.jpg",
    publishDate: "2025-11-01T00:00:00Z",
    articles: [],
    pdfUrl: "/magazines/issue-42.pdf",
  },
  {
    id: "mag-002",
    issueNumber: 41,
    title: "مجلة اقتصاد - العدد 41",
    titleEn: "Iktissad Magazine - Issue 41",
    coverImage: "/images/magazines/issue-41-cover.jpg",
    publishDate: "2025-10-01T00:00:00Z",
    articles: [],
    pdfUrl: "/magazines/issue-41.pdf",
  },
  {
    id: "mag-003",
    issueNumber: 40,
    title: "مجلة اقتصاد - العدد 40",
    titleEn: "Iktissad Magazine - Issue 40",
    coverImage: "/images/magazines/issue-40-cover.jpg",
    publishDate: "2025-09-01T00:00:00Z",
    articles: [],
    pdfUrl: "/magazines/issue-40.pdf",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  const total = mockMagazines.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedData = mockMagazines.slice(start, start + pageSize);

  const response: ApiResponse<MagazineIssue[]> = {
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
