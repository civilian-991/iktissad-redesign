-- ============================================================================
-- Migration: 010 — Performance Indexes
-- Adds composite and targeted indexes identified from API query audit.
-- All statements are idempotent (CREATE INDEX IF NOT EXISTS).
-- DO NOT drop or modify any existing indexes.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────
-- ARTICLES
-- ──────────────────────────────────────────────────────────────

-- Used by: GET /api/articles — primary list query filtered by status and
-- ordered by published_at DESC. Without a composite index Postgres must
-- apply a post-filter sort on the single-column idx_articles_status index.
CREATE INDEX IF NOT EXISTS idx_articles_status_published_at
  ON articles (status, published_at DESC NULLS LAST);

-- Used by: GET /api/articles?section=<slug> — after resolving the section
-- slug to an ID, the article list is then filtered on (section_id, status)
-- and sorted by published_at DESC. Covers the three-column predicate.
CREATE INDEX IF NOT EXISTS idx_articles_section_status_published_at
  ON articles (section_id, status, published_at DESC NULLS LAST);

-- Used by: GET /api/articles?sector=<slug> — same pattern as section.
CREATE INDEX IF NOT EXISTS idx_articles_sector_status_published_at
  ON articles (sector_id, status, published_at DESC NULLS LAST);

-- Used by: GET /api/articles?country=<slug> — same pattern.
CREATE INDEX IF NOT EXISTS idx_articles_country_status_published_at
  ON articles (country_id, status, published_at DESC NULLS LAST);

-- Used by: admin article lists filtered by author_id with status checks.
-- Existing idx_articles_author only covers author_id; this adds status to
-- avoid a second filter pass.
CREATE INDEX IF NOT EXISTS idx_articles_author_status
  ON articles (author_id, status);

-- Note: slug already has a UNIQUE constraint which creates an implicit index.
-- idx_articles_slug from schema.sql also exists — no duplication needed.

-- ──────────────────────────────────────────────────────────────
-- ARTICLE READS (analytics table)
-- ──────────────────────────────────────────────────────────────
-- Existing indexes: idx_article_reads_article (article_id),
--                   idx_article_reads_session (session_id),
--                   idx_article_reads_created (created_at DESC)

-- Used by: POST /api/analytics/read — rate-limit check queries
-- (session_id, created_at) to count daily reads per session.
-- The existing idx_article_reads_session covers session_id alone but
-- combining with created_at avoids a separate sort/filter step.
CREATE INDEX IF NOT EXISTS idx_article_reads_session_created
  ON article_reads (session_id, created_at DESC);

-- Used by: POST /api/analytics/read — upsert dedup check on
-- (article_id, session_id). Composite index covers both eq filters in one scan.
CREATE INDEX IF NOT EXISTS idx_article_reads_article_session
  ON article_reads (article_id, session_id);

-- Used by: GET /api/analytics/active — counts rows WHERE created_at >= now()-5min.
-- The existing idx_article_reads_created already covers this; no new index needed.

-- ──────────────────────────────────────────────────────────────
-- MAGAZINE SPREAD READS (analytics table)
-- ──────────────────────────────────────────────────────────────

-- Used by: POST /api/analytics/spreads (inserts) and
--          GET /api/admin/reading-analytics (aggregate by spread_number).
-- No indexes existed on this table in migration 003.
CREATE INDEX IF NOT EXISTS idx_magazine_spread_reads_issue
  ON magazine_spread_reads (issue_id);

CREATE INDEX IF NOT EXISTS idx_magazine_spread_reads_created
  ON magazine_spread_reads (created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- MAGAZINE ARTICLES (junction table)
-- ──────────────────────────────────────────────────────────────
-- Composite PK (magazine_id, article_id) covers lookups by magazine_id
-- but not by article_id alone. Add reverse index for article→magazine lookups.
CREATE INDEX IF NOT EXISTS idx_magazine_articles_article_id
  ON magazine_articles (article_id);

-- Used by: magazine content queries ordered by sort_order within an issue.
CREATE INDEX IF NOT EXISTS idx_magazine_articles_issue_sort
  ON magazine_articles (magazine_id, sort_order);

-- ──────────────────────────────────────────────────────────────
-- NEWSLETTER SUBSCRIBERS
-- ──────────────────────────────────────────────────────────────
-- Existing index: idx_newsletter_email (email).
-- Used by: admin subscriber list queries filtered by status,
-- ordered/paginated by subscribed_at DESC.
CREATE INDEX IF NOT EXISTS idx_newsletter_status_subscribed_at
  ON newsletter_subscribers (status, subscribed_at DESC);

-- ──────────────────────────────────────────────────────────────
-- SUBSCRIBERS (subscription service)
-- ──────────────────────────────────────────────────────────────
-- Existing indexes: idx_subscribers_status, idx_subscribers_plan,
--                   idx_subscribers_email, idx_subscribers_created.

-- Used by: revenue analytics — canceled_at filter for churn calculations.
CREATE INDEX IF NOT EXISTS idx_subscribers_canceled_at
  ON subscribers (canceled_at DESC)
  WHERE canceled_at IS NOT NULL;

-- Used by: revenue analytics — (status, plan_id) for plan distribution query.
CREATE INDEX IF NOT EXISTS idx_subscribers_status_plan
  ON subscribers (status, plan_id);

-- ──────────────────────────────────────────────────────────────
-- ARTICLES full-text search (GIN index for ilike queries)
-- ──────────────────────────────────────────────────────────────
-- Used by: GET /api/search — does ilike '%…%' across title, title_en,
-- excerpt, excerpt_en. GIN trigram index makes these O(log n) instead of
-- sequential scan. Requires the pg_trgm extension.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_articles_title_trgm
  ON articles USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_articles_title_en_trgm
  ON articles USING GIN (title_en gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_articles_excerpt_trgm
  ON articles USING GIN (excerpt gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_articles_excerpt_en_trgm
  ON articles USING GIN (excerpt_en gin_trgm_ops);
