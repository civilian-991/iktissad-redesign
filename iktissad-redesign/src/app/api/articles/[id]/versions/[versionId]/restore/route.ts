/**
 * POST /api/articles/[id]/versions/[versionId]/restore
 * Restores the article to the given version snapshot.
 * Saves the current state as a new version before overwriting.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id, versionId } = await params;
  const supabase = createAdminClient();

  try {
    // 1. Fetch the target version
    const { data: version, error: versionError } = await (supabase as any)
      .from("article_versions")
      .select("title, title_en, excerpt, content, body, version_number")
      .eq("id", versionId)
      .eq("article_id", id)
      .single();

    if (versionError || !version) {
      return NextResponse.json(
        { error: "Version not found" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }

    // 2. Get the next version number for backup snapshot
    const { data: latest } = await (supabase as any)
      .from("article_versions")
      .select("version_number")
      .eq("article_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latest?.version_number ?? 0) + 1;

    // 3. Save current state as a new version before restoring
    const { data: currentArticle } = await (supabase as any)
      .from("articles")
      .select("title, title_en, excerpt, content, body")
      .eq("id", id)
      .single();

    if (currentArticle) {
      await (supabase as any)
        .from("article_versions")
        .insert({
          article_id: id,
          version_number: nextVersion,
          title: currentArticle.title ?? "",
          title_en: currentArticle.title_en ?? "",
          excerpt: currentArticle.excerpt ?? "",
          content: currentArticle.content ?? "",
          body: currentArticle.body ?? null,
          changed_by: auth.userId ?? null,
          summary: `نسخة احتياطية قبل الاسترجاع إلى الإصدار ${version.version_number}`,
        });
    }

    // 4. Update article with restored version content
    const { error: updateError } = await (supabase as any)
      .from("articles")
      .update({
        title: version.title,
        title_en: version.title_en,
        excerpt: version.excerpt,
        content: version.content,
        body: version.body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({
      data: { success: true, restoredVersionNumber: version.version_number },
    } satisfies ApiResponse<{ success: boolean; restoredVersionNumber: number }>);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
