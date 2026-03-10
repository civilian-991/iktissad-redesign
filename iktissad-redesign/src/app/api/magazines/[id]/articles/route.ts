import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

export interface BoardArticle {
  id: string;
  title: string;
  titleEn: string;
  status: string;
  wordCount: number | null;
  dueDate: string | null;
  sectionId: string | null;
  sectionName: string | null;
  sectionColor: string | null;
  sortOrder: number;
  author: {
    id: string;
    name: string;
    avatar: string;
  } | null;
  assignee: {
    id: string;
    name: string;
    avatar: string;
  } | null;
}

// GET /api/magazines/[id]/articles — list articles for a magazine issue (kanban board)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Get magazine_articles join table entries with full article data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: links, error: linksError } = await (supabase as any)
    .from("magazine_articles")
    .select(`
      article_id,
      sort_order,
      section_id,
      articles:article_id (
        id,
        title,
        title_en,
        status,
        author_id,
        users:author_id ( id, name, avatar )
      )
    `)
    .eq("magazine_id", id)
    .order("sort_order", { ascending: true });

  if (linksError) {
    return NextResponse.json(
      { error: linksError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Get magazine sections for color info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sections } = await (supabase as any)
    .from("magazine_sections")
    .select("id, name, theme_color")
    .eq("issue_id", id);

  const sectionMap: Record<string, { name: string; color: string }> = {};
  if (sections) {
    for (const s of sections as Array<{ id: string; name: string; theme_color: string }>) {
      sectionMap[s.id] = { name: s.name, color: s.theme_color };
    }
  }

  // Get article assignments
  const articleIds = (links ?? []).map((l: { article_id: string }) => l.article_id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignments } = articleIds.length
    ? await (supabase as any)
        .from("article_assignments")
        .select("article_id, assignee_id, users:assignee_id ( id, name, avatar )")
        .in("article_id", articleIds)
    : { data: null };

  const assigneeMap: Record<string, { id: string; name: string; avatar: string }> = {};
  if (assignments) {
    for (const a of assignments as Array<{
      article_id: string;
      assignee_id: string;
      users: { id: string; name: string; avatar: string } | null;
    }>) {
      if (a.users) {
        assigneeMap[a.article_id] = {
          id: a.users.id,
          name: a.users.name,
          avatar: a.users.avatar,
        };
      }
    }
  }

  // Get due dates from article_assignments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dueDates } = articleIds.length
    ? await (supabase as any)
        .from("article_assignments")
        .select("article_id, due_date")
        .in("article_id", articleIds)
        .not("due_date", "is", null)
    : { data: null };

  const dueDateMap: Record<string, string> = {};
  if (dueDates) {
    for (const d of dueDates as Array<{ article_id: string; due_date: string }>) {
      dueDateMap[d.article_id] = d.due_date;
    }
  }

  const articles: BoardArticle[] = (links ?? []).map(
    (link: {
      article_id: string;
      sort_order: number;
      section_id: string | null;
      articles: {
        id: string;
        title: string;
        title_en: string;
        status: string;
        author_id: string;
        users: { id: string; name: string; avatar: string } | null;
      } | null;
    }) => {
      const art = link.articles;
      if (!art) return null;

      const section = link.section_id ? sectionMap[link.section_id] : null;

      return {
        id: art.id,
        title: art.title,
        titleEn: art.title_en,
        status: art.status ?? "draft",
        wordCount: null, // Would need content analysis
        dueDate: dueDateMap[art.id] ?? null,
        sectionId: link.section_id,
        sectionName: section?.name ?? null,
        sectionColor: section?.color ?? null,
        sortOrder: link.sort_order,
        author: art.users
          ? { id: art.users.id, name: art.users.name, avatar: art.users.avatar }
          : null,
        assignee: assigneeMap[art.id] ?? null,
      } satisfies BoardArticle;
    }
  ).filter(Boolean) as BoardArticle[];

  const response: ApiResponse<BoardArticle[]> = { data: articles };
  return NextResponse.json(response);
}
