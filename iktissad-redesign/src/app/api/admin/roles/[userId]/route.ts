/**
 * Admin Role by User API Route
 * GET    /api/admin/roles/[userId]  — get a single user's role
 * PUT    /api/admin/roles/[userId]  — update role + permissions
 * DELETE /api/admin/roles/[userId]  — revoke admin access
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Helper: fetch caller's role ─────────────────────────────────────────────

async function getCallerRole(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from("admin_roles") as any)
    .select("role")
    .eq("user_id", userId)
    .single();
  return (data as { role: string } | null)?.role ?? null;
}

interface AdminRoleRow {
  userId: string;
  role: string;
  permissions: Record<string, unknown>;
  invitedBy: string | null;
  twoFaEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated || !auth.userId) return unauthorizedResponse();

  const { userId } = await params;

  // Allow super_admin or the user themselves to check their own role
  const callerRole = await getCallerRole(auth.userId);
  if (callerRole !== "super_admin" && auth.userId !== userId) {
    return NextResponse.json(
      { error: "غير مصرح — ليس لديك صلاحية للوصول إلى هذه الصفحة" } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("admin_roles") as any)
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Role not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  const mapped: AdminRoleRow = {
    userId: r.user_id,
    role: r.role,
    permissions: r.permissions ?? {},
    invitedBy: r.invited_by,
    twoFaEnabled: r.two_fa_enabled,
    lastLogin: r.last_login,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };

  const response: ApiResponse<AdminRoleRow> = { data: mapped };
  return NextResponse.json(response);
}

// ─── PUT ─────────────────────────────────────────────────────────────────────

const updateRoleSchema = z.object({
  role: z
    .enum(["super_admin", "editor", "writer", "finance", "advertiser_manager"])
    .optional(),
  permissions: z.record(z.string(), z.unknown()).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated || !auth.userId) return unauthorizedResponse();

  const callerRole = await getCallerRole(auth.userId);
  if (callerRole !== "super_admin") {
    return NextResponse.json(
      { error: "غير مصرح — ليس لديك صلاحية للوصول إلى هذه الصفحة" } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  const { userId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.permissions !== undefined) updateData.permissions = parsed.data.permissions;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("admin_roles") as any)
    .update(updateData)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  const mapped: AdminRoleRow = {
    userId: r.user_id,
    role: r.role,
    permissions: r.permissions ?? {},
    invitedBy: r.invited_by,
    twoFaEnabled: r.two_fa_enabled,
    lastLogin: r.last_login,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };

  const response: ApiResponse<AdminRoleRow> = { data: mapped };
  return NextResponse.json(response);
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated || !auth.userId) return unauthorizedResponse();

  const callerRole = await getCallerRole(auth.userId);
  if (callerRole !== "super_admin") {
    return NextResponse.json(
      { error: "غير مصرح — ليس لديك صلاحية للوصول إلى هذه الصفحة" } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  const { userId } = await params;

  // Prevent revoking own access
  if (auth.userId === userId) {
    return NextResponse.json(
      { error: "لا يمكنك إلغاء صلاحياتك الخاصة" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("admin_roles") as any)
    .delete()
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: null } satisfies ApiResponse<null>);
}
