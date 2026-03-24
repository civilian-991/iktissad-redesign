import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapSectorRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Sector } from "@/types";

export async function GET() {
  const supabase = await createClient();

  // Fetch sectors and published article counts in two parallel queries (was N+1).
  // The article count query fetches only the FK column for all published articles
  // in one round trip, then counts in JS — no sequential per-sector queries.
  const [sectorsResult, countsResult] = await Promise.all([
    supabase
      .from("sectors")
      .select()
      .order("name", { ascending: true }),
    supabase
      .from("articles")
      .select("sector_id")
      .eq("status", "published" as const)
      .not("sector_id", "is", null)
      .limit(50000),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = sectorsResult as { data: any[] | null; error: any };
  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Build a count map from the single articles query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articleRows = (countsResult.data ?? []) as { sector_id: string }[];
  const countMap: Record<string, number> = {};
  for (const r of articleRows) {
    if (r.sector_id) countMap[r.sector_id] = (countMap[r.sector_id] ?? 0) + 1;
  }

  const sectors: Sector[] = (rows ?? [])
    .map((row) => mapSectorRow(row, countMap[row.id] ?? 0))
    .sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0));

  const response: ApiResponse<Sector[]> = {
    data: sectors,
    pagination: {
      page: 1,
      pageSize: 50,
      total: sectors.length,
      totalPages: 1,
    },
  };

  return NextResponse.json(response);
}
