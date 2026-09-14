-- ---------------------------------------------------------------------------
-- Rebuild find_similar_articles() around actual topical relevance.
--
-- The previous version threw on EVERY call:
--
--   ERROR 42702: column reference "id" is ambiguous
--   QUERY: SELECT section_id, sector_id FROM articles WHERE id = source_article_id
--
-- RETURNS TABLE(id uuid, …) declares an OUT parameter named `id`, which the
-- body's unqualified `WHERE id = …` could not be told apart from articles.id.
-- src/lib/ai/keyword-search.ts caught the error and silently fell through to a
-- query that ordered by published_at and truncated with LIMIT *before* scoring,
-- so section/sector never influenced selection — "related" meant "newest in the
-- same section", drawn from buckets as coarse as عالم الشركات (6,507 articles).
--
-- Measured: the Al Rajhi banking story returned four articles all scoring 0.4
-- (section-only, zero in مال ومصارف) while 3,751 same-sector articles existed.
--
-- This version scores in SQL, where the ORDER BY can actually see the score,
-- and ranks on signals that describe the article rather than its filing:
--   tag overlap (71% of published articles carry tags, avg 2.1)
--   full-text overlap on title+excerpt (search_vector: 100% coverage)
--   shared country, then sector and section as weak tiebreakers
--   a mild freshness term so a 2015 match cannot outrank this month's
--
-- Candidates are gathered per-signal with per-arm LIMITs so scoring touches at
-- most ~550 rows instead of the whole table. The section arm is the floor: an
-- article with a section always gets a rail, it just no longer gets ONLY that.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS find_similar_articles(uuid, integer);

CREATE FUNCTION find_similar_articles(
  source_article_id UUID,
  result_limit      INT DEFAULT 5
)
RETURNS TABLE(
  id             UUID,
  title          TEXT,
  excerpt        TEXT,
  slug           TEXT,
  featured_image TEXT,
  section        TEXT,
  sector         TEXT,
  published_at   TIMESTAMPTZ,
  similarity     REAL
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  src_title     TEXT;
  src_section   UUID;
  src_sector    UUID;
  src_tags      TEXT[];
  src_countries UUID[];
  src_query     tsquery;
BEGIN
  -- Qualified `a.id` — this is the line that used to raise 42702.
  SELECT a.title, a.section_id, a.sector_id, a.tags
    INTO src_title, src_section, src_sector, src_tags
  FROM articles a
  WHERE a.id = source_article_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT array_agg(ac.country_id)
    INTO src_countries
  FROM article_countries ac
  WHERE ac.article_id = source_article_id;

  -- Build an OR-of-lexemes query from the source title. Must use the 'arabic'
  -- config: search_vector stems title/excerpt with 'arabic' (weights A/B), so a
  -- 'simple' query would not match the stored lexemes.
  BEGIN
    SELECT to_tsquery('arabic', string_agg(quote_literal(t.lexeme), ' | '))
      INTO src_query
    FROM (
      SELECT lexeme
      FROM unnest(to_tsvector('arabic', coalesce(src_title, '')))
      LIMIT 30
    ) t;
  EXCEPTION WHEN OTHERS THEN
    src_query := NULL;
  END;

  RETURN QUERY
  WITH cand AS (
    -- Shared tags
    (SELECT a.id FROM articles a
      WHERE a.status = 'published' AND a.id <> source_article_id
        AND coalesce(cardinality(src_tags), 0) > 0
        AND a.tags && src_tags
      ORDER BY a.published_at DESC NULLS LAST
      LIMIT 200)
    UNION
    -- Full-text overlap
    (SELECT a.id FROM articles a
      WHERE a.status = 'published' AND a.id <> source_article_id
        AND src_query IS NOT NULL
        AND a.search_vector @@ src_query
      ORDER BY ts_rank(a.search_vector, src_query) DESC
      LIMIT 200)
    UNION
    -- Same sector
    (SELECT a.id FROM articles a
      WHERE a.status = 'published' AND a.id <> source_article_id
        AND src_sector IS NOT NULL AND a.sector_id = src_sector
      ORDER BY a.published_at DESC NULLS LAST
      LIMIT 100)
    UNION
    -- Same section — the floor, so no article ends up with an empty rail
    (SELECT a.id FROM articles a
      WHERE a.status = 'published' AND a.id <> source_article_id
        AND src_section IS NOT NULL AND a.section_id = src_section
      ORDER BY a.published_at DESC NULLS LAST
      LIMIT 50)
  ),
  scored AS (
    SELECT
      a.id             AS a_id,
      a.title          AS a_title,
      a.excerpt        AS a_excerpt,
      a.slug           AS a_slug,
      a.featured_image AS a_image,
      sec.name         AS a_section,
      sct.name         AS a_sector,
      a.published_at   AS a_published,
      (
          -- Shared tags, saturating at 3 — the strongest available signal
          0.45 * LEAST(
            cardinality(ARRAY(SELECT unnest(a.tags) INTERSECT SELECT unnest(src_tags))),
            3
          ) / 3.0
          -- Title/excerpt overlap, normalisation flag 32 => rank/(rank+1), 0..1
        + 0.30 * coalesce(ts_rank(a.search_vector, src_query, 32), 0)
          -- Same country
        + 0.10 * (CASE WHEN src_countries IS NOT NULL AND EXISTS (
                    SELECT 1 FROM article_countries ac
                    WHERE ac.article_id = a.id AND ac.country_id = ANY(src_countries)
                  ) THEN 1 ELSE 0 END)
        + 0.07 * (CASE WHEN a.sector_id  IS NOT NULL AND a.sector_id  = src_sector  THEN 1 ELSE 0 END)
        + 0.03 * (CASE WHEN a.section_id IS NOT NULL AND a.section_id = src_section THEN 1 ELSE 0 END)
          -- Mild freshness: ~0.05 today, ~0.018 at a year, ~0.007 at two
        + 0.05 * coalesce(
            exp(-GREATEST(EXTRACT(EPOCH FROM (now() - a.published_at)), 0) / (86400 * 365.0)),
            0)
      )::REAL AS a_score
    FROM articles a
    JOIN cand ON cand.id = a.id
    LEFT JOIN sections sec ON sec.id = a.section_id
    LEFT JOIN sectors  sct ON sct.id = a.sector_id
  )
  SELECT
    s.a_id,
    s.a_title,
    coalesce(s.a_excerpt, ''),
    s.a_slug,
    coalesce(s.a_image, ''),
    coalesce(s.a_section, ''),
    coalesce(s.a_sector, ''),
    s.a_published,
    s.a_score
  FROM scored s
  ORDER BY s.a_score DESC, s.a_published DESC NULLS LAST
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION find_similar_articles(uuid, integer) IS
  'Topical "related articles" ranking: tag overlap + full-text overlap + country, '
  'with sector/section as weak tiebreakers and a mild freshness term. Scores in '
  'SQL so ORDER BY can see the score — the previous version truncated by recency '
  'before scoring, which made section/sector decorative.';
