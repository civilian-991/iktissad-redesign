-- Phase 1: Add page images columns to magazine_issues
-- Supports the Magzter-style image-based reader (PDF → WebP conversion in admin browser)

ALTER TABLE magazine_issues
  ADD COLUMN IF NOT EXISTS pages_images TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pages_ready  BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN magazine_issues.pages_images IS 'Ordered array of Supabase Storage public URLs for each page WebP image';
COMMENT ON COLUMN magazine_issues.pages_ready  IS 'True once all page images have been converted and uploaded';
