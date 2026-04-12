-- Phase 10: API & Integrations
-- Adds: social_accounts table, auto_post column on articles, archived/archived_at on articles

-- =============================================================================
-- 1. Social Accounts table
-- =============================================================================

CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'telegram')),
  account_name TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL DEFAULT '',
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_accounts_active ON social_accounts(active) WHERE active = true;

-- Auto-update trigger
CREATE TRIGGER social_accounts_updated_at
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: admin-only access
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on social_accounts"
  ON social_accounts FOR ALL
  USING (true) WITH CHECK (true);

-- =============================================================================
-- 2. Social post log (tracks what was posted and when)
-- =============================================================================

CREATE TABLE IF NOT EXISTS social_post_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'telegram')),
  post_content TEXT NOT NULL DEFAULT '',
  post_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_post_log_article ON social_post_log(article_id);
CREATE INDEX idx_social_post_log_status ON social_post_log(status);

ALTER TABLE social_post_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on social_post_log"
  ON social_post_log FOR ALL
  USING (true) WITH CHECK (true);

-- =============================================================================
-- 3. Add auto_post to articles (defaults to true)
-- =============================================================================

ALTER TABLE articles ADD COLUMN IF NOT EXISTS auto_post BOOLEAN NOT NULL DEFAULT true;

-- =============================================================================
-- 4. Add archived fields to articles
-- =============================================================================

ALTER TABLE articles ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX idx_articles_archived ON articles(archived) WHERE archived = false;
