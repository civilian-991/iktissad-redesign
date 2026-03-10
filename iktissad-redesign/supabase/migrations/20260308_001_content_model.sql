-- Block-based article content (replace content: string)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS body JSONB DEFAULT '[]';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deck TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deck_en TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS accent_color TEXT;

-- Magazine sections
CREATE TABLE magazine_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES magazine_issues(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  theme_color TEXT DEFAULT '#DDA853',
  cover_image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Spread templates (admin-defined, reusable)
CREATE TABLE spread_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  thumbnail_svg TEXT,
  zones JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Issue spreads (actual content assignments)
CREATE TABLE magazine_spreads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES magazine_issues(id) ON DELETE CASCADE,
  section_id UUID REFERENCES magazine_sections(id) ON DELETE SET NULL,
  page_number INT NOT NULL,
  template_id TEXT NOT NULL,
  zones JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(issue_id, page_number)
);

CREATE TABLE spread_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_id UUID REFERENCES magazine_spreads(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT now(),
  saved_by UUID REFERENCES users(id),
  label TEXT
);
