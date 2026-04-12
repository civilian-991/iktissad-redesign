# API: Admin

All routes under `/api/admin/`. All require authenticated admin session.

**Auth:** All admin routes require `requireAuth()`. Most use `createAdminClient()` for writes.

---

## `/api/admin/roles`

### GET /api/admin/roles
List all admin users with their roles.

**Tables:** admin_roles (SELECT), users (JOIN)  
**Auth:** Required (super_admin)

### POST /api/admin/roles
Assign or update an admin role for a user.

**Body:** `{ userId, role: 'super_admin'|'editor'|'writer'|'finance'|'advertiser_manager', permissions? }`  
**Tables:** admin_roles (UPSERT), users (SELECT)  
**Auth:** Required (super_admin)

---

## `/api/admin/roles/[userId]`

### PUT /api/admin/roles/[userId]
Update role/permissions for a specific admin user.

**Tables:** admin_roles (UPDATE)  
**Auth:** Required (super_admin)

### DELETE /api/admin/roles/[userId]
Remove admin access from a user.

**Tables:** admin_roles (DELETE)  
**Auth:** Required (super_admin)

---

## `/api/admin/notifications`

### GET /api/admin/notifications
List admin notifications, optionally filtered by is_read.

**Tables:** admin_notifications (SELECT)  
**Auth:** Required

### POST /api/admin/notifications
Create a manual admin notification.

**Tables:** admin_notifications (INSERT)  
**Auth:** Required

---

## `/api/admin/notifications/[id]`

### PUT /api/admin/notifications/[id]
Mark notification as read.

**Tables:** admin_notifications (UPDATE)  
**Auth:** Required

### DELETE /api/admin/notifications/[id]
Delete notification.

**Tables:** admin_notifications (DELETE)  
**Auth:** Required

---

## `/api/admin/audit-log`

### GET /api/admin/audit-log
Paginated audit log with optional filters (actor, resource_type, resource_id, date range).

**Tables:** audit_log (SELECT)  
**Auth:** Required (super_admin)

---

## `/api/admin/assignments`

### GET /api/admin/assignments
List article assignments, filter by assignee or article.

**Tables:** article_assignments (SELECT)  
**Auth:** Required

### POST /api/admin/assignments
Assign a user to an article with a role.

**Tables:** article_assignments (INSERT)  
**Auth:** Required (editor+)

---

## `/api/admin/webhooks`

### GET /api/admin/webhooks
List all configured webhook endpoints.

**Tables:** webhooks (SELECT)  
**Auth:** Required

### POST /api/admin/webhooks
Create a new webhook endpoint.

**Body:** `{ name, url, secret, events[] }`  
**Tables:** webhooks (INSERT)  
**Auth:** Required

---

## `/api/admin/webhooks/[id]`

### GET /api/admin/webhooks/[id]
Get webhook details.

### PUT /api/admin/webhooks/[id]
Update webhook configuration.

**Tables:** webhooks (UPDATE)

### DELETE /api/admin/webhooks/[id]
Delete webhook.

**Tables:** webhooks (DELETE)

---

## `/api/admin/webhooks/[id]/test`

### POST /api/admin/webhooks/[id]/test
Send a test payload to the webhook URL.

**Tables:** webhooks (SELECT), webhook_deliveries (INSERT)

---

## `/api/admin/webhooks/[id]/deliveries`

### GET /api/admin/webhooks/[id]/deliveries
List delivery history for a webhook.

**Tables:** webhook_deliveries (SELECT)

---

## `/api/admin/automations`

### GET /api/admin/automations
List all automation rules.

**Tables:** automation_rules (SELECT)  
**Auth:** Required

### POST /api/admin/automations
Create a custom automation rule.

**Tables:** automation_rules (INSERT)

---

## `/api/admin/automations/[id]`

### PUT /api/admin/automations/[id]
Update rule config or toggle enabled state.

**Tables:** automation_rules (UPDATE)

### DELETE /api/admin/automations/[id]
Delete automation rule.

**Tables:** automation_rules (DELETE)

---

## `/api/admin/api-keys`

### GET /api/admin/api-keys
List API keys (shows prefix, never full key).

**Tables:** api_keys (SELECT)  
**Auth:** Required (super_admin)

### POST /api/admin/api-keys
Generate a new API key (returns raw key once, stores hash).

**Tables:** api_keys (INSERT)  
**Auth:** Required

---

## `/api/admin/api-keys/[id]`

### PUT /api/admin/api-keys/[id]
Update key name, scopes, or rate limit.

### DELETE /api/admin/api-keys/[id]
Revoke (delete) API key.

**Tables:** api_keys (DELETE)

