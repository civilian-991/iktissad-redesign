-- Phase 11: Contact form submissions
--
-- Backs the public POST /api/contact route. Public can insert (rate-limited
-- in the route by recent-email check + Turnstile); only service role can read.
--
-- Idempotent: safe to re-run on environments where the table or policies
-- already exist (the cloud DB had the table created out-of-band).

CREATE TABLE IF NOT EXISTS contact_submissions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  subject     TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_submissions_email_idx
  ON contact_submissions (email);

CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
  ON contact_submissions (created_at DESC);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public INSERT — protected at the API layer by Turnstile + per-email
-- 1-hour rate limit. RLS would otherwise need every submitter to be authed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'contact_submissions'
      AND policyname = 'Anyone can insert contact submissions'
  ) THEN
    CREATE POLICY "Anyone can insert contact submissions"
      ON contact_submissions
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Block public SELECT/UPDATE/DELETE; service role bypasses RLS so
-- the admin GET route still works via createAdminClient().
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'contact_submissions'
      AND policyname = 'Only service role can read contact submissions'
  ) THEN
    CREATE POLICY "Only service role can read contact submissions"
      ON contact_submissions
      FOR SELECT
      TO public
      USING (false);
  END IF;
END $$;
