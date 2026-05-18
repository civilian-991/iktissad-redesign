/**
 * Automation Engine
 * Phase 8 — Automation Rules
 *
 * Evaluates all enabled rules whose trigger matches the given event
 * and executes the corresponding action. Every action attempt is
 * persisted to `automation_runs` for admin debugging, and errors are
 * captured (never thrown) so a single failure does not poison the
 * remainder of the rule chain.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { postToTelegram } from '@/lib/social-posting';
import { getSiteSetting } from '@/lib/site-settings';

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

interface ActionOutcome {
  success: boolean;
  error?: string;
  /** Mark this run as "skipped" rather than "success"/"failed" — e.g. no recipient. */
  skipped?: boolean;
}

/** Persist a single action attempt to `automation_runs`. Best-effort: swallows errors. */
async function logRun(
  admin: ReturnType<typeof createAdminClient>,
  row: {
    automation_id: string | null;
    rule_key: string | null;
    event: string;
    action: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string | null;
    payload: Record<string, unknown>;
  }
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('automation_runs').insert({
      automation_id: row.automation_id,
      rule_key: row.rule_key,
      event: row.event,
      action: row.action,
      status: row.status,
      error: row.error ?? null,
      payload: row.payload,
    });
  } catch (err) {
    console.error('[automation] Failed to persist automation_runs row:', err);
  }
}

/** Lookup the first active Telegram social account; returns {token, channel} or null. */
async function getTelegramAccount(
  admin: ReturnType<typeof createAdminClient>
): Promise<{ token: string; channel: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('social_accounts')
    .select('access_token, account_name, active')
    .eq('platform', 'telegram')
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (!data?.access_token) return null;
  return {
    token: data.access_token as string,
    channel: (data.account_name as string) ?? '',
  };
}

