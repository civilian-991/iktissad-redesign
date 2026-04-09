-- Migration: Add dedicated SEO metadata fields to articles table
-- Allows editors to override title/description/image per article for search engines and social sharing.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS meta_title       TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image         TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url    TEXT,
  ADD COLUMN IF NOT EXISTS no_index         BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN articles.meta_title       IS 'Custom SEO title tag (overrides article title). Max 65 chars recommended.';
COMMENT ON COLUMN articles.meta_description IS 'Custom meta description (overrides excerpt). Max 160 chars recommended.';
COMMENT ON COLUMN articles.og_image         IS 'Custom Open Graph image URL (overrides featured_image for social sharing).';
COMMENT ON COLUMN articles.canonical_url    IS 'Custom canonical URL — set for syndicated or duplicate content.';
COMMENT ON COLUMN articles.no_index         IS 'When true, adds noindex,nofollow robots meta to this article.';
