CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed defaults
INSERT INTO site_settings (key, value) VALUES
  ('general', '{"siteName":"الإقتصاد والأعمال","siteDescription":"المصدر الأول للأخبار الاقتصادية والمالية في العالم العربي","language":"ar","timezone":"Asia/Beirut"}'::jsonb),
  ('appearance', '{"darkMode":true,"accentColor":"#f59e0b","fontSize":"medium"}'::jsonb),
  ('notifications', '{"emailNotifications":true,"newArticleNotify":true,"newCommentNotify":true,"newUserNotify":false,"weeklyReport":true}'::jsonb),
  ('security', '{"twoFactorAuth":false,"sessionTimeout":"30"}'::jsonb),
  ('email', '{"smtpHost":"smtp.iktissad.com","smtpPort":"587","smtpUser":"noreply@iktissad.com"}'::jsonb),
  ('backup', '{"autoBackup":"weekly"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
