import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapSectionRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Section } from "@/types";

export async function GET() {
  const supabase = await createClient();

  // Fetch sections and published article counts in two queries (was N+1).
  // The article count query uses a single GROUP BY instead of one query per section.
  const [sectionsResult, countsResult] = await Promise.all([
    supabase
      .from("sections")
      .select()
      .order("name", { ascending: true }),
    // Select section_id from published articles so we can group in JS.
    // Supabase PostgREST does not expose GROUP BY directly, so we fetch
    // just the FK column (no content) with a status filter — one round trip.
    supabase
      .from("articles")
      .select("section_id")
      .eq("status", "published" as const)
      .not("section_id", "is", null),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = sectionsResult as { data: any[] | null; error: any };
  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Build a count map from the single articles query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articleRows = (countsResult.data ?? []) as { section_id: string }[];
  const countMap: Record<string, number> = {};
  for (const r of articleRows) {
    if (r.section_id) countMap[r.section_id] = (countMap[r.section_id] ?? 0) + 1;
  }

  const sections: Section[] = (rows ?? []).map((row) =>
    mapSectionRow(row, countMap[row.id] ?? 0)
  );

  const response: ApiResponse<Section[]> = {
    data: sections,
    pagination: {
      page: 1,
      pageSize: 50,
      total: sections.length,
      totalPages: 1,
    },
  };

  return NextResponse.json(response);
}
