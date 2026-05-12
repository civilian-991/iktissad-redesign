-- Remove placeholder/seed media rows.
-- These were inserted by supabase/seed.sql with relative URLs like
-- /uploads/2025/11/... pointing at files that never existed in storage,
-- which made the admin media library show only broken thumbnails.
-- Real uploads via the admin uploader write absolute Supabase Storage URLs.

DELETE FROM media WHERE url LIKE '/uploads/%';
