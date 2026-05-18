/**
 * GET /api/admin/headline-tests/[id] — Single test details
 * PUT /api/admin/headline-tests/[id] — Update test (pause/resume/complete)
 *
 * Tables: headline_tests, articles
 * Auth: Required (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from "@/lib/api-auth"
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";
import type { HeadlineTest } from "../route";

function mapRow(row: any): HeadlineTest {
  return {
    id: row.id,
    articleId: row.article_id,
    articleTitle: row.articles?.title ?? "—",
    variants: row.variants ?? [],
    status: row.status,
    winnerIndex: row.winner_index,
    minSample: row.min_sample,
    createdBy: row.created_by,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const auth = await requireRole(undefined, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const { id } = await context.params;
  const admin = createAdminClient();

  const { data, error } = await (admin as any)
    .from("headline_tests")
    .select("*, articles:article_id(title)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Test not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  return NextResponse.json({ data: mapRow(data) } satisfies ApiResponse<HeadlineTest>);
}

const updateSchema = z.object({
  status: z.enum(["running", "paused", "completed"]).optional(),
  winnerIndex: z.number().int().min(0).optional(),
});

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()
  if (auth.csrfFailed)
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const updateData: Record<string, unknown> = {};

  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }
  }
  if (parsed.data.winnerIndex !== undefined) {
    updateData.winner_index = parsed.data.winnerIndex;
  }

  const { data, error } = await (admin as any)
    .from("headline_tests")
    .update(updateData)
    .eq("id", id)
    .select("*, articles:article_id(title)")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Test not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json({ data: mapRow(data) } satisfies ApiResponse<HeadlineTest>);
}
