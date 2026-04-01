import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyIndexNow } from "@/lib/indexnow";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import { runAutomations } from "@/lib/automations/engine";
import type { ApiResponse } from "@/types";

const VALID_STATUSES = [
  "idea",
  "assigned",
  "draft",
  "submitted",
  "review",
  "approved",
  "layout",
  "published",
  "scheduled",
] as const;

type ArticleStatus = typeof VALID_STATUSES[number];

const updateStatusSchema = z.object({
  status: z.enum(VALID_STATUSES),
  note: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
});

// PUT /api/articles/[id]/status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // Get current status for history record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (admin as any)
    .from("articles")
    .select("status")
    .eq("id", id)
    .single();

  const oldStatus = current?.status as ArticleStatus | undefined;

  // Update article status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (admin as any)
    .from("articles")
    .update({ status: data.status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status, updated_at")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Article not found" } satisfies ApiResponse<never>,
      { status: updateError ? 500 : 404 }
    );
  }

  // Insert status history record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("article_status_history").insert({
    article_id: id,
    old_status: oldStatus ?? null,
    new_status: data.status,
    changed_by: auth.userId ?? null,
    note: data.note ?? null,
  });

  // Notify search engines + fire webhooks/automations when article transitions to published
  if (data.status === 'published' && oldStatus !== 'published') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: slugRow } = await (admin as any)
      .from('articles')
      .select('slug')
      .eq('id', id)
      .single();
    if (slugRow?.slug) {
      void notifyIndexNow([slugRow.slug]);
      // Bust ISR cache so the article and listing pages update immediately
      revalidatePath(`/${slugRow.slug}`);
    }
    revalidatePath('/');          // homepage latest news
    revalidatePath('/articles');  // articles listing
    void dispatchWebhook('article.published', { article_id: id, slug: slugRow?.slug ?? null });
    void runAutomations('article.published', { article_id: id, slug: slugRow?.slug ?? null });
  }

  // Also revalidate listing pages when an article is unpublished
  if (oldStatus === 'published' && data.status !== 'published') {
    revalidatePath('/');
    revalidatePath('/articles');
  }

  // Fire webhooks/automations when article enters review
  if (data.status === 'review' && oldStatus !== 'review') {
    void dispatchWebhook('article.review', { article_id: id });
    void runAutomations('article.review', { article_id: id });
  }

  // If assignee provided, upsert assignment
  if (data.assigneeId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("article_assignments").upsert(
      {
        article_id: id,
        assignee_id: data.assigneeId,
        role: "writer",
        assigned_by: auth.userId ?? null,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "article_id, assignee_id" }
    );
  }

  const response: ApiResponse<{ id: string; status: string; updatedAt: string }> = {
    data: {
      id: updated.id as string,
      status: updated.status as string,
      updatedAt: updated.updated_at as string,
    },
  };
  return NextResponse.json(response);
}
