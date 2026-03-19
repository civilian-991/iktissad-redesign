import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ArticleAssignment {
  id: string;
  title: string;
  status: "draft" | "review" | "pending_approval" | "scheduled" | "published";
  section: string | null;
  publishedAt: string | null;
  authorName: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  assignmentRole: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
}

// ─── GET /api/admin/assignments ──────────────────────────────────────────────

export async function GET() {
  const admin = createAdminClient();

  // Fetch articles with author info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: articleRows, error: articleError } = await (admin.from("articles") as any)
    .select(
      `
      id,
      title,
      status,
      published_at,
      sections:section_id ( name ),
      author:author_id ( name )
      `
    )
    .order("created_at", { ascending: false });

  if (articleError) {
    return NextResponse.json(
      { error: articleError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Fetch all assignments with assignee info in one query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignmentRows, error: assignError } = await (admin.from("article_assignments") as any)
    .select(
      `
      article_id,
      assignee_id,
      role,
      due_date,
      assignee:assignee_id ( name, avatar )
      `
    );

  if (assignError) {
    return NextResponse.json(
      { error: assignError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Build a map: article_id → assignment (last one wins if multiple exist)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignmentMap = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (assignmentRows ?? []) as any[]) {
    assignmentMap.set(row.article_id, row);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: ArticleAssignment[] = (articleRows ?? []).map((a: any) => {
    const assign = assignmentMap.get(a.id) ?? null;
    return {
      id: a.id,
      title: a.title,
      status: a.status as ArticleAssignment["status"],
      section: a.sections?.name ?? null,
      publishedAt: a.published_at ?? null,
      authorName: a.author?.name ?? null,
      assigneeId: assign?.assignee_id ?? null,
      dueDate: assign?.due_date ?? null,
      assignmentRole: assign?.role ?? null,
      assigneeName: assign?.assignee?.name ?? null,
      assigneeAvatar: assign?.assignee?.avatar ?? null,
    };
  });

  const response: ApiResponse<ArticleAssignment[]> = { data: result };
  return NextResponse.json(response);
}
