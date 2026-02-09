import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse, AdminUser } from "@/types";

const mockUsers: AdminUser[] = [
  {
    id: "usr-001",
    email: "admin@iktissad.com",
    name: "محمد العلي",
    role: "admin",
    avatar: "/images/users/admin.jpg",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "usr-002",
    email: "editor@iktissad.com",
    name: "سارة الحسن",
    role: "editor",
    avatar: "/images/users/editor.jpg",
    createdAt: "2024-03-20T08:00:00Z",
  },
  {
    id: "usr-003",
    email: "author@iktissad.com",
    name: "خالد المنصور",
    role: "author",
    avatar: "/images/users/author.jpg",
    createdAt: "2024-06-10T14:00:00Z",
  },
];

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  const total = mockUsers.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedData = mockUsers.slice(start, start + pageSize);

  const response: ApiResponse<AdminUser[]> = {
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
