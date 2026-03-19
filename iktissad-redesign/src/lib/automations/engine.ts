/**
 * Automation Engine
 * Phase 8 — Automation Rules
 *
 * Evaluates all enabled rules whose trigger matches the given event
 * and executes the corresponding action.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export type AutomationEventType =
  | 'article.published'
  | 'article.updated'
  | 'article.review'
  | 'article.high_views'
  | 'subscriber.created'
  | 'subscriber.churned'
  | 'payment.received'
  | 'payment.failed'
  | 'comment.flagged';

export async function runAutomations(
  event: AutomationEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();

  const { data: rules } = await admin
    .from('automation_rules')
    .select('*')
    .eq('enabled', true)
    .eq('trigger_event', event);

  if (!rules || rules.length === 0) return;

  await Promise.allSettled(
    rules.map(async (rule) => {
      const r = rule as Record<string, unknown>;
      const config = (r.config as Record<string, unknown>) ?? {};
      const actionType = r.action_type as string;

      try {
        switch (actionType) {
          case 'post_telegram': {
            // Log the action — actual Telegram API integration requires a bot token
            // configured in env vars; this stub logs for now
            console.log('[automation] post_telegram', { config, payload });
            break;
          }
          case 'send_welcome_email': {
            console.log('[automation] send_welcome_email', { config, payload });
            break;
          }
          case 'notify_admin': {
            // Create an admin notification for the finance/admin role
            const notifData = {
              type: 'manual_change' as const,
              title: `تنبيه أتمتة: ${event}`,
              body: `تم تفعيل قاعدة الأتمتة "${r.name}" — ${JSON.stringify(payload).slice(0, 200)}`,
              metadata: { event, payload, rule_key: r.rule_key },
              read_by: [] as string[],
            };
            await admin.from('admin_notifications').insert(notifData);
            break;
          }
          case 'add_to_featured': {
            const articleId = payload.article_id as string | undefined;
            if (articleId) {
              await admin
                .from('articles')
                .update({ featured: true })
                .eq('id', articleId);
            }
            break;
          }
          case 'notify_editor': {
            const articleId = payload.article_id as string | undefined;
            if (articleId) {
              const notifData = {
                type: 'article_published' as const,
                title: 'طلب مراجعة مقال',
                body: `المقال معلق للمراجعة`,
                metadata: { article_id: articleId, event, rule_key: r.rule_key },
                read_by: [] as string[],
              };
              await admin.from('admin_notifications').insert(notifData);
            }
            break;
          }
          default:
            console.warn('[automation] Unknown action type:', actionType);
        }
      } catch (err) {
        console.error('[automation] Action failed:', { actionType, error: err });
      }
    })
  );
}
