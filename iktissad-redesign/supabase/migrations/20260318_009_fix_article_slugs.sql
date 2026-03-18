-- ============================================================
-- Migration 009: Fix article slugs imported from Drupal
--
-- Problem: Drupal aliased articles as /news/YYYY-MM-DD/title
-- The migration script replaced all "/" with "-", producing:
--   news-YYYY-MM-DD-title  (redundant "news-" + date prefix)
--
-- Fix: strip the "news-" word prefix only.
-- The date (YYYY-MM-DD) is kept for uniqueness — removing it
-- would cause duplicate slug collisions across articles.
--
-- Note on -br- remnants: 6,379 articles contain "-br-" from
-- <br> HTML tags in Drupal titles. These cannot be safely
-- removed because many collide after stripping (same title,
-- different <br> placement). They are left as-is.
-- ============================================================

-- Strip "news-" prefix from all article slugs
UPDATE articles
SET slug = regexp_replace(slug, '^news-', '')
WHERE slug LIKE 'news-%';