---

## `/api/admin/api-keys/[id]/usage`

### GET /api/admin/api-keys/[id]/usage
View usage logs for a specific API key.

**Tables:** api_usage_log (SELECT)

---

## `/api/admin/revenue`

### GET /api/admin/revenue
Revenue summary: MRR, ARR, churn, new subscribers.

**Tables:** subscribers (SELECT), payments (SELECT)  
**Auth:** Required (finance+)

---

## `/api/admin/revenue-attribution`

### GET /api/admin/revenue-attribution
Attribution report: which articles drove conversions.

**Tables:** conversion_touches (SELECT), articles (JOIN)  
**Auth:** Required

---

## `/api/admin/reading-analytics`

### GET /api/admin/reading-analytics
Article reading depth analytics: avg scroll depth, read-through rate, time on page.

**Tables:** article_reads (SELECT)  
**Auth:** Required

---

## `/api/admin/perf-report`

### GET /api/admin/perf-report
Content performance report: top articles by views, engagement.

**Tables:** articles (SELECT), article_reads (SELECT)  
**Auth:** Required

---

## `/api/admin/content-gap`

### GET /api/admin/content-gap
AI-powered content gap analysis: topics with high search, low coverage.

**Tables:** articles (SELECT), sections (SELECT)  
**Auth:** Required

---

## `/api/admin/calendar`

### GET /api/admin/calendar
Editorial calendar: articles scheduled or in review by date.

**Tables:** articles (SELECT)  
**Auth:** Required

---

## `/api/admin/ab-tests`

### GET /api/admin/ab-tests
List A/B test configurations and results.

**Auth:** Required

---

## `/api/admin/social-accounts`

### GET /api/admin/social-accounts
List connected social media accounts for automation.

**Auth:** Required

---

## `/api/admin/export/subscribers`

### GET /api/admin/export/subscribers
Export subscriber list as CSV.

**Tables:** subscribers (SELECT)  
**Auth:** Required (finance+)

---

## `/api/admin/db-health`

### GET /api/admin/db-health
Database health check: slow queries, index usage, table sizes.

**Tables:** pg_stat_* system views  
**Auth:** Required (super_admin)

---

## Phase 7 — Analytics & Insights Routes

---

## `/api/admin/analytics/realtime`

### GET /api/admin/analytics/realtime
Real-time editorial dashboard: active readers, trending articles, top sections, breaking news performance.

**Tables:** article_reads (SELECT), articles (SELECT), sections (JOIN)  
**Auth:** Required  
**Returns:** `{ data: { activeReaders, trendingArticles[], topSections[], breakingPerformance[], timestamp } }`

---

## `/api/admin/headline-tests`

### GET /api/admin/headline-tests
List all headline A/B tests. Filterable by status and articleId.

**Query params:** `status` (running|completed|paused), `articleId`  
**Tables:** headline_tests (SELECT), articles (JOIN)  
**Auth:** Required  
**Returns:** `{ data: HeadlineTest[] }`

### POST /api/admin/headline-tests
Create a new headline A/B test.

**Body:** `{ articleId: UUID, variants: string[] (2-5), minSample?: number (100-10000) }`  
**Tables:** headline_tests (INSERT)  
**Auth:** Required  
**Returns:** `{ data: HeadlineTest }` — HTTP 201

---

## `/api/admin/headline-tests/[id]`

### GET /api/admin/headline-tests/[id]
Get a single headline test with details.

**Tables:** headline_tests (SELECT), articles (JOIN)  
**Auth:** Required

### PUT /api/admin/headline-tests/[id]
Update test status or declare winner.

**Body:** `{ status?: 'running'|'paused'|'completed', winnerIndex?: number }`  
**Tables:** headline_tests (UPDATE)  
**Auth:** Required

---

## `/api/headline-test-track`

### GET /api/headline-test-track?articleId=...
Get assigned headline variant for a reader (cookie-based consistent assignment).

**Tables:** headline_tests (SELECT)  
**Auth:** None (public)  
**Sets cookie:** `ikt_ab_<testId>` for 30 days

### POST /api/headline-test-track
Track impression or click for a headline test variant.

**Body:** `{ testId, action: 'impression'|'click' }`  
**Tables:** headline_tests (UPDATE variants JSONB)  
**Auth:** None (public tracking)  
**Auto-completion:** When all variants reach min_sample impressions, picks winner by highest CTR

---

## `/api/admin/analytics/segments`

### GET /api/admin/analytics/segments
Audience segmentation: new/returning, subscriber/free, by country, by section preference.

