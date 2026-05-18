/**
 * Bulk Articles Admin API
 *
 * POST /api/admin/articles/bulk
 * Body: { ids: string[], action: 'delete' | 'publish' | 'unpublish' | 'archive' }
 *
 * - Role-gated: super_admin or editor
 * - Validates ids: non-empty array, max 100, all UUIDs
 * - Executes per-id via createAdminClient(), aggregates success/failure
 * - Writes a single audit_log entry per bulk action (resourceType='article_bulk')
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditAction } from "@/lib/audit";
import type { ApiResponse } from "@/types";

// ─── Schema ────────────────────────────────────────────────────

const BULK_ACTIONS = ["delete", "publish", "unpublish", "archive"] as const;
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

/** Look up the actor's email for the audit-log snapshot (best-effort). */
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

/** Run one operation per id, capture per-id error, return aggregate. */
async function executeAction(
  action: BulkAction,
  ids: string[]
): Promise<BulkActionResult> {
  const admin = createAdminClient();
  const result: BulkActionResult = { success: 0, failed: 0, errors: [] };

  // Build the per-id mutation as a small thunk
  const runOne = async (id: string): Promise<void> => {
    if (action === "delete") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin.from("articles") as any)
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
      return;
    }

    let updatePayload: Record<string, unknown>;
    if (action === "publish") {
      updatePayload = {
        status: "published",
        published_at: new Date().toISOString(),
      };
    } else if (action === "unpublish") {
      updatePayload = { status: "draft" };
    } else {
      // archive
      updatePayload = {
        archived: true,
        archived_at: new Date().toISOString(),
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from("articles") as any)
      .update(updatePayload)
      .eq("id", id);
    if (error) throw new Error(error.message);
  };

  // Sequentially to keep load predictable; bounded by max 100 ids.
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
  const gate = await requireRole(request, ["super_admin", "editor"]);
  if (!gate.ok) return gate.response;

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

  const { ids, action } = parsed.data;

  // De-duplicate ids defensively (caller may have included a row twice)
  const uniqueIds = Array.from(new Set(ids));

  const result = await executeAction(action, uniqueIds);

  // Audit log (single entry per bulk action)
  const actorEmail = await getActorEmail(gate.userId);
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;

  await logAuditAction({
    actorId: gate.userId,
    actorEmail,
    action: `bulk_${action}_articles`,
    resourceType: "article_bulk",
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
