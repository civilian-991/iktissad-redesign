-- Phase 10.1 — Source & Contact CRM
-- Creates the journalist source database tables

CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  title text,
  title_en text,
  organization text,
  organization_en text,
  phone text,
  email text,
  country_id uuid REFERENCES countries(id),
  sector_id uuid REFERENCES sectors(id),
  tags text[] DEFAULT '{}',
  reliability_rating integer CHECK (reliability_rating BETWEEN 1 AND 5),
  embargo_until timestamptz,
  private_notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE source_article_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  quote_excerpt text,
  linked_at timestamptz DEFAULT now(),
  UNIQUE(source_id, article_id)
);

CREATE INDEX ON sources(created_by);
CREATE INDEX ON sources(country_id);
CREATE INDEX ON sources(sector_id);
CREATE INDEX ON source_article_links(article_id);
CREATE INDEX ON source_article_links(source_id);

-- Auto-update updated_at trigger (reuse pattern from other tables)
CREATE OR REPLACE FUNCTION update_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_sources_updated_at();
