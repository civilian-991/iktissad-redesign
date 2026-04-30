-- Phase 11: Fix reading_sessions.user_id to reference auth.users
--
-- The original FK in 20260412_027_phase4_monetization.sql pointed at the
-- content `users` table. That meant every Supabase Auth user needed a
-- mirror row in `users` for the metered-paywall insert to succeed —
-- which the signup path does not currently guarantee.
--
-- This migration drops the old constraint and points the FK at auth.users
-- directly, with ON DELETE SET NULL so anonymized records survive deletion.
--
-- Idempotent: re-running is a no-op once the FK target is auth.users.

DO $$
DECLARE
  current_target_schema text;
  current_target_table  text;
BEGIN
  SELECT ccu.table_schema, ccu.table_name
    INTO current_target_schema, current_target_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema    = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema    = 'public'
    AND tc.table_name      = 'reading_sessions'
    AND tc.constraint_name = 'reading_sessions_user_id_fkey';

  -- Only act if the FK exists and points somewhere other than auth.users
  IF current_target_schema IS NOT NULL
     AND (current_target_schema <> 'auth' OR current_target_table <> 'users') THEN

    ALTER TABLE reading_sessions
      DROP CONSTRAINT reading_sessions_user_id_fkey;

    ALTER TABLE reading_sessions
      ADD CONSTRAINT reading_sessions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;

  ELSIF current_target_schema IS NULL THEN
    -- FK doesn't exist at all — create it
    ALTER TABLE reading_sessions
      ADD CONSTRAINT reading_sessions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;
