import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapUserRow } from "@/lib/supabase/mappers";
import type { ApiResponse, AdminUser } from "@/types";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const role = searchParams.get("role");
  const status = searchParams.get("status");

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = admin.from("users").select("*", { count: "exact" }) as any;

  if (role) query = query.eq("role", role);
  if (status) query = query.eq("status", status);

  const start = (page - 1) * pageSize;
  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users: AdminUser[] = (rows ?? []).map((r: any) => mapUserRow(r));

  const response: ApiResponse<AdminUser[]> = {
    data: users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "editor", "author", "contributor"]).optional().default("author"),
  avatar: z.string().optional().default(""),
  department: z.string().optional().default(""),
  status: z.enum(["active", "inactive", "suspended"]).optional().default("active"),
});

export async function POST(request: NextRequest) {
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

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("users")
    .insert({
      email: data.email,
      name: data.name,
      role: data.role,
      avatar: data.avatar,
      department: data.department,
      status: data.status,
    })
    .select()
    .single();

  if (error) {
    const isDuplicate = error.message.includes("duplicate");
    return NextResponse.json(
      { error: isDuplicate ? "Email already exists" : error.message } satisfies ApiResponse<never>,
      { status: isDuplicate ? 409 : 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response: ApiResponse<AdminUser> = { data: mapUserRow(row as any) };
  return NextResponse.json(response, { status: 201 });
}
