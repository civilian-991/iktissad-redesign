import { NextRequest, NextResponse } from "next/server";
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  authWriteLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

/**
 * DELETE /api/admin/templates/[id]
 * Delete an article template.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(undefined, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const ip = getClientIp(request);
  const rl = authWriteLimit(`admin-templates:delete:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const admin = createAdminClient();
  const { error } = await admin
    .from("article_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { success: true },
  } satisfies ApiResponse<{ success: boolean }>);
}
