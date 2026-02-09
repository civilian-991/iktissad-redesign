import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse, AdminUser } from "@/types";

const mockUser: AdminUser = {
  id: "usr-001",
  email: "admin@iktissad.com",
  name: "محمد العلي",
  role: "admin",
  avatar: "/images/users/admin.jpg",
  createdAt: "2024-01-15T10:00:00Z",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  if (id !== mockUser.id) {
    return NextResponse.json(
      { error: "User not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<AdminUser> = { data: mockUser };
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
