/**
 * Webhook Dispatcher
 * Phase 8 — Outgoing Webhooks
 *
 * Signs payloads with HMAC-SHA256, dispatches to all active webhook
 * endpoints subscribed to the given event, logs every delivery attempt,
 * and retries with exponential back-off on failure (max 3 attempts).
 */
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import type { WebhookEventType } from '@/types';

const MAX_ATTEMPTS = 3;
// Delays in ms: 0, 5 000, 25 000
const RETRY_DELAYS = [0, 5_000, 25_000];

function sign(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptDelivery(
  url: string,
  secret: string,
  event: WebhookEventType,
  payload: Record<string, unknown>,
  attempt: number
): Promise<{ success: boolean; status: number | null; body: string | null }> {
  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const signature = sign(secret, body);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Iktissad-Signature': `sha256=${signature}`,
        'X-Iktissad-Event': event,
        'X-Iktissad-Delivery-Attempt': String(attempt),
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text().catch(() => null);
    return { success: res.ok, status: res.status, body: text };
  } catch {
    return { success: false, status: null, body: null };
  }
}

export async function dispatchWebhook(
  event: WebhookEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();

  // Fetch all enabled webhooks subscribed to this event
  const { data: webhooks } = await admin
    .from('webhooks')
    .select('id, url, secret')
    .eq('enabled', true)
    .contains('events', [event]);

  if (!webhooks || webhooks.length === 0) return;

  // Dispatch to each webhook in parallel (fire-and-forget with retry)
  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const webhook = wh as unknown as { id: string; url: string; secret: string };
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (i > 0) await sleep(RETRY_DELAYS[i]);
        const result = await attemptDelivery(webhook.url, webhook.secret, event, payload, i + 1);

        // Log the delivery attempt
        await admin.from('webhook_deliveries').insert({
          webhook_id: webhook.id,
          event,
          payload: payload as Record<string, unknown>,
          response_status: result.status,
          response_body: result.body?.slice(0, 2000) ?? null,
          attempt: i + 1,
          success: result.success,
        });

        if (result.success) break; // stop retrying on success
      }
    })
  );
}
