# Schema: Content Domain

Tables covering articles, editorial workflow, media, and user engagement.

---

## `articles`

Primary content table. Each row is one article (news, report, analysis, interview, or opinion).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| slug | TEXT | UNIQUE NOT NULL | URL-safe identifier |
| title | TEXT | NOT NULL | Arabic title |
| title_en | TEXT | DEFAULT '' | English title |
| excerpt | TEXT | DEFAULT '' | Arabic excerpt |
| excerpt_en | TEXT | DEFAULT '' | English excerpt |
| content | TEXT | DEFAULT '' | HTML (from TipTap) — legacy field |
| content_en | TEXT | DEFAULT '' | English HTML |
| body | JSONB | DEFAULT '[]' | Block-based content (TipTap JSON or ArticleBlock[]) |
| deck | TEXT | DEFAULT '' | Arabic subtitle/kicker |
| deck_en | TEXT | DEFAULT '' | English deck |
| accent_color | TEXT | | Hex color for article theming |
| featured_image | TEXT | DEFAULT '' | Image URL |
| featured_image_focal_x | FLOAT | DEFAULT 0.5 | Smart crop focal point X (0–1) |
| featured_image_focal_y | FLOAT | DEFAULT 0.5 | Smart crop focal point Y (0–1) |
| section_id | UUID | FK → sections(id) ON DELETE SET NULL | |
| sector_id | UUID | FK → sectors(id) ON DELETE SET NULL | |
| country_id | UUID | FK → countries(id) ON DELETE SET NULL | |
| author_id | UUID | FK → users(id) ON DELETE SET NULL | |
| tags | TEXT[] | DEFAULT '{}' | Free-form tag array |
| status | article_status | NOT NULL DEFAULT 'draft' | enum: published, draft, review, scheduled |
| article_type | TEXT | | enum: news, report, analysis, interview, opinion |
| views | INT | DEFAULT 0 | Incremented on each GET |
| featured | BOOLEAN | | Homepage featured flag |
| editor_choice | BOOLEAN | | Editor's pick flag |
| is_breaking | BOOLEAN | DEFAULT false | Breaking news flag |
| is_paywalled | BOOLEAN | NOT NULL DEFAULT false | Paywall gate flag (Phase 4) |
| article_price | NUMERIC(10,2) | | Per-article micropayment price; null = use global default from site_settings paywall key |
| published_at | TIMESTAMPTZ | | When set live |
| meta_title | TEXT | | SEO title (max 120 chars) |
| meta_description | TEXT | | SEO description (max 320 chars) |
| og_image | TEXT | | OpenGraph image URL |
| canonical_url | TEXT | | Canonical URL override |
| no_index | BOOLEAN | | Robots noindex flag |
| summary | TEXT | | AI-generated Arabic TLDR (2-3 sentences, Phase 5) |
| summary_en | TEXT | | AI-generated English TLDR (2-3 sentences, Phase 5) |
| embedding | VECTOR(1536) | | pgvector semantic embedding |
| search_vector | TSVECTOR | | Full-text search index |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Auto-updated by trigger |

**Indexes:** slug, section_id, sector_id, country_id, author_id, status, published_at DESC, GIN on search_vector, HNSW on embedding, partial index on id WHERE summary IS NULL AND status='published' (for backfill queue)

**RLS:** Public SELECT for status='published'. Admin full access. Service role bypasses RLS.

**Joins used in API:** `users:author_id(name,avatar)`, `sections:section_id(slug,name)`, `sectors:sector_id(slug,name)`, `countries:country_id(slug,name)`

---

## `article_reads`

Analytics: tracks each article read session.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| article_id | UUID | NOT NULL FK → articles(id) ON DELETE CASCADE | |
| subscriber_id | UUID | FK → subscribers(id) ON DELETE SET NULL | null for anonymous |
| session_id | TEXT | NOT NULL | Client-generated session |
| time_on_page | INT | DEFAULT 0 | Seconds |
| scroll_depth | NUMERIC(5,2) | DEFAULT 0 | Percent (0–100) |
| read_through | BOOLEAN | DEFAULT false | Reached end of article |
| referrer | TEXT | | HTTP referrer |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** article_id, session_id, created_at DESC

---

## `article_series`

Groups articles into investigative series / dossiers with reading-order navigation.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| slug | TEXT | UNIQUE NOT NULL | |
| title | TEXT | NOT NULL | Arabic title |
| title_en | TEXT | | |
| description | TEXT | | Arabic |
| description_en | TEXT | | |
| cover_image | TEXT | | |
| status | TEXT | DEFAULT 'active' CHECK IN ('active','archived') | |
| created_by | UUID | | references users(id) loosely |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated by trigger |

---

## `series_articles`

Junction table: which articles belong to which series, with order.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| series_id | UUID | FK → article_series(id) ON DELETE CASCADE | |
| article_id | UUID | FK → articles(id) ON DELETE CASCADE | |
| order_index | INT | NOT NULL DEFAULT 0 | Reading order |
| added_at | TIMESTAMPTZ | DEFAULT now() | |

