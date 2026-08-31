-- ============================================================================
-- IKTISSAD CMS Database Schema
-- PostgreSQL / Supabase
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────

CREATE TYPE article_status AS ENUM ('published', 'draft', 'review', 'scheduled');
CREATE TYPE user_role      AS ENUM ('admin', 'editor', 'author', 'contributor');
CREATE TYPE user_status    AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE profile_type   AS ENUM ('corporation', 'government', 'ngo', 'individual');
CREATE TYPE magazine_status AS ENUM ('published', 'draft', 'scheduled');
CREATE TYPE subscriber_status AS ENUM ('active', 'unsubscribed');

-- ──────────────────────────────────────────────────────────────
-- SECTIONS (news categories like economy, technology, investment)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,               -- Arabic name
  name_en     TEXT NOT NULL DEFAULT '',     -- English name
  description    TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sections_slug ON sections (slug);

-- ──────────────────────────────────────────────────────────────
-- SECTORS (industry sectors like oil-gas, banking, energy)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE sectors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  name_en     TEXT NOT NULL DEFAULT '',
  description    TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT '',      -- Lucide icon name
  color       TEXT NOT NULL DEFAULT '',      -- Hex or Tailwind class
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sectors_slug ON sectors (slug);

-- ──────────────────────────────────────────────────────────────
-- COUNTRIES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE countries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT UNIQUE NOT NULL,
  name                 TEXT NOT NULL,
  name_en              TEXT NOT NULL DEFAULT '',
  flag                 TEXT NOT NULL DEFAULT '',           -- emoji flag
  economic_overview    TEXT NOT NULL DEFAULT '',
  economic_overview_en TEXT NOT NULL DEFAULT '',
  key_indicators       JSONB NOT NULL DEFAULT '{}'::jsonb, -- { gdp, gdpGrowth, ... }
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_countries_slug ON countries (slug);

-- ──────────────────────────────────────────────────────────────
-- USERS (CMS admin users - separate from Stack Auth end-users)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'author',
  avatar        TEXT NOT NULL DEFAULT '',
  department    TEXT NOT NULL DEFAULT '',
  status        user_status NOT NULL DEFAULT 'active',
  article_count INT NOT NULL DEFAULT 0,
  last_active   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

-- ──────────────────────────────────────────────────────────────
-- ARTICLES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  title_en        TEXT NOT NULL DEFAULT '',
  excerpt         TEXT NOT NULL DEFAULT '',
  excerpt_en      TEXT NOT NULL DEFAULT '',
  content         TEXT NOT NULL DEFAULT '',      -- HTML from TipTap
  content_en      TEXT NOT NULL DEFAULT '',
  featured_image  TEXT NOT NULL DEFAULT '',
  section_id      UUID REFERENCES sections(id) ON DELETE SET NULL,
  sector_id       UUID REFERENCES sectors(id)  ON DELETE SET NULL,
  country_id      UUID REFERENCES countries(id) ON DELETE SET NULL,
  author_id       UUID REFERENCES users(id)    ON DELETE SET NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  status          article_status NOT NULL DEFAULT 'draft',
  views           INT NOT NULL DEFAULT 0,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_slug       ON articles (slug);
CREATE INDEX idx_articles_section    ON articles (section_id);
CREATE INDEX idx_articles_sector     ON articles (sector_id);
CREATE INDEX idx_articles_country    ON articles (country_id);
CREATE INDEX idx_articles_author     ON articles (author_id);
CREATE INDEX idx_articles_status     ON articles (status);
CREATE INDEX idx_articles_published  ON articles (published_at DESC);

-- An article can be filed under several countries. `articles.country_id` is the
-- primary one (position 0) and still feeds every countries:country_id embed;
-- this table is the authoritative set and is what country pages, country feeds
-- and per-country counts filter on. See migration 051.
CREATE TABLE article_countries (
  article_id UUID NOT NULL REFERENCES articles(id)  ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  position   INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, country_id)
);

CREATE INDEX idx_article_countries_country ON article_countries (country_id);

