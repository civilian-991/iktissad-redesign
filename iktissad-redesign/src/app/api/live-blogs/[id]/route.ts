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
 * GET /api/live-blogs/[id]
 * Get a live blog with its updates.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = getClientIp(request);
  const rl = publicReadLimit(`live-blog:get:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const supabase = await createClient();

  const { data: blog, error: blogError } = await (
    supabase.from("live_blogs") as any
  )
    .select("*, articles:article_id ( id, title, slug )")
    .eq("id", id)
    .single();

  if (blogError) {
    return NextResponse.json(
      { error: blogError.message } satisfies ApiResponse<never>,
      { status: blogError.code === "PGRST116" ? 404 : 500 }
    );
  }

  const { data: updates } = await (supabase.from("live_blog_updates") as any)
    .select("*, users:author_id ( name, avatar )")
    .eq("live_blog_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    data: { ...blog, updates: updates ?? [] },
  } satisfies ApiResponse<typeof blog>);
}

const updateSchema = z.object({
  status: z.enum(["active", "ended"]).optional(),
});

/**
 * PUT /api/live-blogs/[id]
 * Update a live blog (e.g. end it).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const ip = getClientIp(request);
  const rl = authWriteLimit(`live-blog:put:${ip}`);
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
  const updateData: Record<string, unknown> = {};

  if (parsed.data.status) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "ended") {
      updateData.ended_at = new Date().toISOString();
    }
  }

  const { data, error } = await (admin.from("live_blogs") as any)
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data } satisfies ApiResponse<typeof data>);
}
