-- Add region column to countries for homepage grouping (gulf/mashreq/north-africa/world)
ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'world';

CREATE INDEX IF NOT EXISTS idx_countries_region ON countries (region);
