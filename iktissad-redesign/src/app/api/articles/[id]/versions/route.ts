/**
 * GET  /api/articles/[id]/versions — list all versions for an article
 * POST /api/articles/[id]/versions — create a new version snapshot
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse, ArticleVersion } from "@/types";

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;
  const supabase = createAdminClient();

  try {
    const { data, error } = await (supabase as any)
      .from("article_versions")
      .select(
        `id, article_id, version_number, title, title_en, excerpt, content, body, changed_by, summary, created_at`
      )
      .eq("article_id", id)
      .order("version_number", { ascending: false })
      .limit(50);

    if (error) throw error;

    const versions: ArticleVersion[] = (data ?? []).map((row: any) => ({
      id: row.id,
      articleId: row.article_id,
      versionNumber: row.version_number,
      title: row.title ?? "",
      titleEn: row.title_en ?? "",
      excerpt: row.excerpt ?? "",
      content: row.content ?? "",
      body: row.body ?? null,
      changedBy: row.changed_by ?? null,
      changedByName: null,
      changedByAvatar: null,
      summary: row.summary ?? null,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ data: versions } satisfies ApiResponse<ArticleVersion[]>);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const { summary } = (body as { summary?: string }) ?? {};

  const supabase = createAdminClient();

  try {
    // 1. Fetch current article state
    const { data: article, error: articleError } = await (supabase as any)
      .from("articles")
      .select("title, title_en, excerpt, content, body")
      .eq("id", id)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: "Article not found" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }

    // 2. Get the next version number
    const { data: latest } = await (supabase as any)
      .from("article_versions")
      .select("version_number")
      .eq("article_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latest?.version_number ?? 0) + 1;

    // 3. Insert the snapshot
    const { data: newVersion, error: insertError } = await (supabase as any)
      .from("article_versions")
      .insert({
        article_id: id,
        version_number: nextVersion,
        title: article.title ?? "",
        title_en: article.title_en ?? "",
        excerpt: article.excerpt ?? "",
        content: article.content ?? "",
        body: article.body ?? null,
        changed_by: auth.userId ?? null,
        summary: summary ?? null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const version: ArticleVersion = {
      id: newVersion.id,
      articleId: newVersion.article_id,
      versionNumber: newVersion.version_number,
      title: newVersion.title,
      titleEn: newVersion.title_en,
      excerpt: newVersion.excerpt,
      content: newVersion.content,
      body: newVersion.body ?? null,
      changedBy: newVersion.changed_by,
      summary: newVersion.summary,
      createdAt: newVersion.created_at,
    };

    return NextResponse.json(
      { data: version } satisfies ApiResponse<ArticleVersion>,
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
