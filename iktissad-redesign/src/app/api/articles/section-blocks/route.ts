import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapArticleRow } from "@/lib/supabase/mappers";
import { publicReadLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";
import type { ApiResponse, Article } from "@/types";

/**
 * GET /api/articles/section-blocks?sections=economy,business,...&pageSize=4
 *
 * Latest published articles for several sections in one request, keyed by
 * section slug. The homepage's auto-generated section blocks used to call
 * /api/articles once per section (ten requests, flagged by Sentry as N+1).
 * Same visibility rules as /api/articles: published, not archived, no
 * sponsored content.
 */

// Only what the homepage tiles render.
const BLOCK_SELECT = "id, public_id, slug, title, title_en, featured_image, published_at, section_id";

const MAX_SECTIONS = 20;

export async function GET(request: NextRequest) {
  const rl = publicReadLimit(`articles:section-blocks:${getClientIp(request)}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const params = request.nextUrl.searchParams;
  const slugs = [...new Set((params.get("sections") ?? "").split(",").map((s) => s.trim()).filter(Boolean))]
    .slice(0, MAX_SECTIONS);
  const pageSize = Math.min(Math.max(parseInt(params.get("pageSize") || "4", 10) || 4, 1), 12);

  if (slugs.length === 0) {
    return NextResponse.json({ data: {} } satisfies ApiResponse<Record<string, Article[]>>);
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sectionRows, error: sectionError } = await (supabase as any)
    .from("sections")
    .select("id, slug")
    .in("slug", slugs);
  if (sectionError) {
    return NextResponse.json({ error: sectionError.message } satisfies ApiResponse<never>, { status: 500 });
  }

  const results = await Promise.all(
    ((sectionRows ?? []) as { id: string; slug: string }[]).map(async ({ id, slug }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("articles")
        .select(BLOCK_SELECT)
        .eq("section_id", id)
        .eq("status", "published")
        .eq("archived", false)
        .is("sponsorship", null)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(pageSize);
      if (error) throw new Error(error.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return [slug, (data ?? []).map((r: any) => mapArticleRow(r))] as const;
    })
  ).catch((err: Error) => err);

  if (results instanceof Error) {
    return NextResponse.json({ error: results.message } satisfies ApiResponse<never>, { status: 500 });
  }

  return NextResponse.json(
    { data: Object.fromEntries(results) } satisfies ApiResponse<Record<string, Article[]>>,
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
