-- Phase 11: User article bookmarks
--
-- Backs GET/POST/DELETE /api/bookmarks. Each user can bookmark each article
-- once (UNIQUE constraint). RLS restricts every row to its owner.
--
-- Idempotent: cloud DB had the table created out-of-band but with the
-- user_id FK missing. This migration creates anything missing AND adds the
-- FK if absent.

CREATE TABLE IF NOT EXISTS bookmarks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  article_id  UUID        NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx     ON bookmarks (user_id);
CREATE INDEX IF NOT EXISTS bookmarks_article_id_idx  ON bookmarks (article_id);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- ── RLS policies ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookmarks'
      AND policyname = 'Users can view their own bookmarks'
  ) THEN
    CREATE POLICY "Users can view their own bookmarks"
      ON bookmarks FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookmarks'
      AND policyname = 'Users can insert their own bookmarks'
  ) THEN
    CREATE POLICY "Users can insert their own bookmarks"
      ON bookmarks FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookmarks'
      AND policyname = 'Users can delete their own bookmarks'
  ) THEN
    CREATE POLICY "Users can delete their own bookmarks"
      ON bookmarks FOR DELETE TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- ── FK on user_id → auth.users(id) ──────────────────────────────────────
-- The cloud DB had this missing, allowing rows referencing nonexistent users.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'bookmarks'
      AND constraint_name = 'bookmarks_user_id_fkey'
  ) THEN
    ALTER TABLE bookmarks
      ADD CONSTRAINT bookmarks_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;
