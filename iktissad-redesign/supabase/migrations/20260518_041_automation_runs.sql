-- Phase 8.x: Automation Run Log
--
-- Persists every attempt to fire an automation action so admins can debug
-- failed Telegram posts, welcome emails, and other side-effects executed by
-- src/lib/automations/engine.ts.

CREATE TABLE IF NOT EXISTS automation_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id   UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
  rule_key        TEXT,
  event           TEXT NOT NULL,
  action          TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('success','failed','skipped')),
  error           TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_automation_id ON automation_runs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status        ON automation_runs(status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_created_at    ON automation_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_event         ON automation_runs(event);

-- RLS: service role only (no public reads or writes); admins access via API routes
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
