-- Region backfill for the full ISO-3166 country import (250 rows).
-- Migration 036 only covered the original curated set; this extends the
-- gulf / mashreq / northafrica buckets to the Arab countries added in the
-- full import. Everything else keeps the column default ('world').
-- Idempotent: safe to re-run. Requires migration 035 (adds the region column).

ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'world';

CREATE INDEX IF NOT EXISTS idx_countries_region ON countries (region);

UPDATE countries SET region = 'gulf'        WHERE slug IN ('saudi-arabia', 'uae', 'qatar', 'kuwait', 'bahrain', 'oman', 'yemen');
UPDATE countries SET region = 'mashreq'     WHERE slug IN ('lebanon', 'syria', 'jordan', 'iraq', 'palestine');
UPDATE countries SET region = 'northafrica' WHERE slug IN ('egypt', 'morocco', 'algeria', 'tunisia', 'libya', 'sudan', 'mauritania');
-- All other countries (non-Arab markets + Arab outliers like Somalia, Djibouti,
-- Comoros) remain 'world'. Editors can refine any country in /admin/countries.
