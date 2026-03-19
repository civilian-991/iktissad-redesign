-- =============================================================================
-- Phase 9.4 — Semantic Search Upgrade
-- Adds full-text search vector + embedding placeholder + hybrid search function
-- =============================================================================

-- Enable pgvector extension (available on all Supabase projects)
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

-- Weighted tsvector for fast full-text search (Arabic + English)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Placeholder for future real vector embeddings (1536-dim = OpenAI / Cohere compatible)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- GIN index for tsvector @@ operator
CREATE INDEX IF NOT EXISTS articles_search_vector_idx
  ON articles USING GIN(search_vector);

-- IVFFlat cosine-similarity index for embedding column
-- lists=100 is a safe default for up to ~1 M rows; tune after data grows
CREATE INDEX IF NOT EXISTS articles_embedding_idx
  ON articles USING ivfflat(embedding vector_cosine_ops)
  WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- Populate search_vector for all existing articles
-- ---------------------------------------------------------------------------

UPDATE articles
SET search_vector = (
  setweight(to_tsvector('arabic', coalesce(title,      '')), 'A') ||
  setweight(to_tsvector('arabic', coalesce(excerpt,    '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(title_en,   '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(excerpt_en, '')), 'D')
);

-- ---------------------------------------------------------------------------
-- Trigger: keep search_vector in sync on every INSERT / UPDATE
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_article_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := (
    setweight(to_tsvector('arabic', coalesce(NEW.title,      '')), 'A') ||
    setweight(to_tsvector('arabic', coalesce(NEW.excerpt,    '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.title_en,   '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.excerpt_en, '')), 'D')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_search_vector_trigger ON articles;

CREATE TRIGGER articles_search_vector_trigger
  BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_article_search_vector();

-- ---------------------------------------------------------------------------
-- Hybrid search function
-- Combines weighted full-text ranking (ts_rank) with ILIKE fallback
-- Supports both Arabic websearch syntax and simple keyword fallback
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION search_articles_hybrid(
  query_text   TEXT,
  article_limit INT  DEFAULT 10,
  offset_val   INT  DEFAULT 0
)
RETURNS TABLE(
  id           UUID,
  title        TEXT,
  excerpt      TEXT,
  slug         TEXT,
  published_at TIMESTAMPTZ,
  rank         FLOAT4
)
LANGUAGE plpgsql
AS $$
DECLARE
  tsq tsquery;
BEGIN
  -- Build a tsquery, preferring websearch syntax (handles phrases, Arabic well).
  -- Fall back to simple AND-joined tokens if the query can't be parsed.
  BEGIN
    tsq := websearch_to_tsquery('arabic', query_text);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      tsq := to_tsquery('simple', regexp_replace(trim(query_text), '\s+', ' & ', 'g'));
    EXCEPTION WHEN OTHERS THEN
      tsq := NULL;
    END;
  END;

  IF tsq IS NOT NULL THEN
    RETURN QUERY
    SELECT
      a.id,
      a.title,
      a.excerpt,
      a.slug,
      a.published_at,
      ts_rank(a.search_vector, tsq) AS rank
    FROM articles a
    WHERE
      a.status = 'published'
      AND (
        a.search_vector @@ tsq
        OR a.title    ILIKE '%' || query_text || '%'
        OR a.excerpt  ILIKE '%' || query_text || '%'
        OR a.title_en ILIKE '%' || query_text || '%'
      )
    ORDER BY rank DESC, a.published_at DESC
    LIMIT  article_limit
    OFFSET offset_val;
  ELSE
    -- Pure ILIKE fallback when tsquery construction completely fails
    RETURN QUERY
    SELECT
      a.id,
      a.title,
      a.excerpt,
      a.slug,
      a.published_at,
      0.0::FLOAT4 AS rank
    FROM articles a
    WHERE
      a.status = 'published'
      AND (
        a.title      ILIKE '%' || query_text || '%'
        OR a.excerpt ILIKE '%' || query_text || '%'
        OR a.title_en ILIKE '%' || query_text || '%'
      )
    ORDER BY a.published_at DESC
    LIMIT  article_limit
    OFFSET offset_val;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helper function: find articles similar to a given article
-- Uses section + sector overlap scored together with basic ts_rank similarity
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION find_similar_articles(
  source_article_id UUID,
  result_limit      INT DEFAULT 5
)
RETURNS TABLE(
  id           UUID,
  title        TEXT,
  excerpt      TEXT,
  slug         TEXT,
  published_at TIMESTAMPTZ,
  similarity   FLOAT4
)
LANGUAGE plpgsql
AS $$
DECLARE
  src_section  UUID;
  src_sector   UUID;
  src_vector   tsvector;
BEGIN
  SELECT section_id, sector_id, search_vector
  INTO   src_section, src_sector, src_vector
  FROM   articles
  WHERE  id = source_article_id;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.excerpt,
    a.slug,
    a.published_at,
    (
      -- Section match bonus
      CASE WHEN a.section_id = src_section THEN 0.4 ELSE 0.0 END +
      -- Sector match bonus
      CASE WHEN a.sector_id  = src_sector  THEN 0.3 ELSE 0.0 END +
      -- Full-text overlap score (0–1 range via ts_rank normalisation flag 32)
      COALESCE(
        ts_rank(a.search_vector, to_tsquery('simple', 'placeholder'), 32),
        0.0
      )
    )::FLOAT4 AS similarity
  FROM articles a
  WHERE
    a.status = 'published'
    AND a.id <> source_article_id
    AND (
      a.section_id = src_section
      OR a.sector_id  = src_sector
    )
  ORDER BY similarity DESC, a.published_at DESC
  LIMIT result_limit;
END;
$$;
