-- Migration 051: Multi-country articles
-- An article can now be filed under several countries instead of exactly one.
--
-- `articles.country_id` is KEPT as the *primary* country: it still feeds every
-- existing embed (`countries:country_id ( slug, name )`) used by cards, feeds
-- and the editor, so nothing that reads it breaks. The new `article_countries`
-- join table is the authoritative *set*, and it is what country pages, country
-- RSS feeds and the per-country article counts filter on — so an article filed
-- under 3 countries appears on all 3.
--
-- Existing rows are backfilled from country_id, and a trigger keeps legacy
-- writers (rebuild scripts, the n8n newsroom pipeline) that only set country_id
-- working: whatever they write as the primary is inserted into the set too.
-- The trigger only ever inserts — it never deletes an editor's selection.

CREATE TABLE IF NOT EXISTS article_countries (
  article_id UUID NOT NULL REFERENCES articles(id)  ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  position   INT  NOT NULL DEFAULT 0,   -- 0 = primary (mirrors articles.country_id)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, country_id)
);

-- article_id is covered by the PK's leading column; country_id needs its own
-- index for the "all articles in country X" direction.
CREATE INDEX IF NOT EXISTS idx_article_countries_country ON article_countries (country_id);

ALTER TABLE article_countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read article_countries" ON article_countries;
CREATE POLICY "Public read article_countries" ON article_countries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access article_countries" ON article_countries;
CREATE POLICY "Admin full access article_countries" ON article_countries FOR ALL USING (true) WITH CHECK (true);

-- ── Backfill from the existing single country ───────────────────────────────
INSERT INTO article_countries (article_id, country_id, position)
SELECT id, country_id, 0 FROM articles WHERE country_id IS NOT NULL
ON CONFLICT (article_id, country_id) DO NOTHING;

-- ── Keep the primary country present in the set ─────────────────────────────
-- Insert-only on purpose: a writer that sets country_id (legacy scripts, the
-- newsroom pipeline) gets its country added to the set, but an editor's
-- multi-country selection is never pruned behind their back.
CREATE OR REPLACE FUNCTION sync_article_primary_country()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.country_id IS NOT NULL THEN
    INSERT INTO article_countries (article_id, country_id, position)
    VALUES (NEW.id, NEW.country_id, 0)
    ON CONFLICT (article_id, country_id) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_primary_country ON articles;
CREATE TRIGGER sync_primary_country
  AFTER INSERT OR UPDATE OF country_id ON articles
  FOR EACH ROW EXECUTE FUNCTION sync_article_primary_country();

-- ── Per-country published counts ────────────────────────────────────────────
-- Replaces the old JS-side tally in GET /api/countries, which pulled every
-- published article's country_id (~20k rows) over the wire on each call.
CREATE OR REPLACE FUNCTION country_article_counts()
RETURNS TABLE (country_id uuid, article_count bigint)
LANGUAGE sql STABLE AS $$
  SELECT ac.country_id, count(*)::bigint
  FROM article_countries ac
  JOIN articles a ON a.id = ac.article_id
  WHERE a.status = 'published' AND a.archived = false
  GROUP BY ac.country_id;
$$;
