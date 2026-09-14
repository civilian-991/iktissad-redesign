-- ---------------------------------------------------------------------------
-- find_similar_articles v2 — build the full-text arm from rare terms only.
--
-- 053 fixed the relevance model but OR'd every title lexeme, so the candidate
-- arm matched 47% of the table and ts_rank scored all of it (202ms, 114k
-- buffers). This selects the 8 rarest title terms instead, dropping anything
-- appearing in more than 3% of the corpus. Same results or better — the Al
-- Rajhi story now surfaces two other Al Rajhi stories — at 69ms / 7.5k buffers.
--
-- Requires article_lexeme_df from 054.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION find_similar_articles(
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
  df_ceiling    INT;
BEGIN
  -- Qualified `a.id`. The pre-053 version used a bare `id` here, which collided
  -- with the OUT parameter of the same name and raised 42702 on EVERY call.
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

  -- Drop any term appearing in more than 3% of the corpus.
  SELECT GREATEST((count(*) * 0.03)::INT, 50) INTO df_ceiling
  FROM articles WHERE status = 'published';

  -- Build the query from the RAREST surviving title terms: those carry the
  -- topic. 'arabic' config to match how search_vector is built (weights A/B) —
  -- a 'simple' query would not match the stored lexemes.
  BEGIN
    SELECT to_tsquery('arabic', string_agg(quote_literal(t.lexeme), ' | '))
      INTO src_query
    FROM (
      SELECT l.lexeme
      FROM unnest(to_tsvector('arabic', coalesce(src_title, ''))) u(lexeme, positions, weights)
      JOIN article_lexeme_df l ON l.lexeme = u.lexeme
      WHERE l.df <= df_ceiling
      ORDER BY l.df ASC
      LIMIT 8
    ) t;
  EXCEPTION WHEN OTHERS THEN
    src_query := NULL;
  END;

  RETURN QUERY
  -- Gather candidates per signal with per-arm LIMITs, so scoring touches at
  -- most ~550 rows rather than the whole table. The section arm is the floor:
  -- every article still gets a full rail, it just no longer gets ONLY that.
  WITH cand AS (
    (SELECT a.id FROM articles a
      WHERE a.status = 'published' AND a.id <> source_article_id
        AND coalesce(cardinality(src_tags), 0) > 0
        AND a.tags && src_tags
      ORDER BY a.published_at DESC NULLS LAST
      LIMIT 200)
    UNION
    (SELECT a.id FROM articles a
      WHERE a.status = 'published' AND a.id <> source_article_id
        AND src_query IS NOT NULL
        AND a.search_vector @@ src_query
      ORDER BY ts_rank(a.search_vector, src_query) DESC
      LIMIT 200)
    UNION
    (SELECT a.id FROM articles a
      WHERE a.status = 'published' AND a.id <> source_article_id
        AND src_sector IS NOT NULL AND a.sector_id = src_sector
      ORDER BY a.published_at DESC NULLS LAST
      LIMIT 100)
    UNION
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
          -- Title/excerpt overlap; flag 32 => rank/(rank+1), normalised to 0..1
        + 0.30 * coalesce(ts_rank(a.search_vector, src_query, 32), 0)
          -- Same country
        + 0.10 * (CASE WHEN src_countries IS NOT NULL AND EXISTS (
                    SELECT 1 FROM article_countries ac
                    WHERE ac.article_id = a.id AND ac.country_id = ANY(src_countries)
                  ) THEN 1 ELSE 0 END)
          -- Filing, as weak tiebreakers rather than the whole answer
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
  'Topical related-articles ranking: tag overlap + full-text overlap on rare title terms + country, with sector/section as weak tiebreakers and a mild freshness term. Scores in SQL so ORDER BY can see the score.';
