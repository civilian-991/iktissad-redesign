-- Magazine archive repair — schema half.
--
-- `magazine_issues` was migrated as one flat pile of 201 rows drawn from THREE
-- different publications, with nothing to tell them apart:
--
--     AR… الاقتصاد والأعمال  regular   131 issues   #397–547
--     AS… الاقتصاد والأعمال  special    10 issues   #1401–202507
--     LR… اللبنانية           regular    64 issues   #47–131
--
-- so /magazine — titled "أرشيف المجلة" — interleaves 64 issues of a different
-- magazine by date, and issue_number is useless as a sort key (202507 > 544).
--
-- This migration adds the three columns the source always had and the loader
-- needs, plus the stable key whose absence caused the data loss: the previous
-- page loader wrote with `.update().eq('issue_number', …)`, which matches zero
-- rows for an issue that does not exist yet and is NOT an error in PostgREST.
-- Issues 545, 546 and 547 were downloaded in full and silently thrown away.

ALTER TABLE magazine_issues
  -- The source's own per-issue key ("AR0544"). Stable, unique, and the only
  -- thing safe to upsert on.
  ADD COLUMN IF NOT EXISTS rkvid       TEXT,
  ADD COLUMN IF NOT EXISTS source_nid  INTEGER,
  ADD COLUMN IF NOT EXISTS publication TEXT NOT NULL DEFAULT 'aiwa',
  ADD COLUMN IF NOT EXISTS issue_type  TEXT NOT NULL DEFAULT 'regular',
  -- Printed page labels, positionally parallel to pages_images. Most are "1",
  -- "2", … but 475 pages across 84 issues carry names instead — FC (front
  -- cover), IFC/IFCS (inside front cover), G.F 1 (gatefold), OBC/IBC (back
  -- covers), AD 1..6, and Roman numerals for inserts. Those named pages are
  -- exactly the ones the old loader destroyed: it did Number('FC') → NaN and
  -- then pageUrls[NaN - 1] = url, which sets a string property rather than an
  -- array slot, so .filter(Boolean) dropped every one of them.
  ADD COLUMN IF NOT EXISTS page_labels TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN magazine_issues.rkvid       IS 'Source issue key (e.g. AR0544). Stable upsert key — never write by issue_number alone.';
COMMENT ON COLUMN magazine_issues.source_nid  IS 'Drupal node id of the source issue.';
COMMENT ON COLUMN magazine_issues.publication IS 'aiwa = الاقتصاد والأعمال, lubnaniya = اللبنانية.';
COMMENT ON COLUMN magazine_issues.issue_type  IS 'regular | special.';
COMMENT ON COLUMN magazine_issues.page_labels IS 'Printed label per page, parallel to pages_images. Numeric for body pages, named for covers/inserts (FC, IFC, G.F 1, OBC, AD 1, IV).';

-- Backfill what can be derived from the cover URL, which encodes the rkvid:
--   …/public/magazines/magazines/AR0544/low/AR0544_….jpg
-- The loader fills in the rest from source; this keeps the table coherent in
-- between, and lets the unique index below be created straight away.
UPDATE magazine_issues
   SET rkvid = substring(cover_image FROM 'magazines/magazines/([A-Za-z0-9]+)/')
 WHERE rkvid IS NULL
   AND cover_image ~ 'magazines/magazines/[A-Za-z0-9]+/';

UPDATE magazine_issues
   SET publication = CASE WHEN rkvid LIKE 'LR%' THEN 'lubnaniya' ELSE 'aiwa' END,
       issue_type  = CASE WHEN rkvid LIKE 'AS%' THEN 'special'   ELSE 'regular' END
 WHERE rkvid IS NOT NULL;

ALTER TABLE magazine_issues
  DROP CONSTRAINT IF EXISTS magazine_issues_publication_check,
  DROP CONSTRAINT IF EXISTS magazine_issues_issue_type_check;

ALTER TABLE magazine_issues
  ADD CONSTRAINT magazine_issues_publication_check CHECK (publication IN ('aiwa', 'lubnaniya')),
  ADD CONSTRAINT magazine_issues_issue_type_check  CHECK (issue_type  IN ('regular', 'special'));

-- An issue number is only unique WITHIN a publication: اللبنانية is at #131 and
-- will one day reach #397, where الاقتصاد والأعمال already sits. The old global
-- UNIQUE(issue_number) asserts a fact about the data that is not true, and it is
-- what made `.eq('issue_number', …)` look like a safe key. Replace it.
-- Nothing in src/ upserts on it — every read and write goes by id.
ALTER TABLE magazine_issues DROP CONSTRAINT IF EXISTS magazine_issues_issue_number_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'magazine_issues_pub_issue_number_key'
      AND conrelid = 'public.magazine_issues'::regclass
  ) THEN
    ALTER TABLE magazine_issues
      ADD CONSTRAINT magazine_issues_pub_issue_number_key UNIQUE (publication, issue_type, issue_number);
  END IF;
END $$;

-- rkvid is the loader's upsert target, so it must be unique. A plain constraint
-- rather than a partial index: ON CONFLICT cannot infer a partial index without
-- repeating its predicate, which PostgREST never emits, so `onConflict: 'rkvid'`
-- would fail at runtime. A plain UNIQUE is safe here because Postgres treats
-- NULLs as distinct — issues created by hand in the admin UI carry no source
-- key and can all sit at NULL without colliding.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'magazine_issues_rkvid_key'
      AND conrelid = 'public.magazine_issues'::regclass
  ) THEN
    ALTER TABLE magazine_issues ADD CONSTRAINT magazine_issues_rkvid_key UNIQUE (rkvid);
  END IF;
END $$;

-- The archive lists one publication at a time, newest first.
CREATE INDEX IF NOT EXISTS magazine_issues_pub_date_idx
  ON magazine_issues (publication, publish_date DESC);
