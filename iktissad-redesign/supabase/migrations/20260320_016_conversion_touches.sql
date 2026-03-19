-- Phase 5.2: Revenue Attribution — conversion touches
-- Tracks which articles a subscriber read before converting (subscribing)

CREATE TABLE IF NOT EXISTS conversion_touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  session_id TEXT,
  touch_position INTEGER DEFAULT 1, -- 1 = first touch, N = last touch before conversion
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversion_touches_article_idx ON conversion_touches(article_id);
CREATE INDEX IF NOT EXISTS conversion_touches_subscriber_idx ON conversion_touches(subscriber_id);
CREATE INDEX IF NOT EXISTS conversion_touches_created_idx ON conversion_touches(created_at DESC);

-- RLS
ALTER TABLE conversion_touches ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "Admin read conversion_touches" ON conversion_touches
  FOR SELECT TO authenticated USING (true);

-- Service role can insert
CREATE POLICY "Service insert conversion_touches" ON conversion_touches
  FOR INSERT TO service_role WITH CHECK (true);
