import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse, MagazineIssue } from "@/types";

const mockMagazine: MagazineIssue = {
  id: "mag-001",
  issueNumber: 42,
  title: "مجلة اقتصاد - العدد 42",
  titleEn: "Iktissad Magazine - Issue 42",
  coverImage: "/images/magazines/issue-42-cover.jpg",
  publishDate: "2025-11-01T00:00:00Z",
  articles: [],
  pdfUrl: "/magazines/issue-42.pdf",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (id !== mockMagazine.id) {
    return NextResponse.json(
      { error: "Magazine issue not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<MagazineIssue> = { data: mockMagazine };
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
