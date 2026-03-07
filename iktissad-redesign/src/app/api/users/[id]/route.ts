import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapUserRow } from "@/lib/supabase/mappers";
import type { ApiResponse, AdminUser } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await admin
    .from("users")
    .select("*")
    .eq("id", id)
    .single() as { data: any; error: any };

  if (error || !row) {
    return NextResponse.json(
      { error: "User not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<AdminUser> = { data: mapUserRow(row) };
  return NextResponse.json(response);
}

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "editor", "author", "contributor"]).optional(),
  avatar: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("users") as any)
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "User not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  const response: ApiResponse<AdminUser> = { data: mapUserRow(row) };
  return NextResponse.json(response);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const admin = createAdminClient();
  const { error } = await admin.from("users").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { success: true } });
}
