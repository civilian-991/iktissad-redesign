-- ============================================================
-- Phase 7: Smart Media — AI Alt Text + Auto-Tagging
-- ============================================================

-- Add tags (jsonb array) and description columns to media table
ALTER TABLE media ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE media ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

-- Phase 7.3: Focal point fields for article featured images
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_focal_x float NOT NULL DEFAULT 0.5;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_focal_y float NOT NULL DEFAULT 0.5;

-- Index for tag filtering (GIN index on jsonb array)
CREATE INDEX IF NOT EXISTS idx_media_tags ON media USING GIN (tags);
