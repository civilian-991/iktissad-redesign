-- Migration 060: backfill article_type from section
--
-- The legacy import typed nearly every article 'news', including the أقلام
-- (opinion) and عمق (analysis) sections. article_type now decides whether the
-- byline shows the writer's photo, so align it with the section.
-- Editor + API keep it in sync from here on (src/lib/author-portrait.ts).
--
-- The updated_at trigger is paused so ~1,000 old articles don't show up as
-- edited today in the sitemap and RSS feeds.

BEGIN;
ALTER TABLE articles DISABLE TRIGGER set_updated_at;

UPDATE articles a
SET article_type = 'opinion'
FROM sections s
WHERE a.section_id = s.id AND s.slug = 'opinion'
  AND a.article_type IS DISTINCT FROM 'opinion';

UPDATE articles a
SET article_type = 'analysis'
FROM sections s
WHERE a.section_id = s.id AND s.slug = 'analysis'
  AND a.article_type IS DISTINCT FROM 'analysis';

ALTER TABLE articles ENABLE TRIGGER set_updated_at;
COMMIT;
