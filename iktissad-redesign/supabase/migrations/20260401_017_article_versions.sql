-- =============================================================================
-- Migration: 20260401_017_article_versions
-- article_versions: full content versioning with AI change summaries
-- =============================================================================

create table if not exists article_versions (
  id              uuid        primary key default gen_random_uuid(),
  article_id      uuid        not null references articles(id) on delete cascade,
  version_number  integer     not null,
  title           text        not null default '',
  title_en        text        not null default '',
  excerpt         text        not null default '',
  content         text        not null default '',
  body            jsonb,
  changed_by      uuid        references auth.users(id) on delete set null,
  summary         text,
  created_at      timestamptz not null default now(),
  unique (article_id, version_number)
);

-- Fast lookup of all versions for an article (timeline)
create index if not exists idx_article_versions_article_id
  on article_versions(article_id, version_number desc);

-- Efficient latest-version lookup
create index if not exists idx_article_versions_latest
  on article_versions(article_id, created_at desc);

-- =============================================================================
-- Row-Level Security
-- =============================================================================

alter table article_versions enable row level security;

-- Authenticated users (editors, admins) can read all versions
create policy "Authenticated users can read article versions"
  on article_versions
  for select
  to authenticated
  using (true);

-- Authenticated users can create versions
create policy "Authenticated users can create article versions"
  on article_versions
  for insert
  to authenticated
  with check (true);

-- Only the version creator can update (for summary updates)
create policy "Version creator can update their version"
  on article_versions
  for update
  to authenticated
  using (auth.uid() = changed_by);
