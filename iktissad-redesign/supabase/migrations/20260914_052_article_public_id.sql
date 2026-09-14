-- ---------------------------------------------------------------------------
-- Short public article id — the shareable `/a/<id>` link
--
-- Arabic slugs average 55 characters, and every Arabic character costs 6
-- characters of percent-encoding (%D8%AD). A typical article URL therefore
-- serialises to ~330 characters, the longest to ~830. That is unusable in
-- plain text: email, SMS, print, QR codes.
--
-- `public_id` gives every article a short stable number so /a/24213 can 301 to
-- the canonical Arabic slug, which stays the indexed URL.
--
-- Why not reuse `source_id`: 27,887 of 28,374 rows carry one, but only 21,907
-- are distinct — Drupal and awalan numbered their articles independently, so
-- source_id is unique only as (source_site, source_id).
-- ---------------------------------------------------------------------------

ALTER TABLE articles ADD COLUMN IF NOT EXISTS public_id BIGINT;

-- Backfill in publication order so the oldest article gets the lowest number.
-- Starts at 10,000 so every id is the same width and reads like a real
-- publication counter rather than /a/1.
WITH numbered AS (
  SELECT id,
         9999 + ROW_NUMBER() OVER (
           ORDER BY COALESCE(published_at, created_at), created_at, id
         ) AS n
  FROM articles
  WHERE public_id IS NULL
)
UPDATE articles a
SET    public_id = numbered.n
FROM   numbered
WHERE  a.id = numbered.id;

-- Own sequence rather than an identity column: adding an identity to a
-- populated table assigns values in physical order, which would scramble the
-- chronological numbering above.
CREATE SEQUENCE IF NOT EXISTS articles_public_id_seq AS BIGINT OWNED BY articles.public_id;

SELECT setval(
  'articles_public_id_seq',
  GREATEST((SELECT COALESCE(MAX(public_id), 9999) FROM articles), 9999)
);

ALTER TABLE articles
  ALTER COLUMN public_id SET DEFAULT nextval('articles_public_id_seq'),
  ALTER COLUMN public_id SET NOT NULL;

-- Unique + the lookup index for /a/<id> in one constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_public_id ON articles (public_id);

COMMENT ON COLUMN articles.public_id IS
  'Short public id for the shareable /a/<id> URL. Immutable once assigned — '
  'shared links and print references depend on it. Never recycle.';
