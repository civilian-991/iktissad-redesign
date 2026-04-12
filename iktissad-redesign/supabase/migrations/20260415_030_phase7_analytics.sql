-- Phase 7: Analytics & Insights
-- Tables: headline_tests, share_events
-- Plus indexes on article_reads for real-time dashboard queries

-- ═══════════════════════════════════════════════════════════════
-- 1) headline_tests — A/B headline testing
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS headline_tests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id    UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  variants      JSONB NOT NULL DEFAULT '[]',
    -- Array of { title: string, impressions: int, clicks: int }
  status        TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'paused')),
  winner_index  INT,
  min_sample    INT NOT NULL DEFAULT 1000,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_headline_tests_article_id ON headline_tests(article_id);
CREATE INDEX IF NOT EXISTS idx_headline_tests_status ON headline_tests(status);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_headline_tests_updated_at
  BEFORE UPDATE ON headline_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE headline_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on headline_tests"
  ON headline_tests FOR ALL
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 2) share_events — Social sharing analytics
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS share_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'whatsapp', 'facebook', 'telegram', 'copy_link', 'email')),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_events_article_id ON share_events(article_id);
CREATE INDEX IF NOT EXISTS idx_share_events_platform ON share_events(platform);
CREATE INDEX IF NOT EXISTS idx_share_events_created_at ON share_events(created_at DESC);

-- RLS
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert on share_events"
  ON share_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role full access on share_events"
  ON share_events FOR ALL
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 3) Optimize article_reads for real-time dashboard queries
-- ═══════════════════════════════════════════════════════════════

-- Index for "reads in last N minutes" queries (realtime dashboard)
CREATE INDEX IF NOT EXISTS idx_article_reads_created_at_desc
  ON article_reads(created_at DESC);

-- Index for reading_sessions too (used for paywall + analytics)
CREATE INDEX IF NOT EXISTS idx_reading_sessions_created_at_desc
  ON reading_sessions(created_at DESC);