/** Format the default Arabic Telegram message for the article-published template. */
function formatArticlePublishedMessage(article: {
  title?: string;
  excerpt?: string;
  slug?: string;
  url?: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.iktissadonline.com';
  const url = article.url ?? (article.slug ? `${baseUrl}/${article.slug}` : baseUrl);
  const title = article.title ?? 'مقال جديد';
  const excerpt = article.excerpt ? `\n\n${article.excerpt}` : '';
  return `<b>${title}</b>${excerpt}\n\n<a href="${url}">اقرأ المزيد</a>`;
}

/** post_telegram action — sends a message to a Telegram channel via Bot API. */
async function runPostTelegram(
  admin: ReturnType<typeof createAdminClient>,
  config: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<ActionOutcome> {
  // Resolve credentials from social_accounts; allow config override of chat.
  const account = await getTelegramAccount(admin);
  if (!account) {
    return { success: false, error: 'No active Telegram social_account configured' };
  }

  const chatId =
    (config.chatId as string | undefined) ??
    (config.channel_id as string | undefined) ??
    account.channel;

  if (!chatId) {
    return { success: false, error: 'No chatId/channel resolved for Telegram post' };
  }

  // Compose the message
  let text: string;
  const template = (config.template as string | undefined) ?? (payload.template as string | undefined);
  const article = payload.article as Record<string, unknown> | undefined;

  if (template === 'article-published' && article) {
    text = formatArticlePublishedMessage({
      title: article.title as string | undefined,
      excerpt: (config.include_excerpt === false ? undefined : (article.excerpt as string | undefined)),
      slug: article.slug as string | undefined,
      url: article.url as string | undefined,
    });
  } else if (typeof config.message === 'string' && config.message.trim()) {
    text = config.message;
  } else if (typeof payload.message === 'string' && (payload.message as string).trim()) {
    text = payload.message as string;
  } else {
    return { success: false, error: 'No message body provided (config.message or payload.message)' };
  }

  const parseMode = config.parseMode as 'HTML' | 'MarkdownV2' | 'Markdown' | undefined;

  try {
    const result = await postToTelegram(account.token, text, chatId, parseMode ?? 'HTML');
    if (result.status === 'sent') return { success: true };
    return { success: false, error: result.error ?? 'Telegram post failed' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Render a minimal RTL/MSO-safe welcome email. Mirrors the newsletter renderer's table layout. */
function renderWelcomeEmail(opts: {
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  recipientName?: string;
}): string {
  const FONT = "'Segoe UI', Tahoma, 'Noto Sans Arabic', Arial, sans-serif";
  const greeting = opts.recipientName
    ? `<p style="font-family:${FONT};color:#183b4e;font-size:18px;margin:0 0 12px;direction:rtl;text-align:right">مرحباً ${opts.recipientName}،</p>`
    : '';
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td align="center"><a href="${opts.ctaUrl}" style="background:#DDA853;color:#0a1628;padding:14px 36px;text-decoration:none;font-family:${FONT};font-weight:bold;font-size:16px;display:inline-block">${opts.ctaLabel}</a></td></tr></table>`
      : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Language" content="ar">
<title>${opts.subject}</title>
<!--[if mso]>
<style type="text/css">body,table,td{font-family:'Segoe UI',Tahoma,Arial,sans-serif !important}</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:#f3f4f6;direction:rtl">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;border-collapse:collapse">
      <tr><td style="padding:32px 32px 8px;direction:rtl;text-align:right">
        ${greeting}
        <div style="font-family:${FONT};color:#374151;line-height:1.85;font-size:16px;direction:rtl;text-align:right">${opts.body}</div>
        ${cta}
      </td></tr>
      <tr><td style="padding:16px 32px 32px;border-top:1px solid #e5e7eb;font-family:${FONT};color:#9ca3af;font-size:12px;text-align:center;direction:rtl">
        إكتساد — Iktissad Online
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** send_welcome_email action — SendGrid welcome email to a single recipient. */
async function runSendWelcomeEmail(
  config: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<ActionOutcome> {
  // Recipient resolution: payload.email (preferred) or payload.subscriber.email
  const subscriber = (payload.subscriber ?? {}) as Record<string, unknown>;
  const email =
    (payload.email as string | undefined) ??
    (subscriber.email as string | undefined);

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.warn('[automation] send_welcome_email: no recipient email in payload — no-op');
    return { success: false, error: 'No recipient email provided', skipped: true };
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('[automation] send_welcome_email: SENDGRID_API_KEY not set — no-op');
    return { success: false, error: 'SENDGRID_API_KEY env var not set', skipped: true };
  }

  // Pull subject/from from site_settings (key 'newsletter' or 'email'); fall back to env / default
  const newsletterSettings =
    (await getSiteSetting<Record<string, unknown>>('newsletter')) ?? {};
  const emailSettings =
    (await getSiteSetting<Record<string, unknown>>('email')) ?? {};
  const welcomeSettings = (newsletterSettings.welcome ?? emailSettings.welcome ?? {}) as Record<
    string,
    unknown
  >;

  const subject =
    (config.subject as string | undefined) ??
    (welcomeSettings.subject as string | undefined) ??
    'أهلاً بك في إكتساد';

  const fromName =
    (config.from_name as string | undefined) ??
    (newsletterSettings.fromName as string | undefined) ??
    (emailSettings.fromName as string | undefined) ??
    'إكتساد';

  const fromEmail =
    (newsletterSettings.fromEmail as string | undefined) ??
    (emailSettings.fromEmail as string | undefined) ??
    process.env.SENDGRID_FROM_EMAIL ??
    'newsletter@iktissad.com';

  // Prefer a custom template HTML stored in site_settings; fall back to default body
  const customHtml = welcomeSettings.html as string | undefined;
  const defaultBody =
    (welcomeSettings.body as string | undefined) ??
    'نشكرك على انضمامك إلى إكتساد أونلاين. سنبقيك على اطلاع بأحدث الأخبار والتحليلات الاقتصادية في المنطقة.';

  const recipientName = subscriber.name as string | undefined;
  const html = customHtml ?? renderWelcomeEmail({
    subject,
    body: defaultBody,
    ctaLabel: welcomeSettings.ctaLabel as string | undefined,
    ctaUrl: welcomeSettings.ctaUrl as string | undefined,
    recipientName,
  });

  try {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: email,
      from: { email: fromEmail, name: fromName },
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runAutomations(
  event: AutomationEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rules } = await (admin as any)
    .from('automation_rules')
    .select('*')
    .eq('enabled', true)
    .eq('trigger_event', event);

  if (!rules || rules.length === 0) return;

  await Promise.allSettled(
    rules.map(async (rule: Record<string, unknown>) => {
      const r = rule as Record<string, unknown>;
      const config = (r.config as Record<string, unknown>) ?? {};
      const actionType = r.action_type as string;
      const automationId = (r.id as string) ?? null;
      const ruleKey = (r.rule_key as string) ?? null;

      let outcome: ActionOutcome = { success: false, error: 'Action not dispatched' };

      try {
        switch (actionType) {
          case 'post_telegram': {
            outcome = await runPostTelegram(admin, config, payload);
            break;
          }
          case 'send_welcome_email': {
            outcome = await runSendWelcomeEmail(config, payload);
            break;
          }
          case 'notify_admin': {
            const notifData = {
              type: 'manual_change' as const,
              title: `تنبيه أتمتة: ${event}`,
              body: `تم تفعيل قاعدة الأتمتة "${r.name}" — ${JSON.stringify(payload).slice(0, 200)}`,
              metadata: { event, payload, rule_key: r.rule_key },
              read_by: [] as string[],
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (admin as any).from('admin_notifications').insert(notifData);
            outcome = error ? { success: false, error: error.message } : { success: true };
            break;
          }
          case 'add_to_featured': {
            const articleId = payload.article_id as string | undefined;
            if (!articleId) {
              outcome = { success: false, error: 'No article_id in payload', skipped: true };
              break;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (admin as any)
              .from('articles')
              .update({ featured: true })
              .eq('id', articleId);
            outcome = error ? { success: false, error: error.message } : { success: true };
            break;
          }
          case 'notify_editor': {
            const articleId = payload.article_id as string | undefined;
            if (!articleId) {
              outcome = { success: false, error: 'No article_id in payload', skipped: true };
              break;
            }
            const notifData = {
              type: 'article_published' as const,
              title: 'طلب مراجعة مقال',
              body: `المقال معلق للمراجعة`,
              metadata: { article_id: articleId, event, rule_key: r.rule_key },
              read_by: [] as string[],
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (admin as any).from('admin_notifications').insert(notifData);
            outcome = error ? { success: false, error: error.message } : { success: true };
            break;
          }
          default: {
            console.warn('[automation] Unknown action type:', actionType);
            outcome = { success: false, error: `Unknown action type: ${actionType}`, skipped: true };
          }
        }
      } catch (err) {
        outcome = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      const status: 'success' | 'failed' | 'skipped' = outcome.success
        ? 'success'
        : outcome.skipped
          ? 'skipped'
          : 'failed';

      if (!outcome.success && !outcome.skipped) {
        console.error('[automation] Action failed:', {
          actionType,
          rule_key: ruleKey,
          error: outcome.error,
        });
      }

      await logRun(admin, {
        automation_id: automationId,
        rule_key: ruleKey,
        event,
        action: actionType,
        status,
        error: outcome.error,
        payload,
      });
    })
  );
}
