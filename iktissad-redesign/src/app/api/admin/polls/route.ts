import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  authWriteLimit,
  publicReadLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

/**
 * GET /api/admin/polls
 * List all polls (admin view with vote counts).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const ip = getClientIp(request);
  const rl = publicReadLimit(`admin-polls:get:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const supabase = await createClient();
  const { data: polls, error } = await (supabase.from("polls") as any)
    .select("*, articles:article_id ( id, title, slug )")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Get vote counts per poll
  const admin = createAdminClient();
  const pollIds = (polls ?? []).map((p: { id: string }) => p.id);

  const voteCounts: Record<string, number> = {};
  if (pollIds.length > 0) {
    const { data: votes } = await (admin.from("poll_votes") as any)
      .select("poll_id")
      .in("poll_id", pollIds);

    for (const v of votes ?? []) {
      voteCounts[v.poll_id] = (voteCounts[v.poll_id] || 0) + 1;
    }
  }

  const enriched = (polls ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    total_votes: voteCounts[p.id as string] || 0,
  }));

  return NextResponse.json({ data: enriched } satisfies ApiResponse<typeof enriched>);
}

const createPollSchema = z.object({
  articleId: z.string().uuid().optional(),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  closesAt: z.string().datetime().optional(),
});

/**
 * POST /api/admin/polls
 * Create a new poll.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const ip = getClientIp(request);
  const rl = authWriteLimit(`admin-polls:post:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createPollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await (admin.from("polls") as any)
    .insert({
      article_id: parsed.data.articleId ?? null,
      question: parsed.data.question,
      options: JSON.stringify(parsed.data.options),
      status: "active",
      closes_at: parsed.data.closesAt ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data } satisfies ApiResponse<typeof data>, {
    status: 201,
  });
}
