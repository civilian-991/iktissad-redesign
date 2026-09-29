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

/**
 * POST /api/admin/social-posts — log a promotional post made by hand for a
 * (partner) article, so it and its reach appear in the advertiser's report.
 * Auto-posted ones are logged by src/lib/social-posting.ts.
 */
export async function POST(request: NextRequest) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = socialPostSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

  const d = parsed.data;
  const hasMetrics = d.reach != null || d.engagements != null;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("social_post_log") as any)
    .insert({
      article_id: d.articleId,
      platform: d.platform,
      post_url: d.postUrl || null,
      post_content: "",
      status: "sent",
      manual: true,
      posted_at: d.postedAt || new Date().toISOString(),
      reach: d.reach ?? null,
      engagements: d.engagements ?? null,
      metrics_updated_at: hasMetrics ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data: mapSocialPostRow(row) } satisfies ApiResponse<SocialPost>, { status: 201 });
}
