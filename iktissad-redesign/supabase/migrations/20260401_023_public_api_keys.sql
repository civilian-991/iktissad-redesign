-- =============================================================================
-- Phase 10.2: Public API Keys
-- =============================================================================
-- API keys table — stores hashed keys (never the raw key)
CREATE TABLE IF NOT EXISTS api_keys (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,                              -- human label e.g. "Mobile App"
  key_hash              text UNIQUE NOT NULL,                       -- SHA-256 hash of the actual key
  key_prefix            text NOT NULL,                             -- first 8 chars shown in UI e.g. "ikt_a1b2"
  scopes                text[] DEFAULT '{"read:articles","read:sections"}',
  rate_limit_per_minute integer DEFAULT 60,
  created_by            uuid,
  last_used_at          timestamptz,
  expires_at            timestamptz,
  is_active             boolean DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Usage log — immutable append-only log of API requests
CREATE TABLE IF NOT EXISTS api_usage_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint        text NOT NULL,
  method          text DEFAULT 'GET',
  status_code     integer,
  response_time_ms integer,
  ip_address      text,
  user_agent      text,
  requested_at    timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash    ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by  ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_usage_key_id     ON api_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_requested  ON api_usage_log(requested_at);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys;
CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_api_keys_updated_at();

-- RLS: admin access only (api_usage_log is written by service role, no RLS needed)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- Allow service role to bypass (service role always bypasses RLS, but be explicit)
-- Allow authenticated admins to manage api_keys
CREATE POLICY "api_keys_admin_all" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "api_usage_log_admin_all" ON api_usage_log
  FOR ALL USING (auth.role() = 'service_role');
