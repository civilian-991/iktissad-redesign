-- Featured image caption + source/credit shown under the hero image on article pages
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_caption TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_credit  TEXT NOT NULL DEFAULT '';
