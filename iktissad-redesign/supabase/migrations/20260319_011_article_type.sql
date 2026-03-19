-- Migration 011: Add article_type column to articles table
-- Enables editorial article type classification (news, report, analysis, interview, opinion)
-- This drives AI prompts, word count targets, and UI badges.

ALTER TABLE articles
ADD COLUMN IF NOT EXISTS article_type TEXT
  CHECK (article_type IN ('news', 'report', 'analysis', 'interview', 'opinion'))
  DEFAULT 'news';

COMMENT ON COLUMN articles.article_type IS 'Editorial article type — drives AI prompts and word count targets';
