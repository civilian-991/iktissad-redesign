-- =============================================================================
-- Phase 4.3 — Newsletter Content Builder
-- =============================================================================

CREATE TABLE IF NOT EXISTS newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  sender_name TEXT DEFAULT 'إكتساد',
  segment TEXT NOT NULL DEFAULT 'all' CHECK (segment IN ('all', 'premium', 'free')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  blocks JSONB NOT NULL DEFAULT '[]',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_newsletters_created_at ON newsletters(created_at DESC);

-- auto-update trigger (reuses the existing update_updated_at_column function)
CREATE TRIGGER update_newsletters_updated_at
  BEFORE UPDATE ON newsletters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: only authenticated users (admins) can access newsletters
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read newsletters"
  ON newsletters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert newsletters"
  ON newsletters FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update newsletters"
  ON newsletters FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete newsletters"
  ON newsletters FOR DELETE
  TO authenticated
  USING (true);
