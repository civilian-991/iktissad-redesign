-- Migration 046: GCC Newsroom — pipeline task ledger + recovery sweep
-- (plan v4 Phase 3.2; research appendix §4 FinSight WorkflowTask/recovery).
--
-- A Postgres-only replacement for a broker: status/attempts/lease columns +
-- a scheduled recovery function that re-queues or dead-letters stuck tasks.
-- This is what must be in place before enabling the Selector schedule, so
-- retries/cron can never double-publish.

CREATE TABLE IF NOT EXISTS gcc_pipeline_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key  TEXT NOT NULL UNIQUE,        -- e.g. 'draft:<disclosure_event_id>'
  kind             TEXT NOT NULL,               -- 'ingest' | 'draft' | 'publish' | ...
  status           TEXT NOT NULL DEFAULT 'created'
                     CHECK (status IN ('created','running','retrying','succeeded','failed','dead_letter')),
  stage            TEXT,
  attempts         INT NOT NULL DEFAULT 0,
  lease_owner      TEXT,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcc_pipeline_tasks_status_updated
  ON gcc_pipeline_tasks(status, updated_at ASC);

CREATE TRIGGER gcc_pipeline_tasks_updated_at
  BEFORE UPDATE ON gcc_pipeline_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE gcc_pipeline_tasks ENABLE ROW LEVEL SECURITY;
-- No public policy; service-role only.

-- Recovery sweep: tasks RUNNING longer than `timeout` are re-queued (retrying)
-- or dead-lettered at attempts >= 3. Idempotent; safe to run on a schedule.
CREATE OR REPLACE FUNCTION gcc_recover_stuck_tasks(timeout INTERVAL DEFAULT INTERVAL '10 minutes')
RETURNS INT AS $$
DECLARE affected INT;
BEGIN
  WITH stuck AS (
    SELECT id, attempts FROM gcc_pipeline_tasks
    WHERE status = 'running' AND updated_at < now() - timeout
    FOR UPDATE SKIP LOCKED
  )
  UPDATE gcc_pipeline_tasks t
  SET status = CASE WHEN s.attempts >= 3 THEN 'dead_letter' ELSE 'retrying' END,
      attempts = s.attempts + 1,
      error = COALESCE(t.error, 'recovered after timeout'),
      lease_owner = NULL
  FROM stuck s
  WHERE t.id = s.id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- Schedule it every 5 minutes IF pg_cron is available (Supabase: enable the
-- extension in the dashboard). Wrapped so the migration succeeds either way.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.schedule(
      'gcc-recover-stuck-tasks', '*/5 * * * *',
      $cron$SELECT gcc_recover_stuck_tasks();$cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron not available — call gcc_recover_stuck_tasks() from an external scheduler (n8n).';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule gcc_recover_stuck_tasks via pg_cron: %', SQLERRM;
END;
$$;
