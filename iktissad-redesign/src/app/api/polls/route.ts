import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  publicReadLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

/**
 * GET /api/polls
 * List polls, optionally filtered by article_id.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = publicReadLimit(`polls:get:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const articleId = request.nextUrl.searchParams.get("articleId");

  const supabase = await createClient();
  let query = (supabase.from("polls") as any).select("*");

  if (articleId) query = query.eq("article_id", articleId);

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data } satisfies ApiResponse<typeof data>);
}