**Query params:** `period` (days, default 30)  
**Tables:** reading_sessions (SELECT), subscribers (SELECT), articles (SELECT), sections (JOIN)  
**Auth:** Required  
**Returns:** `{ data: { newVsReturning[], subscriberVsFree[], byCountry[], bySectionPreference[], period, totalReaders } }`

---

## `/api/analytics/share-event`

### POST /api/analytics/share-event
Track when an article is shared via share buttons.

**Body:** `{ articleId: UUID, platform: 'twitter'|'linkedin'|'whatsapp'|'facebook'|'telegram'|'copy_link'|'email', sessionId? }`  
**Tables:** share_events (INSERT)  
**Auth:** None (public tracking; auto-associates user if logged in)  
**Returns:** `{ data: { ok: true } }`

---

## `/api/admin/analytics/shares`

### GET /api/admin/analytics/shares
Share analytics dashboard: total shares, platform breakdown, most shared articles.

**Query params:** `period` (days, default 30)  
**Tables:** share_events (SELECT), articles (JOIN)  
**Auth:** Required  
**Returns:** `{ data: { totalShares, platformBreakdown[], mostShared[] } }`

---

## `/api/admin/analytics/seo-scores`

### GET /api/admin/analytics/seo-scores
SEO score for each published article. Score based on: title length, meta description, featured image, meta title, excerpt.

**Query params:** `page`, `pageSize`, `sortBy` (score|date)  
**Tables:** articles (SELECT)  
**Auth:** Required  
**Returns:** `{ data: ArticleSeoScore[], pagination }`  
**Score criteria:** title 50-60 chars, meta_description 120-160 chars, featured_image present, meta_title 30-70 chars, excerpt 50+ chars

---

## Phase 9 — Infrastructure Routes

---

## `/api/admin/backup-status`



### GET /api/admin/backup-status
Database backup status: connection health, database size, table count, Supabase project info.

**Tables:** sections (connectivity check), information_schema.tables (table count)  
**Auth:** Required  
**Returns:** `{ data: { databaseSize: string, tableCount: number, connectionHealthy: boolean, oldestMigration: string|null, latestMigration: string|null, serverTime: string, supabaseUrl: string } }`  
**Status:** 200 when connected, 503 when database unreachable

---

## Phase 10 — API & Integrations Routes

---

## `/api/admin/social-accounts`



### GET /api/admin/social-accounts
List all connected social media accounts.

**Tables:** social_accounts (SELECT)  
**Auth:** Required  
**Returns:** `{ data: SocialAccount[] }`

### POST /api/admin/social-accounts
Connect a new social media account.

**Body:** `{ platform: 'twitter'|'linkedin'|'telegram', accountName: string, accessToken: string, refreshToken?: string, tokenExpiresAt?: string }`  
**Tables:** social_accounts (INSERT)  
**Auth:** Required  
**Returns:** `{ data: SocialAccount }` — HTTP 201

---

## `/api/admin/social/post`



### POST /api/admin/social/post
Manually trigger social media posting for an article.

**Body:** `{ articleId: UUID, platforms?: ('twitter'|'linkedin'|'telegram')[] }`  
**Tables:** articles (SELECT), social_accounts (SELECT), social_post_log (INSERT)  
**Auth:** Required  
**Returns:** `{ data: { results: PostResult[] } }`  
**PostResult shape:** `{ platform: string, status: 'sent'|'failed', postUrl?: string, error?: string }`

---

## `/api/admin/archival/run`



### POST /api/admin/archival/run
Trigger content archival for articles older than threshold.

**Body:** `{ thresholdDays?: number }` (default: 730 = 2 years)  
**Tables:** articles (SELECT + UPDATE archived, archived_at)  
**Auth:** Required  
**Returns:** `{ data: { archivedCount: number, threshold: string, oldestArchived: string|null } }`

---

## `/api/admin/archival/[id]`



### DELETE /api/admin/archival/[id]
Un-archive a specific article (restore to active).

**Tables:** articles (UPDATE archived=false, archived_at=null)  
**Auth:** Required  
**Returns:** `{ data: { restored: true } }`

---

## `/api/articles/[id]/apple-news`



### GET /api/articles/[id]/apple-news
Export article in Apple News JSON format.

**Tables:** articles (SELECT with author + section joins)  
**Auth:** None (public, RLS applies — only published articles)  
**Returns:** Apple News Format JSON document (version 1.7)  
**Content:** title, body components (parsed from HTML), images, metadata (datePublished, author, section, keywords)

---

## `/api/openapi`



### GET /api/openapi
Serve the OpenAPI 3.0 specification as JSON.

**Auth:** None (public)  
**Returns:** OpenAPI spec object  
**Cache:** public, max-age=3600
