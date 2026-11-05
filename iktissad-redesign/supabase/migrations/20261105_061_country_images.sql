-- Migration 061: landmark photo per country
--
-- Card background on /countries and the region pages. Files live in our own
-- Storage (media/countries/*) so they can't rot like the old hotlinked
-- Unsplash URLs did. image_credit holds the photographer + licence line the
-- CC BY / BY-SA licences require.

ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS image_credit TEXT;
