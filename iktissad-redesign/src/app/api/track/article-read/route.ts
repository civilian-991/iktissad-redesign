/**
 * POST /api/track/article-read
 *
 * Records a reading session for metered paywall counting and reading history.
 * Works for both authenticated users and anonymous visitors (cookie-based).
 *
 * Body: { articleId, sessionId, timeOnPage?, scrollDepth?, readThrough?, referrer? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  articleId:   z.string().uuid(),
  sessionId:   z.string().min(1).max(128),  // anonymous browser session ID
  timeOnPage:  z.number().int().min(0).max(86400).optional().default(0),
  scrollDepth: z.number().int().min(0).max(100).optional().default(0),
  readThrough: z.boolean().optional().default(false),
  referrer:    z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { articleId, sessionId, timeOnPage, scrollDepth, readThrough, referrer } = parsed.data;

  // users.id = auth.uid() in Supabase Auth — no secondary lookup needed
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const dbUserId: string | null = user?.id ?? null;

  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from('reading_sessions')
    .insert({
      user_id:      dbUserId,
      article_id:   articleId,
      session_id:   sessionId,
      time_on_page: timeOnPage,
      scroll_depth: scrollDepth,
      read_through: readThrough,
      referrer:     referrer ?? null,
    });

  if (error) {
    // Silently ignore duplicate / constraint errors (best-effort tracking)
    if (!error.code?.startsWith('23')) {
      console.error('[track/article-read]', error.message);
    }
  }

  return NextResponse.json({ ok: true });
}
