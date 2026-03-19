-- Phase 2: Add editorial_mention and review_request notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'editorial_mention';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'review_request';

-- Add recipient_id for targeted (per-user) notifications
ALTER TABLE admin_notifications ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON admin_notifications(recipient_id);
