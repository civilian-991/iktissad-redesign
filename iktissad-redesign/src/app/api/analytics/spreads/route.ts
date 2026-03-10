/**
 * Magazine Spread Dwell Time Analytics
 * POST /api/analytics/spreads
 *
 * Public endpoint — no auth required.
 * Records dwell time on a magazine spread (no deduplication).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  issueId: z.string().uuid(),
  spreadNumber: z.number().int().min(0),
  sessionId: z.string().min(1).max(256),
  dwellSeconds: z.number().int().min(0),
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

  const { issueId, spreadNumber, sessionId, dwellSeconds } = parsed.data;

  const supabase = createAdminClient();

  await supabase.from("magazine_spread_reads").insert({
    issue_id: issueId,
    spread_number: spreadNumber,
    session_id: sessionId,
    dwell_seconds: dwellSeconds,
  });

  return NextResponse.json<ApiResponse<{ recorded: boolean }>>({
    data: { recorded: true },
  });
}
