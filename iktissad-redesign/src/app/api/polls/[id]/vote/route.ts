import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  publicReadLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

const voteSchema = z.object({
  optionIndex: z.number().int().min(0),
  voterHash: z.string().min(1),
});

/**
 * POST /api/polls/[id]/vote
 * Cast a vote on a poll.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pollId } = await params;
  const ip = getClientIp(request);
  const rl = publicReadLimit(`poll-vote:${ip}`);
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

  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  // Get user if authenticated (optional)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check poll is still active
  const { data: poll, error: pollError } = await (
    supabase.from("polls") as any
  )
    .select("status, closes_at")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return NextResponse.json(
      { error: "Poll not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  if (
    poll.status === "closed" ||
    (poll.closes_at && new Date(poll.closes_at) < new Date())
  ) {
    return NextResponse.json(
      { error: "Poll is closed" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await (admin.from("poll_votes") as any)
    .insert({
      poll_id: pollId,
      option_index: parsed.data.optionIndex,
      user_id: user?.id ?? null,
      voter_hash: parsed.data.voterHash,
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation = already voted
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Already voted" } satisfies ApiResponse<never>,
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Get updated vote counts
  const { data: votes } = await (admin.from("poll_votes") as any)
    .select("option_index")
    .eq("poll_id", pollId);

  const voteCounts: Record<number, number> = {};
  for (const v of votes ?? []) {
    voteCounts[v.option_index] = (voteCounts[v.option_index] || 0) + 1;
  }

  return NextResponse.json({
    data: { vote: data, counts: voteCounts, total: (votes ?? []).length },
  } satisfies ApiResponse<{ vote: typeof data; counts: typeof voteCounts; total: number }>, {
    status: 201,
  });
}
