-- =============================================================================
-- Phase 5 — AI & Automation Enhancements
-- Adds article summary columns and related article cache
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 5.3: AI Article Summaries — Arabic + English summary fields
-- ---------------------------------------------------------------------------

ALTER TABLE articles ADD COLUMN IF NOT EXISTS summary     TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS summary_en  TEXT;

-- Index to quickly find articles that still need summaries (NULL = not generated yet)
CREATE INDEX IF NOT EXISTS articles_summary_null_idx
  ON articles (id)
  WHERE summary IS NULL AND status = 'published';

-- ---------------------------------------------------------------------------
-- 5.2: Related articles cache table
-- Stores top-5 related article IDs per article, refreshed on publish.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS article_related (
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  related_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  score       FLOAT4 NOT NULL DEFAULT 0,
  position    SMALLINT NOT NULL DEFAULT 0,  -- 1-5 ordering
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, related_id)
);

CREATE INDEX IF NOT EXISTS article_related_article_idx ON article_related (article_id, position);

-- Enable RLS (read-only for anon, write via service role)
ALTER TABLE article_related ENABLE ROW LEVEL SECURITY;

CREATE POLICY "article_related_select"
  ON article_related FOR SELECT
  USING (true);
