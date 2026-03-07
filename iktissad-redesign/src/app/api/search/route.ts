import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapArticleRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Article } from "@/types";

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug ),
  sectors:sector_id ( slug ),
  countries:country_id ( slug )
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  if (!query.trim()) {
    return NextResponse.json(
      { error: "Search query parameter 'q' is required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Use ilike for simple text search across title, title_en, excerpt, excerpt_en
  const pattern = `%${query}%`;

  const start = (page - 1) * pageSize;
  const { data: rows, count, error } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT, { count: "exact" })
    .eq("status", "published")
    .or(
      `title.ilike.${pattern},title_en.ilike.${pattern},excerpt.ilike.${pattern},excerpt_en.ilike.${pattern}`
    )
    .order("published_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles: Article[] = (rows ?? []).map((r: any) => mapArticleRow(r));

  const response: ApiResponse<Article[]> = {
    data: articles,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };

  return NextResponse.json(response);
}
