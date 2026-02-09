import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse, MediaItem } from "@/types";

const mockMediaItem: MediaItem = {
  id: "med-001",
  url: "/uploads/2025/11/saudi-economy-banner.jpg",
  filename: "saudi-economy-banner.jpg",
  mimeType: "image/jpeg",
  size: 245000,
  alt: "لافتة الاقتصاد السعودي",
  altEn: "Saudi economy banner",
  uploadedBy: "usr-001",
  createdAt: "2025-11-14T10:30:00Z",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (id !== mockMediaItem.id) {
    return NextResponse.json(
      { error: "Media item not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<MediaItem> = { data: mockMediaItem };
  return NextResponse.json(response);
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
