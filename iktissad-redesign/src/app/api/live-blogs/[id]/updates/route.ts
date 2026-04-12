import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  authWriteLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

const updateSchema = z.object({
  content: z.string().min(1),
});

/**
 * POST /api/live-blogs/[id]/updates
 * Add a new update to a live blog.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const ip = getClientIp(request);
  const rl = authWriteLimit(`live-blog-update:post:${ip}`);
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await (admin.from("live_blog_updates") as any)
    .insert({
      live_blog_id: id,
      content: parsed.data.content,
      author_id: auth.userId,
    })
    .select("*, users:author_id ( name, avatar )")
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