**Unique:** (series_id, article_id)  
**Indexes:** (series_id, order_index), article_id

---

## `article_status_history`

Immutable audit trail for article status transitions.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| article_id | UUID | FK → articles(id) ON DELETE CASCADE | |
| old_status | TEXT | | |
| new_status | TEXT | NOT NULL | |
| changed_by | UUID | FK → users(id) | |
| note | TEXT | | |
| changed_at | TIMESTAMPTZ | DEFAULT now() | |

---

## `article_assignments`

Editorial workflow: assigns a role (writer/editor/photographer/designer) to an article.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| article_id | UUID | FK → articles(id) ON DELETE CASCADE | |
| assignee_id | UUID | FK → users(id) | |
| role | TEXT | CHECK IN ('writer','editor','photographer','designer') | |
| due_date | TIMESTAMPTZ | | |
| note | TEXT | | |
| assigned_at | TIMESTAMPTZ | DEFAULT now() | |
| assigned_by | UUID | FK → users(id) | |

---

## `comments`

Reader comments on articles; moderated before display.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| article_id | UUID | FK → articles(id) ON DELETE CASCADE | |
| user_id | UUID | FK → users(id) | |
| parent_id | UUID | FK → comments(id) | Threaded replies |
| body | TEXT | NOT NULL | Comment content |
| status | TEXT | DEFAULT 'pending' CHECK IN ('pending','approved','rejected','spam') | |
| moderated_by | UUID | FK → users(id) | |
| moderated_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** status, article_id  
**Realtime:** REPLICA IDENTITY FULL enabled

---

## `editorial_notes`

Internal annotations attached to articles for editorial review (not public).

Columns defined in migration `20260319_013_editorial_notes.sql`. Typical structure:
- id, article_id, author_id, body (TEXT), position/range (JSONB for text anchoring), resolved (BOOLEAN), created_at, updated_at

---

## `media`

