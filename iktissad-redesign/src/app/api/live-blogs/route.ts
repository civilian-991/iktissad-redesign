import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  publicReadLimit,
  authWriteLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

/**
 * GET /api/live-blogs
 * List live blogs, optionally filtered by article_id or status.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = publicReadLimit(`live-blogs:get:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const searchParams = request.nextUrl.searchParams;
  const articleId = searchParams.get("articleId");
  const status = searchParams.get("status");

  const supabase = await createClient();
  let query = (supabase.from("live_blogs") as any).select(
    "*, articles:article_id ( id, title, slug, featured_image )"
  );

  if (articleId) query = query.eq("article_id", articleId);
  if (status) query = query.eq("status", status);

  query = query.order("started_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data } satisfies ApiResponse<typeof data>);
}

const createSchema = z.object({
  articleId: z.string().uuid(),
});

/**
 * POST /api/live-blogs
 * Start a new live blog for an article.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const ip = getClientIp(request);
  const rl = authWriteLimit(`live-blogs:post:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await (admin.from("live_blogs") as any)
    .insert({
      article_id: parsed.data.articleId,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data } satisfies ApiResponse<typeof data>, {
    status: 201,
  });
}
