import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchWebhook } from '@/lib/webhooks/dispatcher';
import type { ApiResponse } from '@/types';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();
  const { id } = await params;

  const admin = createAdminClient();
  const { data: webhook, error } = await admin
    .from('webhooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !webhook) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Webhook not found' },
      { status: 404 }
    );
  }

  // Fire a test ping using the first subscribed event (or a generic fallback)
  const events = (webhook as unknown as Record<string, unknown>).events as string[];
  const event = (events?.[0] ?? 'article.published') as Parameters<typeof dispatchWebhook>[0];

  await dispatchWebhook(event, {
    test: true,
    webhook_id: id,
    message: 'This is a test delivery from IKTISSAD CMS',
  });

  return NextResponse.json<ApiResponse<{ sent: true }>>({ data: { sent: true } });
}
