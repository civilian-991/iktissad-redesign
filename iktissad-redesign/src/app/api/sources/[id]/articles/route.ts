import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, SourceArticleLink } from "@/types";

// ─── Mapper ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLinkRow(row: any): SourceArticleLink {
  return {
    id: row.id,
    sourceId: row.source_id,
    articleId: row.article_id,
    quoteExcerpt: row.quote_excerpt ?? undefined,
    linkedAt: row.linked_at,
    article: row.articles
      ? {
          id: row.articles.id,
          title: row.articles.title,
          publishedAt: row.articles.published_at ?? undefined,
        }
      : undefined,
    source: row.sources
      ? { id: row.sources.id, name: row.sources.name }
      : undefined,
  };
}

// ─── GET /api/sources/[id]/articles ──────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("source_article_links")
    .select(`*, articles ( id, title, published_at )`)
    .eq("source_id", id)
    .order("linked_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const links: SourceArticleLink[] = (rows ?? []).map((r: any) => mapLinkRow(r));
  const response: ApiResponse<SourceArticleLink[]> = { data: links };
  return NextResponse.json(response);
}

// ─── POST /api/sources/[id]/articles ─────────────────────────────────────────

const linkSchema = z.object({
  articleId: z.string().uuid(),
  quoteExcerpt: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("source_article_links")
    .insert({
      source_id: id,
      article_id: parsed.data.articleId,
      quote_excerpt: parsed.data.quoteExcerpt ?? null,
    })
    .select(`*, articles ( id, title, published_at )`)
    .single();

  if (error) {
    const isDuplicate = error.message?.includes("unique") || error.code === "23505";
    return NextResponse.json(
      { error: isDuplicate ? "هذه المقالة مرتبطة بالمصدر بالفعل" : error.message } satisfies ApiResponse<never>,
      { status: isDuplicate ? 409 : 500 }
    );
  }

  const response: ApiResponse<SourceArticleLink> = { data: mapLinkRow(row) };
  return NextResponse.json(response, { status: 201 });
}
