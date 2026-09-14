-- ---------------------------------------------------------------------------
-- search_articles_hybrid: build the fallback tsquery with 'arabic', not 'simple'.
--
-- search_vector stems title/excerpt with the 'arabic' config (migration 020,
-- weights A/B). The fallback branch used 'simple', where "الشركات" matches 0 of
-- 27,988 published articles — against 7,284 under 'arabic'. Any Arabic word
-- carrying the definite article or an inflection returns nothing.
--
-- Low blast radius today: the fallback only fires if websearch_to_tsquery
-- throws, which it almost never does, and the surrounding query still ORs ILIKE
-- branches. But when it does fire, the full-text half of "hybrid" contributes
-- nothing at all.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_articles_hybrid(
  query_text    text,
  article_limit integer DEFAULT 10,
  offset_val    integer DEFAULT 0
)
RETURNS TABLE(id uuid, title text, excerpt text, slug text, published_at timestamp with time zone, rank real)
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE tsq tsquery;
BEGIN
  BEGIN
    tsq := websearch_to_tsquery('arabic', query_text);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      -- 'arabic', to match how search_vector is built.
      tsq := to_tsquery('arabic', regexp_replace(trim(query_text), '\s+', ' & ', 'g'));
    EXCEPTION WHEN OTHERS THEN
      tsq := NULL;
    END;
  END;

  IF tsq IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.title, a.excerpt, a.slug, a.published_at,
           ts_rank(a.search_vector, tsq) AS rank
    FROM articles a
    WHERE a.status = 'published'
      AND (a.search_vector @@ tsq
           OR a.title    ILIKE '%' || query_text || '%'
           OR a.excerpt  ILIKE '%' || query_text || '%'
           OR a.title_en ILIKE '%' || query_text || '%')
    ORDER BY rank DESC, a.published_at DESC
    LIMIT article_limit OFFSET offset_val;
  ELSE
    RETURN QUERY
    SELECT a.id, a.title, a.excerpt, a.slug, a.published_at, 0.0::FLOAT4 AS rank
    FROM articles a
    WHERE a.status = 'published'
      AND (a.title ILIKE '%' || query_text || '%'
           OR a.excerpt ILIKE '%' || query_text || '%'
           OR a.title_en ILIKE '%' || query_text || '%')
    ORDER BY a.published_at DESC
    LIMIT article_limit OFFSET offset_val;
  END IF;
END;
$function$;
