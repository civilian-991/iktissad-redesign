import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adsGuard,
  badRequest,
  serverError,
  mapSocialPostRow,
  socialPostSchema,
  type SocialPost,
} from "@/lib/ads/admin";
import type { ApiResponse } from "@/types";

type Params = { params: Promise<{ id: string }> };

/**
 * PUT /api/admin/social-posts/[id] — record reach/engagements (copied from
 * the platform's dashboard) or fix the post link.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = socialPostSchema.omit({ articleId: true }).partial().safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

  const d = parsed.data;
  const update: Record<string, unknown> = {};
  if (d.platform !== undefined) update.platform = d.platform;
  if (d.postUrl !== undefined) update.post_url = d.postUrl || null;
  if (d.postedAt !== undefined) update.posted_at = d.postedAt;
  if (d.reach !== undefined) update.reach = d.reach;
  if (d.engagements !== undefined) update.engagements = d.engagements;
  if (d.reach !== undefined || d.engagements !== undefined) update.metrics_updated_at = new Date().toISOString();

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("social_post_log") as any)
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!row) return NextResponse.json({ error: "Post not found" } satisfies ApiResponse<never>, { status: 404 });
  return NextResponse.json({ data: mapSocialPostRow(row) } satisfies ApiResponse<SocialPost>);
}

/** DELETE — only posts logged by hand; the auto-posting audit trail stays. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from("social_post_log") as any)
    .delete()
    .eq("id", id)
    .eq("manual", true)
    .select("id");
  if (error) return serverError(error.message);
  if (!data?.length) return badRequest("يمكن حذف المنشورات المسجّلة يدوياً فقط");
  return NextResponse.json({ data: null });
}
