-- ---------------------------------------------------------------------------
-- Document frequency per lexeme — lets find_similar_articles() build its
-- full-text query from the RARE words in a headline instead of all of them.
--
-- Migration 053 OR'd every title lexeme together. Measured on one headline that
-- matched 13,282 of 27,988 published articles (47% of the table), because common
-- words pull in thousands of rows each — the single worst lexeme in this corpus
-- appears in 20,281 articles (72%). ORDER BY ts_rank then had to score every
-- match: 113,791 buffer hits, 202ms per call.
--
-- With this view feeding term selection (see 055): 7,525 buffers, 69ms.
--
-- ts_stat executes its argument with its own search_path, so `articles` must be
-- schema-qualified inside the string.
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS article_lexeme_df AS
SELECT word AS lexeme, ndoc AS df
FROM ts_stat('SELECT search_vector FROM public.articles WHERE status = ''published''')
WHERE ndoc > 1;

-- Unique index is required for REFRESH ... CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS article_lexeme_df_lexeme_idx
  ON article_lexeme_df (lexeme);

COMMENT ON MATERIALIZED VIEW article_lexeme_df IS
  'Per-lexeme document frequency over published articles. Feeds term selection in find_similar_articles(). Rebuild with REFRESH MATERIALIZED VIEW CONCURRENTLY article_lexeme_df nightly or weekly — stale counts only shift term selection slightly, they never break the query.';
