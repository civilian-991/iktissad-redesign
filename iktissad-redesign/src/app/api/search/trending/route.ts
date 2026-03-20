/**
 * GET /api/search/trending
 *
 * Returns the top trending search terms.
 *
 * TODO: Connect to a real `search_logs` or `analytics` table once that data
 *       is available. For now, returns a hardcoded list of common financial
 *       terms that are representative of the site's content.
 *
 * Response: ApiResponse<string[]>
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

// Hardcoded fallback — replace with a real DB query when a search_logs table exists.
// Example query:
//   SELECT query, COUNT(*) as count
//   FROM search_logs
//   WHERE created_at > NOW() - INTERVAL '7 days'
//   GROUP BY query
//   ORDER BY count DESC
//   LIMIT 5
const FALLBACK_TRENDING = [
  "النفط",
  "أسواق الأسهم",
  "العملة",
  "البنوك",
  "التضخم",
];

export async function GET() {
  // Future: query DB for real trending data
  // const supabase = await createClient();
  // const { data } = await supabase.rpc('get_trending_searches', { limit_n: 5 });
  // if (data?.length) return NextResponse.json({ data } satisfies ApiResponse<string[]>);

  return NextResponse.json(
    { data: FALLBACK_TRENDING } satisfies ApiResponse<string[]>
  );
}
