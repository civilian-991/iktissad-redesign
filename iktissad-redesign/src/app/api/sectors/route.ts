import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapSectorRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Sector } from "@/types";

export async function GET() {
  const supabase = await createClient();

  // Fetch sectors first, then count articles per sector using parallel HEAD
  // requests (count: 'exact', head: true). This avoids Supabase's server-side
  // 1000-row cap which breaks the previous approach of fetching all rows.
  const { data: rows, error } = await supabase
    .from("sectors")
    .select()
    .order("name", { ascending: true }) as { data: any[] | null; error: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // 16 parallel HEAD count queries — each is a single COUNT(*) with no rows returned
  const countEntries = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { count } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("sector_id", row.id)
        .eq("status", "published" as const);
      return [row.id, count ?? 0] as [string, number];
    })
  );
  const countMap = Object.fromEntries(countEntries);

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
