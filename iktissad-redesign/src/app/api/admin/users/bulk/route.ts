/**
 * Bulk Users Admin API
 *
 * POST /api/admin/users/bulk
 * Body: { ids: string[], action: 'delete' | 'disable' | 'enable' }
 *
 * - Role-gated: super_admin only
 * - Validates ids: non-empty array, max 100, all UUIDs
 * - Refuses to operate on the caller's own user id (cannot self-destruct)
 * - For action='delete', also cascades through admin_roles
 *   (admin_roles.user_id has ON DELETE CASCADE at the DB level — this
 *    explicit step is belt-and-suspenders + works if FK weren't present)
 * - Writes a single audit_log entry per bulk action
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, unauthorizedResponse, csrfForbiddenResponse, forbiddenResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditAction } from "@/lib/audit";
import type { ApiResponse } from "@/types";

// ─── Schema ────────────────────────────────────────────────────

const BULK_ACTIONS = ["delete", "disable", "enable"] as const;
type BulkAction = (typeof BULK_ACTIONS)[number];

const bulkSchema = z.object({
  ids: z
    .array(z.string().uuid({ message: "Each id must be a valid UUID" }))
    .min(1, { message: "ids must contain at least one entry" })
    .max(100, { message: "ids may contain at most 100 entries" }),
  action: z.enum(BULK_ACTIONS),
});

// ─── Response type ─────────────────────────────────────────────

export interface BulkActionResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

// ─── Helpers ───────────────────────────────────────────────────

async function getActorEmail(userId: string): Promise<string> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin.from("users") as any)
      .select("email")
      .eq("id", userId)
      .single();
    return (data as { email: string } | null)?.email ?? "";
  } catch {
    return "";
  }
}

async function executeAction(
  action: BulkAction,
  ids: string[]
): Promise<BulkActionResult> {
  const admin = createAdminClient();
  const result: BulkActionResult = { success: 0, failed: 0, errors: [] };

  const runOne = async (id: string): Promise<void> => {
    if (action === "delete") {
      // Cascade through admin_roles explicitly (FK is ON DELETE CASCADE,
      // but we run it first so a partial failure can't orphan the user row).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: roleErr } = await (admin.from("admin_roles") as any)
        .delete()
        .eq("user_id", id);
      if (roleErr) throw new Error(`admin_roles cascade: ${roleErr.message}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: userErr } = await (admin.from("users") as any)
        .delete()
        .eq("id", id);
      if (userErr) throw new Error(userErr.message);
      return;
    }

    const updatePayload: Record<string, unknown> = {
      status: action === "enable" ? "active" : "inactive",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from("users") as any)
      .update(updatePayload)
      .eq("id", id);
    if (error) throw new Error(error.message);
  };

  for (const id of ids) {
    try {
      await runOne(id);
      result.success += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({
        id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return result;
}

// ─── Handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const gate = await requireRole(request, ["super_admin"]);
  if (!gate.authenticated) return unauthorizedResponse();
  if (gate.csrfFailed) return csrfForbiddenResponse();
  if (gate.forbidden) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((i) => i.message).join(", "),
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { action } = parsed.data;
  const uniqueIds = Array.from(new Set(parsed.data.ids));

  // Self-action guard — never let the caller delete/disable themselves
  if (uniqueIds.includes(gate.userId!) && action !== "enable") {
    return NextResponse.json(
      {
        error:
          "Refusing to apply this action to your own account — remove your id from the selection",
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const result = await executeAction(action, uniqueIds);

  const actorEmail = await getActorEmail(gate.userId!);
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;

  await logAuditAction({
    actorId: gate.userId!,
    actorEmail,
    action: `bulk_${action}_users`,
    resourceType: "user_bulk",
    newValues: {
      action,
      requestedIds: uniqueIds,
      success: result.success,
      failed: result.failed,
      errors: result.errors,
    },
    ipAddress,
  });

  const response: ApiResponse<BulkActionResult> = { data: result };
  return NextResponse.json(response);
}
