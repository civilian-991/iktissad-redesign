/**
 * GET /api/admin/headline-tests — List all headline A/B tests
 * POST /api/admin/headline-tests — Create a new test
 *
 * Tables: headline_tests, articles
 * Auth: Required (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ──────────────────────────────────────────────────────

export interface HeadlineVariantData {
  title: string;
  impressions: number;
  clicks: number;
}

export interface HeadlineTest {
  id: string;
  articleId: string;
  articleTitle: string;
  variants: HeadlineVariantData[];
  status: "running" | "completed" | "paused";
  winnerIndex: number | null;
  minSample: number;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

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

// ─── GET ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const admin = createAdminClient();
  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const articleId = params.get("articleId");

  let query = (admin as any)
    .from("headline_tests")
    .select("*, articles:article_id(title)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (articleId) query = query.eq("article_id", articleId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: (data ?? []).map(mapRow),
  } satisfies ApiResponse<HeadlineTest[]>);
}

// ─── POST ────────────────────────────────────────────────────────

const createSchema = z.object({
  articleId: z.string().uuid(),
  variants: z.array(z.string().min(1)).min(2).max(5),
  minSample: z.number().int().min(100).max(10000).optional().default(1000),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed)
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { articleId, variants, minSample } = parsed.data;
  const admin = createAdminClient();

  // Build JSONB variant array
  const variantData: HeadlineVariantData[] = variants.map((title) => ({
    title,
    impressions: 0,
    clicks: 0,
  }));

  const { data, error } = await (admin as any)
    .from("headline_tests")
    .insert({
      article_id: articleId,
      variants: variantData,
      min_sample: minSample,
      status: "running",
      created_by: auth.userId,
    })
    .select("*, articles:article_id(title)")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: mapRow(data) } satisfies ApiResponse<HeadlineTest>,
    { status: 201 }
  );
}