All uploaded files managed via Supabase Storage.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| url | TEXT | NOT NULL | Public storage URL |
| filename | TEXT | NOT NULL | Original filename |
| mime_type | TEXT | DEFAULT '' | e.g. image/jpeg |
| size | INT | DEFAULT 0 | Bytes |
| alt | TEXT | DEFAULT '' | Arabic alt text |
| alt_en | TEXT | DEFAULT '' | English alt text |
| folder | TEXT | DEFAULT '' | Storage bucket folder |
| tags | JSONB | DEFAULT '[]' | AI-generated tags |
| description | TEXT | DEFAULT '' | AI-generated description |
| uploaded_by | UUID | FK → users(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** folder, GIN on tags  
**Storage buckets:** articles, magazines, media, avatars

---

## `article_related`

Cache table storing top-5 related articles per article, refreshed on publish. Uses cosine similarity scores from article embeddings. Added in Phase 5 (migration `20260413_028_phase5_ai.sql`).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| article_id | UUID | PK (composite), FK → articles(id) ON DELETE CASCADE | Source article |
| related_id | UUID | PK (composite), FK → articles(id) ON DELETE CASCADE | Related article |
| score | FLOAT4 | NOT NULL DEFAULT 0 | Similarity score |
| position | SMALLINT | NOT NULL DEFAULT 0 | Ordering 1-5 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

**Primary key:** (article_id, related_id)  
**Indexes:** (article_id, position)  
**RLS:** SELECT open to all (`USING (true)`). Writes via service role only.

---

## `push_subscriptions`

Web Push API subscriptions for breaking news notifications. Added in Phase 6 (migration `20260414_029_phase6_engagement.sql`).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| user_id | UUID | FK → auth.users(id) ON DELETE SET NULL | null for anonymous |
| endpoint | TEXT | NOT NULL, UNIQUE | Push service endpoint URL |
| p256dh | TEXT | NOT NULL | Client public key |
| auth | TEXT | NOT NULL | Client auth secret |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** endpoint (unique), user_id (partial, WHERE NOT NULL)  
**RLS:** Users can SELECT/INSERT/DELETE own rows. Service role has full access.

---

## `live_blogs`

Live blog sessions attached to articles. Added in Phase 6.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| article_id | UUID | NOT NULL FK → articles(id) ON DELETE CASCADE | |
| status | live_blog_status | NOT NULL DEFAULT 'active' | enum: active, ended |
| started_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| ended_at | TIMESTAMPTZ | | Set when status changes to ended |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** article_id, status (partial WHERE active)  
**RLS:** SELECT open to all.

---

## `live_blog_updates`

Individual timestamped updates within a live blog. Added in Phase 6.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| live_blog_id | UUID | NOT NULL FK → live_blogs(id) ON DELETE CASCADE | |
| content | TEXT | NOT NULL | HTML content of the update |
| author_id | UUID | FK → users(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** (live_blog_id, created_at DESC)  
**RLS:** SELECT open to all.  
**Realtime:** REPLICA IDENTITY FULL enabled for live updates.

---

## `polls`

Reader polls embeddable in articles. Added in Phase 6.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| article_id | UUID | FK → articles(id) ON DELETE CASCADE | |
| question | TEXT | NOT NULL | Poll question text |
| options | JSONB | NOT NULL DEFAULT '[]' | JSON array of option strings |
| status | poll_status | NOT NULL DEFAULT 'active' | enum: active, closed |
| closes_at | TIMESTAMPTZ | | Auto-close time |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** article_id, status  
**RLS:** SELECT open to all.

---

## `poll_votes`

Individual votes on polls. One vote per user/device enforced by unique voter_hash. Added in Phase 6.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| poll_id | UUID | NOT NULL FK → polls(id) ON DELETE CASCADE | |
| option_index | SMALLINT | NOT NULL | 0-based index into poll options |
| user_id | UUID | FK → auth.users(id) ON DELETE SET NULL | null for anonymous |
| voter_hash | TEXT | NOT NULL | UUID stored in localStorage for dedup |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Unique:** (poll_id, voter_hash)  
**Indexes:** poll_id  
**RLS:** SELECT and INSERT open to all.

---

## `article_templates`

Predefined article templates for editors. Added in Phase 6.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL | Arabic name |
| name_en | TEXT | NOT NULL DEFAULT '' | English name |
| description | TEXT | NOT NULL DEFAULT '' | Template description |
| template_body | JSONB | NOT NULL DEFAULT '[]' | TipTap JSON content blocks |
| category | TEXT | NOT NULL DEFAULT 'general' | news, report, interview, opinion, data |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**RLS:** SELECT open to all.  
**Seeded:** News Brief, Market Report, Interview Q&A, Opinion/Editorial, Data Story

---

## `headline_tests`

A/B headline testing. Each row is one test with 2-5 headline variants. Added in Phase 7 (migration `20260415_030_phase7_analytics.sql`).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| article_id | UUID | NOT NULL FK → articles(id) ON DELETE CASCADE | |
| variants | JSONB | NOT NULL DEFAULT '[]' | Array of { title: string, impressions: int, clicks: int } |
| status | TEXT | NOT NULL DEFAULT 'running' CHECK IN ('running', 'completed', 'paused') | |
| winner_index | INT | | Index into variants array |
| min_sample | INT | NOT NULL DEFAULT 1000 | Min impressions per variant before auto-completion |
| created_by | UUID | FK → users(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| completed_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Auto-updated by trigger |

**Indexes:** article_id, status  
**RLS:** Service role full access

---

## `share_events`

Social sharing analytics. One row per share action. Added in Phase 7 (migration `20260415_030_phase7_analytics.sql`).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| article_id | UUID | NOT NULL FK → articles(id) ON DELETE CASCADE | |
| platform | TEXT | NOT NULL CHECK IN ('twitter', 'linkedin', 'whatsapp', 'facebook', 'telegram', 'copy_link', 'email') | |
| user_id | UUID | FK → users(id) ON DELETE SET NULL | null for anonymous |
| session_id | TEXT | | Browser session ID |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** article_id, platform, created_at DESC  
**RLS:** Public INSERT. Service role full access.

---

## `social_accounts`

Connected social media accounts for automated posting. Added in Phase 10 (migration `20260416_031_phase10_api_integrations.sql`).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| platform | TEXT | NOT NULL CHECK IN ('twitter', 'linkedin', 'telegram') | |
| account_name | TEXT | NOT NULL DEFAULT '' | Display name / handle |
| access_token | TEXT | NOT NULL DEFAULT '' | OAuth access token (encrypted at rest) |
| refresh_token | TEXT | | OAuth refresh token |
| token_expires_at | TIMESTAMPTZ | | Token expiry |
| active | BOOLEAN | NOT NULL DEFAULT true | |
| metadata | JSONB | DEFAULT '{}' | Platform-specific data |
| created_by | UUID | FK → users(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Auto-updated by trigger |

**Indexes:** platform, active (partial WHERE true)  
**RLS:** Service role full access.

---

## `social_post_log`

Audit trail of social media posts. One row per post attempt. Added in Phase 10.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| article_id | UUID | NOT NULL FK → articles(id) ON DELETE CASCADE | |
| platform | TEXT | NOT NULL CHECK IN ('twitter', 'linkedin', 'telegram') | |
| post_content | TEXT | NOT NULL DEFAULT '' | Content that was posted |
| post_url | TEXT | | URL of the resulting post |
| status | TEXT | NOT NULL DEFAULT 'pending' CHECK IN ('pending', 'sent', 'failed') | |
| error_message | TEXT | | Error details if failed |
| posted_at | TIMESTAMPTZ | | When successfully posted |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** article_id, status  
**RLS:** Service role full access.

---

## Phase 10 additions to `articles` table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| auto_post | BOOLEAN | NOT NULL DEFAULT true | Auto-post to social on publish |
| archived | BOOLEAN | NOT NULL DEFAULT false | Content archival flag |
| archived_at | TIMESTAMPTZ | | When archived |

**Index:** idx_articles_archived (partial WHERE archived = false)
