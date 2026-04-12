-- ============================================================
-- Migration 026: TOTP Recovery Codes
-- ============================================================
-- Creates the totp_recovery_codes table for admin 2FA backup codes.
-- Codes are stored as SHA-256 hashes (never plaintext).
-- Single-use: used_at is set on consumption, row is not deleted.
-- ============================================================

CREATE TABLE IF NOT EXISTS totp_recovery_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash  TEXT        NOT NULL,
  used_at    TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by user + hash (the hot path during login recovery)
CREATE INDEX IF NOT EXISTS idx_totp_recovery_codes_user_hash
  ON totp_recovery_codes (user_id, code_hash);

-- Enable RLS
ALTER TABLE totp_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users may view their own codes (to count them, not read the hashes in UI)
CREATE POLICY "Users can view own recovery codes"
  ON totp_recovery_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- All writes (INSERT, UPDATE, DELETE) go through the service role only.
-- No INSERT/UPDATE/DELETE policies needed — service role bypasses RLS.
