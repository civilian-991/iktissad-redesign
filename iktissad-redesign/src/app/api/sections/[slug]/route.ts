import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapSectionRow, mapArticleRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Section } from "@/types";

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug, name ),
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, parseInt(searchParams.get("page")     || "1",  10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "12", 10)));

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await supabase
    .from("sections")
    .select()
    .eq("slug", slug)
    .single() as { data: any; error: any };

  if (error || !row) {
    return NextResponse.json(
      { error: "Section not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const offset = (page - 1) * pageSize;

  // Fetch article count and paginated articles in parallel
  const [countResult, articlesResult] = await Promise.all([
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("section_id", row.id)
      .eq("status", "published" as const),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("articles")
      .select(ARTICLE_SELECT, { count: "exact" })
      .eq("section_id", row.id)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalCount = (countResult as any).count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articleRows = (articlesResult.data ?? []) as any[];

  const section = mapSectionRow(row, totalCount);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = articleRows.map((r: any) => mapArticleRow(r));

  const response: ApiResponse<Section & { articles: typeof articles }> = {
    data: { ...section, articles },
    pagination: {
      page,
      pageSize,
      total: totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
  return NextResponse.json(response);
}
