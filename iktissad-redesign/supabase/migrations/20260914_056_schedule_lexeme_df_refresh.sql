-- ---------------------------------------------------------------------------
-- Keep article_lexeme_df (054) current.
--
-- Nothing refreshed it after the initial build, and staleness is invisible:
-- terms coined since the last build are simply absent from the view, so they
-- drop out of find_similar_articles()' term selection and the newest stories
-- quietly get worse related articles. It never errors, so it would have rotted
-- silently.
--
-- 03:20 UTC daily, off the publishing peak. CONCURRENTLY so readers are never
-- blocked — that requires the unique index created in 054.
-- ---------------------------------------------------------------------------

SELECT cron.schedule(
  'refresh-article-lexeme-df',
  '20 3 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.article_lexeme_df$$
);
