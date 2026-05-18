-- =============================================================================
-- Newsletter send-status hardening
-- - Adds 'partial' and 'failed' to the newsletters.status CHECK constraint
-- - Adds sent_count / failed_count columns so /api/newsletters/[id]/send can
--   record per-batch delivery outcomes (success/partial/total-failure).
-- =============================================================================

-- 1. Drop the old CHECK constraint and recreate it with the two new states.
--    The constraint name follows Postgres's auto-naming convention for a
--    single-column CHECK on `newsletters(status)`. Use a defensive DO block
--    so the migration is idempotent across environments where the constraint
--    may have been renamed.
DO $$
DECLARE
  conname_var TEXT;
BEGIN
  SELECT conname INTO conname_var
    FROM pg_constraint
   WHERE conrelid = 'public.newsletters'::regclass
     AND contype  = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF conname_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE newsletters DROP CONSTRAINT %I', conname_var);
  END IF;
END$$;

ALTER TABLE newsletters
  ADD CONSTRAINT newsletters_status_check
  CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled', 'partial', 'failed'));

-- 2. Per-send accounting columns.
ALTER TABLE newsletters
  ADD COLUMN IF NOT EXISTS sent_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0;
