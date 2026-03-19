-- Phase 8: Outgoing Webhooks + Automation Rules

-- Webhook endpoints configured by admin
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery log for each webhook invocation
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  success BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automation rules (pre-built rule templates with on/off toggle)
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  action_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default automation rules
INSERT INTO automation_rules (rule_key, name, description, trigger_event, action_type, config, enabled)
VALUES
  (
    'article_published_telegram',
    'نشر المقال على تيليغرام',
    'عند نشر مقال جديد، يتم إرسال ملخص إلى قناة تيليغرام',
    'article.published',
    'post_telegram',
    '{"channel_id": "", "include_excerpt": true}',
    false
  ),
  (
    'subscriber_welcome_email',
    'بريد الترحيب بالمشترك الجديد',
    'عند تسجيل مشترك جديد، يتم إرسال رسالة ترحيب',
    'subscriber.created',
    'send_welcome_email',
    '{"template": "welcome", "from_name": "إقتصاد"}',
    false
  ),
  (
    'payment_failed_notify',
    'إشعار فشل الدفع',
    'عند فشل الدفع، يتم إشعار مدير المالية وتعليم المشترك',
    'payment.failed',
    'notify_admin',
    '{"role": "finance", "flag_subscriber": true}',
    false
  ),
  (
    'article_high_views_featured',
    'إضافة المقال الرائج إلى القائمة المميزة',
    'عند وصول المقال إلى 10000 مشاهدة، يتم إضافته إلى القائمة المميزة',
    'article.high_views',
    'add_to_featured',
    '{"views_threshold": 10000}',
    false
  ),
  (
    'article_review_notify_editor',
    'إشعار المحرر عند بدء المراجعة',
    'عند دخول المقال في مرحلة المراجعة، يتم إشعار المحرر المعين',
    'article.review',
    'notify_editor',
    '{"notification_type": "review_request"}',
    false
  )
ON CONFLICT (rule_key) DO NOTHING;
