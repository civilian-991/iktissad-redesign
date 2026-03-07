import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapSectorRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Sector } from "@/types";

export async function GET() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await supabase
    .from("sectors")
    .select()
    .order("name", { ascending: true }) as { data: any[] | null; error: any };

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Count articles per sector
  const sectors: Sector[] = [];
  for (const row of rows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("sector_id", row.id)
      .eq("status", "published" as const) as { count: number | null };
    sectors.push(mapSectorRow(row, count ?? 0));
  }

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
