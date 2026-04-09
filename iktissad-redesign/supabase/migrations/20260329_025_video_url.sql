-- Add video_url column for articles that have an associated video
-- (Populated by migration script m06c-video-urls.mjs from ArticleVideo table)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS video_url TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_video_url ON articles (id) WHERE video_url IS NOT NULL;
