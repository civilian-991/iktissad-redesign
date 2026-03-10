/**
 * Admin Notification Helper
 *
 * Inserts a record into admin_notifications via the admin client.
 * Always silent-fails — never throws, never blocks the calling request.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export type NotificationType =
  | 'new_subscriber'
  | 'payment_failed'
  | 'subscription_canceled'
  | 'comment_flagged'
  | 'article_published'
  | 'manual_change';

export interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  body?: string;
  resourceId?: string;
}

export async function createAdminNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('admin_notifications') as any).insert({
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      resource_id: params.resourceId ?? null,
      is_read: false,
      read_by: [],
    });
  } catch (err) {
    console.warn('[notifications] Failed to create admin notification:', err);
  }
}
