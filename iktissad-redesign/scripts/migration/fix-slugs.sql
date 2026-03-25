-- Fix slugs with HTML <br> tags baked in as -br- or -br/-
-- Example: فولكس-فاجن-br-مواصلة → فولكس-فاجن-مواصلة

-- Step 1: Create a temporary column to hold the cleaned slug
-- Step 2: Update with regex
-- Step 3: Handle duplicates by appending -2, -3, etc.

-- Clean -br/- and -br- patterns
UPDATE articles
SET slug = regexp_replace(
  regexp_replace(slug, '-br/-', '-', 'gi'),
  '-br-', '-', 'gi'
)
WHERE slug LIKE '%-br-%';

-- Collapse multiple consecutive dashes
UPDATE articles
SET slug = regexp_replace(slug, '-{2,}', '-', 'g')
WHERE slug LIKE '%---%' OR slug LIKE '%--%';

-- Trim leading/trailing dashes
UPDATE articles
SET slug = trim(both '-' from slug)
WHERE slug LIKE '-%' OR slug LIKE '%-';

-- Handle any duplicates that were created by appending the first 6 chars of ID
-- (Only articles where the cleaned slug now conflicts with another article)
UPDATE articles a
SET slug = a.slug || '-' || substring(a.id::text, 1, 6)
WHERE EXISTS (
  SELECT 1 FROM articles b
  WHERE b.slug = a.slug
  AND b.id != a.id
  AND b.id < a.id  -- keep the older one, rename the newer one
);
