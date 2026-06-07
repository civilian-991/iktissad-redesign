-- Migration 047: Tags vocabulary + management
-- Adds a managed `tags` table — the master list powering autocomplete in the
-- article editor and the /admin/tags CRUD screen. The tag *name* is the
-- identity: it is the literal token stored in articles.tags (TEXT[]) and the
-- value used by the public /tags/[tag] page (/api/articles?tag=<name>). So the
-- table is seeded from every distinct value already present in articles.tags,
-- and NO existing article data is mutated. `slug` is a convenience for SEO/links
-- only and is non-unique (near-duplicate Arabic names are common).

CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,           -- canonical token; == value in articles.tags
  name_en     TEXT NOT NULL DEFAULT '',
  slug        TEXT NOT NULL DEFAULT '',       -- convenience slug (non-unique)
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags (slug);
-- Speeds the per-tag usage counts and rename/delete propagation (tags @> ARRAY[name]).
CREATE INDEX IF NOT EXISTS idx_articles_tags_gin ON articles USING GIN (tags);

DROP TRIGGER IF EXISTS set_updated_at ON tags;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tags" ON tags;
CREATE POLICY "Public read tags" ON tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access tags" ON tags;
CREATE POLICY "Admin full access tags" ON tags FOR ALL USING (true) WITH CHECK (true);

-- ── RPC: search tags with live usage counts ────────────────────────────────
-- Counts are computed only for the (small) returned page, so this stays fast
-- even with thousands of tags. GIN index serves `tags @> ARRAY[name]`.
CREATE OR REPLACE FUNCTION search_tags(
  search TEXT DEFAULT '',
  lim    INT  DEFAULT 50,
  off    INT  DEFAULT 0
)
RETURNS TABLE (
  id uuid, name text, name_en text, slug text, description text,
  created_at timestamptz, updated_at timestamptz, article_count bigint
)
LANGUAGE sql STABLE AS $$
  SELECT t.id, t.name, t.name_en, t.slug, t.description, t.created_at, t.updated_at,
    (SELECT count(*) FROM articles a WHERE a.tags @> ARRAY[t.name]) AS article_count
  FROM tags t
  WHERE coalesce(search, '') = ''
     OR t.name ILIKE '%' || search || '%'
     OR t.name_en ILIKE '%' || search || '%'
  ORDER BY t.name
  LIMIT greatest(lim, 0) OFFSET greatest(off, 0);
$$;

-- ── RPC: rename a tag everywhere ────────────────────────────────────────────
-- Replaces old_name with new_name inside every article's tags array, de-duping
-- (so a rename into an existing tag merges cleanly).
CREATE OR REPLACE FUNCTION rename_tag_in_articles(old_name TEXT, new_name TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE articles
  SET tags = (
    SELECT array_agg(DISTINCT v)
    FROM unnest(array_replace(tags, old_name, new_name)) AS v
  )
  WHERE tags @> ARRAY[old_name];
$$;

-- ── RPC: remove a tag from every article ────────────────────────────────────
CREATE OR REPLACE FUNCTION remove_tag_from_articles(target_name TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE articles
  SET tags = array_remove(tags, target_name)
  WHERE tags @> ARRAY[target_name];
$$;

-- ── Seed: import every distinct tag currently used by articles ───────────────
INSERT INTO tags (name, slug)
SELECT DISTINCT
  t,
  btrim(regexp_replace(regexp_replace(lower(t), '\s+', '-', 'g'), '[^[:alnum:]_-]', '', 'g'), '-')
FROM articles, unnest(tags) AS t
WHERE t IS NOT NULL AND length(btrim(t)) > 0
ON CONFLICT (name) DO NOTHING;
