/**
 * Admin Roles API Route
 * GET  /api/admin/roles  — list all admin_roles with user info (super_admin only)
 * POST /api/admin/roles  — invite/assign a role to a user
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminRoleRow {
  userId: string;
  role: "super_admin" | "editor" | "writer" | "finance" | "advertiser_manager";
  permissions: Record<string, unknown>;
  invitedBy: string | null;
  twoFaEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  // joined
  user?: {
    name: string;
    email: string;
    avatar: string;
  };
}

// ─── Helper: fetch caller's role ────────────────────────────────────────────

async function getCallerRole(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from("admin_roles") as any)
    .select("role")
    .eq("user_id", userId)
    .single();
  return (data as { role: string } | null)?.role ?? null;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated || !auth.userId) return unauthorizedResponse();

  const callerRole = await getCallerRole(auth.userId);
  if (callerRole !== "super_admin") {
    return NextResponse.json(
      { error: "غير مصرح — ليس لديك صلاحية للوصول إلى هذه الصفحة" } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (admin.from("admin_roles") as any)
    .select(`
      user_id,
      role,
      permissions,
      invited_by,
      two_fa_enabled,
      last_login,
      created_at,
      updated_at,
      users:user_id ( name, email, avatar )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped: AdminRoleRow[] = (rows ?? []).map((r: any) => ({
    userId: r.user_id,
    role: r.role,
    permissions: r.permissions ?? {},
    invitedBy: r.invited_by,
    twoFaEnabled: r.two_fa_enabled,
    lastLogin: r.last_login,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    user: r.users ?? undefined,
  }));

  const response: ApiResponse<AdminRoleRow[]> = { data: mapped };
  return NextResponse.json(response);
}

// ─── POST (invite / assign) ───────────────────────────────────────────────────

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["super_admin", "editor", "writer", "finance", "advertiser_manager"]),
  permissions: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated || !auth.userId) return unauthorizedResponse();

  const callerRole = await getCallerRole(auth.userId);
  if (callerRole !== "super_admin") {
    return NextResponse.json(
      { error: "غير مصرح — ليس لديك صلاحية للوصول إلى هذه الصفحة" } satisfies ApiResponse<never>,
      { status: 403 }
    );
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

  const parsed = assignRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { userId, role, permissions } = parsed.data;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("admin_roles") as any)
    .upsert(
      {
        user_id: userId,
        role,
        permissions,
        invited_by: auth.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped: AdminRoleRow = {
    userId: (row as any).user_id,
    role: (row as any).role,
    permissions: (row as any).permissions ?? {},
    invitedBy: (row as any).invited_by,
    twoFaEnabled: (row as any).two_fa_enabled,
    lastLogin: (row as any).last_login,
    createdAt: (row as any).created_at,
    updatedAt: (row as any).updated_at,
  };

  const response: ApiResponse<AdminRoleRow> = { data: mapped };
  return NextResponse.json(response, { status: 201 });
}
