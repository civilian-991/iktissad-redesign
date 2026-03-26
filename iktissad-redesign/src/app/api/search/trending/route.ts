import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { mapArticleRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Article } from "@/types";

const ARTICLE_SELECT = `
  *,
  users!articles_author_id_fkey ( id, name, avatar ),
  sections!articles_section_id_fkey ( id, slug, name, name_en ),
  sectors!articles_sector_id_fkey ( id, slug, name, name_en ),
  countries!articles_country_id_fkey ( id, slug, name, name_en )
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 20);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("status", "published")
    .order("views", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response: ApiResponse<Article[]> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (data ?? []).map((row: any) => mapArticleRow(row)),
  };
  return NextResponse.json(response);
}
