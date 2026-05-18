-- Phase 12: A/B Testing — persistent storage
--
-- Replaces the module-level in-memory Map in
-- /api/admin/ab-tests/route.ts with real tables so tests survive
-- cold starts and autoscale.
--
-- Tables:
--   ab_tests              — test definitions
--   ab_test_assignments   — sticky variant assignment per subject
--   ab_test_events        — exposure / conversion event log

-- ─── ab_tests ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ab_tests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  variants      jsonb NOT NULL,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','running','paused','completed')),
  target_metric text,
  started_at    timestamptz,
  ended_at      timestamptz,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ab_tests_status_idx ON ab_tests (status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_ab_tests_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ab_tests_set_updated_at ON ab_tests;
CREATE TRIGGER ab_tests_set_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW EXECUTE FUNCTION set_ab_tests_updated_at();

-- ─── ab_test_assignments ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id          bigserial PRIMARY KEY,
  test_id     uuid NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  subject_id  text NOT NULL,
  variant_key text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, subject_id)
);

CREATE INDEX IF NOT EXISTS ab_test_assignments_test_idx
  ON ab_test_assignments (test_id);
CREATE INDEX IF NOT EXISTS ab_test_assignments_test_subject_idx
  ON ab_test_assignments (test_id, subject_id);

-- ─── ab_test_events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ab_test_events (
  id          bigserial PRIMARY KEY,
  test_id     uuid REFERENCES ab_tests(id) ON DELETE CASCADE,
  subject_id  text,
  variant_key text,
  event       text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ab_test_events_test_idx
  ON ab_test_events (test_id);
CREATE INDEX IF NOT EXISTS ab_test_events_test_subject_idx
  ON ab_test_events (test_id, subject_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE ab_tests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_events       ENABLE ROW LEVEL SECURITY;

-- ab_tests: admins (any authenticated user in admin_roles) read + write
DROP POLICY IF EXISTS ab_tests_admin_read  ON ab_tests;
DROP POLICY IF EXISTS ab_tests_admin_write ON ab_tests;

CREATE POLICY ab_tests_admin_read ON ab_tests
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid())
  );

CREATE POLICY ab_tests_admin_write ON ab_tests
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid())
  );

-- ab_test_assignments: admins read, anon/auth insert (sticky bucketing)
DROP POLICY IF EXISTS ab_assign_admin_read  ON ab_test_assignments;
DROP POLICY IF EXISTS ab_assign_public_ins  ON ab_test_assignments;

CREATE POLICY ab_assign_admin_read ON ab_test_assignments
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid())
  );

CREATE POLICY ab_assign_public_ins ON ab_test_assignments
  FOR INSERT
  WITH CHECK (true);

-- ab_test_events: admins read, anon/auth insert (exposures / conversions)
DROP POLICY IF EXISTS ab_events_admin_read  ON ab_test_events;
DROP POLICY IF EXISTS ab_events_public_ins  ON ab_test_events;

CREATE POLICY ab_events_admin_read ON ab_test_events
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid())
  );

CREATE POLICY ab_events_public_ins ON ab_test_events
  FOR INSERT
  WITH CHECK (true);
