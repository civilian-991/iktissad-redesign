-- Migration columns for data import from iktissadonline.com (Drupal 7) and awalan.com (.NET)
-- These columns support the A-Z migration pipeline (scripts/migration/)

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS source_site    TEXT,          -- 'iktissad' | 'awalan'
  ADD COLUMN IF NOT EXISTS source_id      INT,           -- original nid / article.Id
  ADD COLUMN IF NOT EXISTS legacy_url     TEXT,          -- original URL for 301 redirects
  ADD COLUMN IF NOT EXISTS is_breaking    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS editor_choice  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_paid        BOOLEAN NOT NULL DEFAULT false;

-- Index for redirect lookups
CREATE INDEX IF NOT EXISTS idx_articles_legacy_url   ON articles (legacy_url) WHERE legacy_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_source       ON articles (source_site, source_id) WHERE source_site IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_source_unique ON articles (source_site, source_id) WHERE source_site IS NOT NULL;
