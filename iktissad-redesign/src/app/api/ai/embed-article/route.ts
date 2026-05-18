/**
 * POST /api/ai/embed-article
 *
 * Triggers a tsvector search-vector refresh for a published article.
 * Called automatically at publish time (e.g. from the article save flow
 * or an automation rule) to ensure full-text search is immediately current.
 *
 * The route name is historical; semantic search is implemented via Postgres
 * tsvector (`articles.search_vector`), not vector embeddings. See
 * `src/lib/ai/keyword-search.ts` for the design rationale.
 *
 * Request body: { articleId: string }
 * Response:     { success: true } | { error: string }
 *
 * Requires a valid Supabase Auth session (admin or editor).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { updateArticleSearchVector } from "@/lib/ai/keyword-search";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  // Auth check — must be a signed-in admin user or service-role call
  const auth = await requireAuthFromRequest(request);
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { articleId } = (body ?? {}) as { articleId?: unknown };

  if (!articleId || typeof articleId !== "string" || !articleId.trim()) {
    return NextResponse.json(
      { error: "articleId is required and must be a non-empty string" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  try {
    await updateArticleSearchVector(articleId.trim());
    return NextResponse.json({ data: { success: true } } satisfies ApiResponse<{ success: boolean }>);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update search vector";
    console.error("[embed-article]", message);
    return NextResponse.json(
      { error: message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
