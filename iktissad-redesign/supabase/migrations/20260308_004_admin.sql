CREATE TYPE admin_role AS ENUM ('super_admin', 'editor', 'writer', 'finance', 'advertiser_manager');
CREATE TYPE notification_type AS ENUM (
  'new_subscriber', 'payment_failed', 'subscription_canceled',
  'comment_flagged', 'article_published', 'manual_change'
);

CREATE TABLE admin_roles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'writer',
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES users(id),
  two_fa_enabled BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  resource_id TEXT,
  is_read BOOLEAN DEFAULT false,
  read_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_notifications_unread ON admin_notifications(is_read) WHERE is_read = false;

-- Enable realtime for live dashboard
ALTER TABLE admin_notifications REPLICA IDENTITY FULL;
ALTER TABLE subscribers REPLICA IDENTITY FULL;
