/**
 * Article Read Analytics
 * POST /api/analytics/read
 *
 * Public endpoint — no auth required.
 * Records / updates an article read event deduped by (article_id, session_id).
 * Rate limit: max 100 inserts per session_id per day.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  articleId: z.string().uuid(),
  sessionId: z.string().min(1).max(256),
  timeOnPage: z.number().int().min(0).default(0),
  scrollDepth: z.number().min(0).max(100).default(0),
  readThrough: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<{ recorded: boolean }>>(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<{ recorded: boolean }>>(
      { error: parsed.error.message },
      { status: 400 }
    );
  }

  const { articleId, sessionId, timeOnPage, scrollDepth, readThrough } =
    parsed.data;

  const supabase = createAdminClient();

  // Rate limit: max 100 unique article reads per session per day
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("article_reads")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .gte("created_at", dayStart.toISOString());

  if ((count ?? 0) >= 100) {
    return NextResponse.json<ApiResponse<{ recorded: boolean }>>(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  // Check for existing record to upsert
  const { data: existing } = await supabase
    .from("article_reads")
    .select("id, time_on_page, scroll_depth")
    .eq("article_id", articleId)
    .eq("session_id", sessionId)
    .maybeSingle() as { data: { id: string; time_on_page: number; scroll_depth: number } | null };

  if (existing) {
    // Update to max values
    await supabase
      .from("article_reads")
      .update({
        time_on_page: Math.max(existing.time_on_page, timeOnPage),
        scroll_depth: Math.max(Number(existing.scroll_depth), scrollDepth),
        read_through: existing ? (readThrough || false) : readThrough,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("article_reads").insert({
      article_id: articleId,
      session_id: sessionId,
      time_on_page: timeOnPage,
      scroll_depth: scrollDepth,
      read_through: readThrough,
      referrer: request.headers.get("referer") ?? null,
    });
  }

  return NextResponse.json<ApiResponse<{ recorded: boolean }>>({
    data: { recorded: true },
  });
}
