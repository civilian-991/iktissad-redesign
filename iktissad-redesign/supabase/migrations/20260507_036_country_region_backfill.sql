-- Backfill region for known country slugs.
-- New countries added via the CMS default to 'world' (see migration 035).
-- Editors can override per row in the admin UI.

UPDATE countries SET region = 'gulf'        WHERE slug IN ('saudi-arabia', 'uae', 'qatar', 'kuwait', 'bahrain', 'oman');
UPDATE countries SET region = 'mashreq'     WHERE slug IN ('lebanon', 'syria', 'jordan', 'iraq');
UPDATE countries SET region = 'northafrica' WHERE slug IN ('egypt', 'morocco', 'algeria', 'tunisia', 'libya');
-- everything else (usa, china, france, india, turkey, world, …) stays 'world'
