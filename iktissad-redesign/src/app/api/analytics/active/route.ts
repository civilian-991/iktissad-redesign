/**
 * Active Readers Count
 * GET /api/analytics/active
 *
 * Returns count of unique sessions that have had article read activity
 * in the last 5 minutes. Used by the Realtime Dashboard widget.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

export async function GET() {
  const supabase = createAdminClient();

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("article_reads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", fiveMinutesAgo);

  return NextResponse.json<ApiResponse<{ count: number }>>({
    data: { count: count ?? 0 },
  });
}
