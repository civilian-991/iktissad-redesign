-- =============================================================================
-- Phase 10.1: Article Series / Dossiers
-- =============================================================================
-- Allows grouping articles into investigative series with reading-order nav.

CREATE TABLE article_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,           -- Arabic
  title_en text,
  description text,              -- Arabic
  description_en text,
  cover_image text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE series_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES article_series(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(series_id, article_id)
);

CREATE INDEX ON article_series(slug);
CREATE INDEX ON series_articles(series_id, order_index);
CREATE INDEX ON series_articles(article_id);

-- Auto-update updated_at on article_series
CREATE OR REPLACE FUNCTION update_article_series_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_article_series_updated_at
  BEFORE UPDATE ON article_series
  FOR EACH ROW EXECUTE FUNCTION update_article_series_updated_at();
