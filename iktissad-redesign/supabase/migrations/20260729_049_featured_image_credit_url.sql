-- Optional link for the featured image source credit
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_credit_url TEXT NOT NULL DEFAULT '';
