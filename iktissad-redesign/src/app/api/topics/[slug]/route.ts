import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapSectionRow, mapArticleRow } from "@/lib/supabase/mappers";
import { getSectionSponsor } from "@/lib/ads/serve";
import type { ApiResponse, Section, Article } from "@/types";

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug, name ),
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
`;

type SectionSponsor = Awaited<ReturnType<typeof getSectionSponsor>>;
type SectionPage = Section & { articles: Article[]; sponsor: SectionSponsor };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);

  const supabase = await createClient();

  // Fetch the section by slug
  const { data: sectionRow, error: sectionError } = await supabase
    .from("sections")
    .select()
    .eq("slug", slug)
    .single();

  if (sectionError || !sectionRow) {
    return NextResponse.json(
      { error: "Section not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Fetch articles for this section with pagination
  const start = (page - 1) * pageSize;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionRowAny = sectionRow as any;
   
  const { data: articleRows, count, error: articlesError } = await (supabase
    .from("articles")
    .select(ARTICLE_SELECT, { count: "exact" })
    .eq("section_id", sectionRowAny.id)
    .eq("status", "published")
    .filter("sponsorship", "is", null)
    .order("published_at", { ascending: false })
    .range(start, start + pageSize - 1) as any);

  if (articlesError) {
    return NextResponse.json(
      { error: articlesError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  // "Sponsored by" line for a section sold as a Section Sponsorship. Only the
  // first page renders the header, so skip the lookup for the rest.
  const sponsor = page === 1 ? await getSectionSponsor(slug).catch(() => null) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles: Article[] = (articleRows ?? []).map((r: any) => mapArticleRow(r));
  const section = mapSectionRow(sectionRowAny, total);

  const response: ApiResponse<SectionPage> = {
    data: { ...section, articles, sponsor },
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}
