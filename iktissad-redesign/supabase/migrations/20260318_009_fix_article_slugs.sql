-- ============================================================
-- Migration 009: Clean article data migrated from Drupal
--
-- 1. Slugs: strip "news-" prefix, YYYY-MM-DD- date prefix,
--    -br- HTML tag remnants; deduplicate with -N suffix
-- 2. Titles / excerpts: strip all HTML tags and collapse whitespace
-- ============================================================

-- ── Slug cleanup ────────────────────────────────────────────

-- Strip "news-" word prefix (leftover from Drupal /news/date/title alias)
UPDATE articles
SET slug = regexp_replace(slug, '^news-', '')
WHERE slug LIKE 'news-%';

-- Strip YYYY-MM-DD- date prefix, -br- HTML remnants, collapse hyphens
-- Deduplicate: append -2, -3 etc. for articles with identical cleaned slug
WITH cleaned AS (
  SELECT
    id,
    published_at,
    btrim(
      regexp_replace(
        replace(replace(
          regexp_replace(slug, '^\d{4}-\d{2}-\d{2}-', ''),
          '-br-', '-'), '-br/', '-'),
        '-{2,}', '-', 'g'),
      '-') AS base_slug
  FROM articles
),
deduped AS (
  SELECT
    id,
    base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY base_slug
      ORDER BY published_at DESC NULLS LAST
    ) AS rn
  FROM cleaned
)
UPDATE articles a
SET slug = CASE
  WHEN d.rn = 1 THEN d.base_slug
  ELSE d.base_slug || '-' || d.rn
END
FROM deduped d
WHERE a.id = d.id;

-- ── HTML cleanup in text fields ─────────────────────────────

UPDATE articles SET
  title = trim(regexp_replace(
    regexp_replace(title, '<[^>]*>', ' ', 'g'), '\s{2,}', ' ', 'g')),

  title_en = trim(regexp_replace(
    regexp_replace(title_en, '<[^>]*>', ' ', 'g'), '\s{2,}', ' ', 'g')),

  excerpt = trim(regexp_replace(
    regexp_replace(excerpt, '<[^>]*>', ' ', 'g'), '\s{2,}', ' ', 'g')),

  excerpt_en = trim(regexp_replace(
    regexp_replace(excerpt_en, '<[^>]*>', ' ', 'g'), '\s{2,}', ' ', 'g'))

WHERE
  title      ~ '<[^>]+>' OR
  title_en   ~ '<[^>]+>' OR
  excerpt    ~ '<[^>]+>' OR
  excerpt_en ~ '<[^>]+>';
