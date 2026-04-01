import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapSectionRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Section } from "@/types";

export async function GET() {
  const supabase = await createClient();

  // Use a server-side RPC to COUNT in SQL — avoids the 1000-row PostgREST
  // client cap that would silently truncate counts for large sections.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any).rpc("get_sections_with_counts");

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: Section[] = (rows ?? []).map((row: any) =>
    mapSectionRow(row, Number(row.article_count ?? 0))
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
