/**
 * POST /api/checkout/article
 *
 * Creates an MPGS checkout session for purchasing a single article.
 * On payment success, the webhook at /api/webhooks/payment records
 * a row in article_purchases.
 *
 * Body: { articleId }
 * Response: { data: { sessionId, payUrl, orderId, successIndicator } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createCheckoutSession, getMpgsCredentials } from '@/lib/mpgs';
import type { ApiResponse } from '@/types';

const schema = z.object({
  articleId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

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

  const { articleId } = parsed.data;
  const supabase = await createClient();
  const admin = createAdminClient();

  // users.id = auth.uid() in Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorizedResponse();

  const userId = user.id;

  // Check for duplicate purchase
  const { count: existing } = await (admin as any)
    .from('article_purchases')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('article_id', articleId);

  if ((existing ?? 0) > 0) {
    return NextResponse.json(
      { error: 'لقد اشتريت هذا المقال مسبقاً' },
      { status: 409 }
    );
  }

  // Fetch article details + price
  const { data: article } = await (admin as any)
    .from('articles')
    .select('id, title, slug, is_paywalled, article_price')
    .eq('id', articleId)
    .single();

  if (!article) {
    return NextResponse.json({ error: 'المقال غير موجود' }, { status: 404 });
  }
  if (!article.is_paywalled) {
    return NextResponse.json({ error: 'هذا المقال متاح مجاناً' }, { status: 400 });
  }

  // Determine price: article-specific override or global default from site_settings
  let price: number = Number(article.article_price ?? 0);
  if (!price) {
    const { data: settingsRow } = await (admin as any)
      .from('site_settings')
      .select('value')
      .eq('key', 'paywall')
      .single();
    price = Number(settingsRow?.value?.singleArticleDefaultPrice ?? 5);
  }

  if (price <= 0) {
    return NextResponse.json({ error: 'سعر المقال غير محدد' }, { status: 400 });
  }

  const orderId = `ART-${userId.slice(0, 8)}-${articleId.slice(0, 8)}-${Date.now()}`;
  const returnUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.iktissadonline.com'
  }/${article.slug}?order=${orderId}`;

  let sessionId: string;
  let successIndicator: string;

  try {
    const creds = getMpgsCredentials();
    void creds; // accessed inside createCheckoutSession
    const session = await createCheckoutSession({
      orderId,
      amount:      price.toFixed(2),
      currency:    'SAR',
      description: `مقال: ${article.title}`,
      returnUrl,
    });
    sessionId        = session.sessionId;
    successIndicator = session.successIndicator;
  } catch (err) {
    console.error('[checkout/article] MPGS error:', err);
    return NextResponse.json(
      { error: 'خطأ في بوابة الدفع — حاول مرة أخرى' },
      { status: 502 }
    );
  }

  // Store a pending article_purchases row so the webhook can confirm it
  await (admin as any)
    .from('article_purchases')
    .insert({
      user_id:           userId,
      article_id:        articleId,
      amount:            price,
      currency:          'SAR',
      gateway_payment_id: sessionId,
      // payment_id left null; webhook fills it in after confirmation
    })
    .onConflict('user_id,article_id')
    .ignore();

  const creds = getMpgsCredentials();

  return NextResponse.json({
    data: { sessionId, payUrl: creds.payUrl, orderId, successIndicator },
  } satisfies ApiResponse<{
    sessionId: string; payUrl: string; orderId: string; successIndicator: string;
  }>);
}
