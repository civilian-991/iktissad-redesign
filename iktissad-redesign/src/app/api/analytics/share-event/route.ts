/**
 * POST /api/analytics/share-event
 *
 * Public endpoint — tracks when an article is shared via share buttons.
 *
 * Body: { articleId, platform, sessionId? }
 * Tables: share_events (INSERT)
 * Auth: None (public tracking)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  articleId: z.string().uuid(),
  platform: z.enum([
    "twitter",
    "linkedin",
    "whatsapp",
    "facebook",
    "telegram",
    "copy_link",
    "email",
  ]),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { articleId, platform, sessionId } = parsed.data;

  // Try to get user ID from session (optional)
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Ignore — anonymous tracking is fine
  }

  // Fire-and-forget insert
  const admin = createAdminClient();
  void (admin as any)
    .from("share_events")
    .insert({
      article_id: articleId,
      platform,
      user_id: userId,
      session_id: sessionId ?? null,
    })
    .then(() => {});

  return NextResponse.json({ data: { ok: true } });
}