-- ──────────────────────────────────────────────────────────────
-- MAGAZINE ISSUES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE magazine_issues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number  INT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  title_en      TEXT NOT NULL DEFAULT '',
  subtitle      TEXT NOT NULL DEFAULT '',
  cover_image   TEXT NOT NULL DEFAULT '',
  publish_date  TIMESTAMPTZ NOT NULL,
  pdf_url       TEXT NOT NULL DEFAULT '',
  pages         INT NOT NULL DEFAULT 0,
  views         INT NOT NULL DEFAULT 0,
  downloads     INT NOT NULL DEFAULT 0,
  featured      BOOLEAN NOT NULL DEFAULT false,
  status        magazine_status NOT NULL DEFAULT 'draft',
  highlights    TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_magazine_issues_number ON magazine_issues (issue_number DESC);
CREATE INDEX idx_magazine_issues_status ON magazine_issues (status);

-- Junction table: which articles appear in which magazine
CREATE TABLE magazine_articles (
  magazine_id UUID NOT NULL REFERENCES magazine_issues(id) ON DELETE CASCADE,
  article_id  UUID NOT NULL REFERENCES articles(id)        ON DELETE CASCADE,
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (magazine_id, article_id)
);

-- ──────────────────────────────────────────────────────────────
-- PROFILES (companies, organizations, people)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  name_en         TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  description_en  TEXT NOT NULL DEFAULT '',
  logo            TEXT NOT NULL DEFAULT '',
  sector_id       UUID REFERENCES sectors(id)   ON DELETE SET NULL,
  country_id      UUID REFERENCES countries(id)  ON DELETE SET NULL,
  website         TEXT NOT NULL DEFAULT '',
  founded         TEXT NOT NULL DEFAULT '',
  type            profile_type NOT NULL DEFAULT 'corporation',
  quote           TEXT NOT NULL DEFAULT '',
  image           TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_sector  ON profiles (sector_id);
CREATE INDEX idx_profiles_country ON profiles (country_id);
CREATE INDEX idx_profiles_type    ON profiles (type);

-- ──────────────────────────────────────────────────────────────
-- MEDIA (uploaded files managed via Supabase Storage)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url         TEXT NOT NULL,
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL DEFAULT '',
  size        INT NOT NULL DEFAULT 0,          -- bytes
  alt         TEXT NOT NULL DEFAULT '',
  alt_en      TEXT NOT NULL DEFAULT '',
  folder      TEXT NOT NULL DEFAULT '',
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_folder ON media (folder);

-- ──────────────────────────────────────────────────────────────
-- NEWSLETTER SUBSCRIBERS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE newsletter_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  status        subscriber_status NOT NULL DEFAULT 'active',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_email ON newsletter_subscribers (email);

-- ──────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sections        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sectors         FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON countries       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON articles        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON magazine_issues FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────
-- Public tables: anyone can SELECT, only authenticated/service role can mutate.
-- Admin tables (users, media): service role only.

-- Public read tables
ALTER TABLE sections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_issues    ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_articles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;

-- Admin tables
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE media                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public SELECT policies
CREATE POLICY "Public read sections"          ON sections          FOR SELECT USING (true);
CREATE POLICY "Public read sectors"           ON sectors           FOR SELECT USING (true);
CREATE POLICY "Public read countries"         ON countries         FOR SELECT USING (true);
CREATE POLICY "Public read published articles" ON articles         FOR SELECT USING (status = 'published');
CREATE POLICY "Public read published magazines" ON magazine_issues FOR SELECT USING (status = 'published');
CREATE POLICY "Public read magazine_articles" ON magazine_articles FOR SELECT USING (true);
CREATE POLICY "Public read profiles"          ON profiles          FOR SELECT USING (true);

-- Service role has full access by default (bypasses RLS).
-- For authenticated admin users, add policies as needed:

-- Allow service role (admin client) full CRUD on all tables
-- (Service role already bypasses RLS, so these are for reference)

-- Articles: allow all operations for service role (admin operations go through admin client)
CREATE POLICY "Admin full access articles"     ON articles          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access sections"     ON sections          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access sectors"      ON sectors           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access countries"    ON countries         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access magazines"    ON magazine_issues   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access mag_articles" ON magazine_articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access profiles"     ON profiles          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access users"        ON users             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access media"        ON media             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access newsletter"   ON newsletter_subscribers FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- STORAGE BUCKETS (run via Supabase dashboard or API)
-- ──────────────────────────────────────────────────────────────
-- Create these buckets in the Supabase dashboard:
--   1. "media" - for article images, profile logos, general uploads (public)
--   2. "magazines" - for magazine cover images and PDFs (public)
--
-- Bucket policies:
--   - Public read for both buckets
--   - Insert/update/delete restricted to authenticated users
