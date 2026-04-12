/**
 * Social Auto-Post Manual Trigger
 * POST /api/admin/social/post
 *
 * Manually triggers social media posting for a specific article.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';
import { postArticleToSocial } from '@/lib/social-posting';
import type { ApiResponse } from '@/types';

const schema = z.object({
  articleId: z.string().uuid(),
  platforms: z.array(z.enum(['twitter', 'linkedin', 'telegram'])).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { articleId, platforms } = parsed.data;
  const results = await postArticleToSocial(articleId, platforms);

  return NextResponse.json({
    data: { results },
  } satisfies ApiResponse<{ results: typeof results }>);
}
