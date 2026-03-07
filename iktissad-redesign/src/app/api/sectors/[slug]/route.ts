import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapSectorRow, mapArticleRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Sector } from "@/types";

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug ),
  sectors:sector_id ( slug ),
  countries:country_id ( slug )
`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await supabase
    .from("sectors")
    .select()
    .eq("slug", slug)
    .single() as { data: any; error: any };

  if (error || !row) {
    return NextResponse.json(
      { error: "Sector not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("sector_id", row.id)
    .eq("status", "published" as const) as { count: number | null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: articleRows } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("sector_id", row.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(10) as { data: any[] | null };

  const sector = mapSectorRow(row, count ?? 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = (articleRows ?? []).map((r: any) => mapArticleRow(r));

  const response: ApiResponse<Sector & { articles: typeof articles }> = {
    data: { ...sector, articles },
  };
  return NextResponse.json(response);
}
