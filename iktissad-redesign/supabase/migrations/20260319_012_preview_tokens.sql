-- =============================================================================
-- Migration: 20260319_012_preview_tokens
-- preview_tokens: tokenized preview links for draft articles
-- Expires after 48 hours by default.
-- =============================================================================

create table if not exists preview_tokens (
  id           uuid        primary key default gen_random_uuid(),
  token        text        not null unique,
  article_id   uuid        not null references articles(id) on delete cascade,
  created_by   uuid        references auth.users(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '48 hours'),
  used_count   integer     not null default 0,
  created_at   timestamptz not null default now()
);

-- Lookup by token (primary access pattern)
create index if not exists idx_preview_tokens_token
  on preview_tokens(token);

-- Look up all tokens for a given article
create index if not exists idx_preview_tokens_article_id
  on preview_tokens(article_id);

-- Efficient cleanup of expired tokens
create index if not exists idx_preview_tokens_expires_at
  on preview_tokens(expires_at);

-- =============================================================================
-- Row-Level Security
-- =============================================================================

alter table preview_tokens enable row level security;

-- Any authenticated user (editors, writers) may create a preview token
create policy "Authenticated users can create preview tokens"
  on preview_tokens
  for insert
  to authenticated
  with check (true);

-- Tokens are publicly readable — this is intentional so the /preview/[token]
-- page can validate the token without requiring the viewer to be signed in.
create policy "Preview tokens are readable by token lookup"
  on preview_tokens
  for select
  using (true);

-- Only the creator may delete their own tokens
create policy "Creators can delete their own tokens"
  on preview_tokens
  for delete
  to authenticated
  using (auth.uid() = created_by);

-- =============================================================================
-- Cleanup note
-- =============================================================================
-- Expired tokens are not deleted automatically by this migration.
-- Schedule a periodic job (e.g. pg_cron or an Edge Function cron) that runs:
--
--   DELETE FROM preview_tokens
--   WHERE expires_at < now() - interval '7 days';
--
-- This gives a 7-day grace window beyond expiry before hard deletion.
-- =============================================================================
