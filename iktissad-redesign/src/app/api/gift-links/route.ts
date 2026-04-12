/**
 * POST /api/gift-links
 *
 * Creates a shareable gift link for a paywalled article.
 * Requires the caller to be an active subscriber.
 * Enforces the monthly gift link quota (default 5).
 *
 * Body: { articleId, referralCode? }
 * Response: { data: { token, url, expiresAt } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

const schema = z.object({
  articleId:    z.string().uuid(),
  referralCode: z.string().max(64).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 });
  }

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

  const { articleId, referralCode } = parsed.data;
  const supabase = await createClient();

  // users.id = auth.uid() in Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // Verify user has an active subscription
  const { data: subscriber } = await (supabase as any)
    .from('subscribers')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!subscriber) {
    return NextResponse.json(
      { error: 'يجب أن تكون مشتركاً نشطاً لإنشاء روابط هدية' },
      { status: 403 }
    );
  }

  // Fetch paywall settings for monthly quota
  const { data: settingsRow } = await (supabase as any)
    .from('site_settings')
    .select('value')
    .eq('key', 'paywall')
    .single();
  const maxGiftsPerMonth: number = settingsRow?.value?.giftLinksPerMonth ?? 5;

  // Count gift links created by this subscriber this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: usedThisMonth } = await (supabase as any)
    .from('gift_links')
    .select('*', { count: 'exact', head: true })
    .eq('created_by_subscriber_id', subscriber.id)
    .gte('created_at', startOfMonth.toISOString());

  if ((usedThisMonth ?? 0) >= maxGiftsPerMonth) {
    return NextResponse.json(
      { error: `لقد استنفدت حصتك الشهرية من روابط الهدية (${maxGiftsPerMonth})` },
      { status: 429 }
    );
  }

  // Verify the article exists and is paywalled
  const { data: articleRow } = await (supabase as any)
    .from('articles')
    .select('id, is_paywalled, slug')
    .eq('id', articleId)
    .single();

  if (!articleRow) {
    return NextResponse.json({ error: 'المقال غير موجود' }, { status: 404 });
  }
  if (!articleRow.is_paywalled) {
    return NextResponse.json(
      { error: 'هذا المقال مجاني ولا يحتاج رابط هدية' },
      { status: 400 }
    );
  }

  // Create the gift link
  const admin = createAdminClient();
  const { data: giftLink, error } = await (admin as any)
    .from('gift_links')
    .insert({
      article_id:               articleId,
      created_by_subscriber_id: subscriber.id,
      created_by_user_id:       userId,
      referral_code:            referralCode ?? null,
      max_uses:                 1,
    })
    .select('token, expires_at')
    .single();

  if (error) {
    console.error('[gift-links POST]', error.message);
    return NextResponse.json({ error: 'تعذّر إنشاء رابط الهدية' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.iktissadonline.com';
  const url = `${baseUrl}/${articleRow.slug}?gift=${giftLink.token}`;

  return NextResponse.json({
    data: {
      token:     giftLink.token,
      url,
      expiresAt: giftLink.expires_at,
    },
  } satisfies ApiResponse<{ token: string; url: string; expiresAt: string }>, { status: 201 });
}
