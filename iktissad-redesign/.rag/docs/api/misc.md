# API: Miscellaneous Routes

Routes for search, media, users, profiles, ads, analytics, auth, bookmarks, and other utilities.

---

## SEARCH

### GET /api/search
Full-text + semantic search across articles.

**Query params:** `q` (query string), `page`, `pageSize`, `section`, `sector`  
**Tables:** articles (SELECT with tsvector + optional vector similarity)  
**Auth:** None  
**Returns:** `ApiResponse<Article[]>` with pagination

### GET /api/search/similar?articleId=...
Find semantically similar articles using vector embeddings.

**Tables:** articles (SELECT with pgvector similarity)  
**Auth:** None

### GET /api/search/trending
Get trending search terms and popular articles.

**Tables:** articles (SELECT ORDER BY views)  
**Auth:** None

---

## MEDIA

### GET /api/media
List media library with optional folder/tag filter.

**Query params:** `folder`, `mimeType`, `tags`, `page`, `pageSize`, `search`  
**Tables:** media (SELECT)  
**Auth:** Required

### POST /api/media
Upload and register a media file (multipart/form-data).

**Tables:** media (INSERT)  
**Auth:** Required  
**Storage:** Uploads to Supabase Storage bucket based on folder

---

### GET /api/media/[id]
Get media item detail.

**Tables:** media (SELECT)  
**Auth:** Required

### PUT /api/media/[id]
Update media metadata (alt, tags, description, folder).

**Tables:** media (UPDATE)  
**Auth:** Required

### DELETE /api/media/[id]
Delete media record and storage object.

**Tables:** media (DELETE)  
**Auth:** Required

---

## USERS (Admin CMS Staff)

### GET /api/users
List CMS admin users.

**Query params:** `role`, `status`, `search`, `page`, `pageSize`  
**Tables:** users (SELECT)  
**Auth:** Required (admin only)

### POST /api/users
Create a new CMS user (also provisions Supabase Auth account).

**Body:** `{ email, name, role, department?, avatar? }`  
**Tables:** users (INSERT), admin_roles (INSERT)  
**Auth:** Required (super_admin)  
**Side effect:** Creates Supabase Auth user via admin API

---

### GET /api/users/[id]
Get user detail.

**Tables:** users (SELECT), admin_roles (SELECT)  
**Auth:** Required

### PUT /api/users/[id]
Update user profile.

**Tables:** users (UPDATE)  
**Auth:** Required

### DELETE /api/users/[id]
Deactivate/delete user.

**Tables:** users (DELETE), admin_roles (DELETE)  
**Auth:** Required (super_admin)

---

## PROFILES

### GET /api/profiles
List entity profiles (companies, orgs).

**Query params:** `type`, `sectorId`, `countryId`, `search`, `page`, `pageSize`  
**Tables:** profiles (SELECT)  
**Auth:** None (public)

### POST /api/profiles
Create a profile.

**Tables:** profiles (INSERT)  
**Auth:** Required

---

### GET /api/profiles/[id]
Get profile detail.

**Tables:** profiles (SELECT)  
**Auth:** None

### PUT /api/profiles/[id]
Update profile.

**Tables:** profiles (UPDATE)  
**Auth:** Required

### DELETE /api/profiles/[id]
Delete profile.

**Tables:** profiles (DELETE)  
**Auth:** Required

---

## ADS

### GET /api/ads
List ad creatives.

**Tables:** ads (SELECT)  
**Auth:** Required (advertiser_manager)

### POST /api/ads
Create an ad.

**Tables:** ads (INSERT)  
**Auth:** Required

---

### GET /api/ads/[id]
Get ad detail with impression/click stats.

### PUT /api/ads/[id]
Update ad creative or placement.

### DELETE /api/ads/[id]
Delete ad.

---

### GET /api/advertisers
List advertisers.

**Tables:** advertisers (SELECT)  
**Auth:** Required

### POST /api/advertisers
Create advertiser.

**Tables:** advertisers (INSERT)

---

### GET /api/advertisers/[id]
Get advertiser with campaigns.

### PUT /api/advertisers/[id] / DELETE /api/advertisers/[id]
Update or delete advertiser.

---

### GET /api/ad-campaigns
List campaigns.

**Tables:** ad_campaigns (SELECT)  
**Auth:** Required

### POST /api/ad-campaigns
Create campaign.

### GET/PUT/DELETE /api/ad-campaigns/[id]
CRUD for a campaign.

---

## ANALYTICS

### POST /api/analytics/read
Track an article read event.

**Body:** `{ articleId, sessionId, subscriberId?, timeOnPage?, scrollDepth?, readThrough?, referrer? }`  
**Tables:** article_reads (INSERT)  
**Auth:** None (public tracking)

### POST /api/analytics/spreads
Track a magazine spread view.

**Body:** `{ issueId, spreadNumber, sessionId, subscriberId?, dwellSeconds? }`  
**Tables:** magazine_spread_reads (INSERT)  
**Auth:** None

### GET /api/analytics/active
Get currently active readers (real-time).

**Tables:** article_reads (SELECT recent sessions)  
**Auth:** Required

---

## AUTH

### GET /api/auth/me
Get current authenticated user's profile.

**Tables:** users (SELECT), admin_roles (SELECT)  
**Auth:** Required  
**Returns:** `{ user, role, permissions }`

### POST /api/auth/turnstile
Validate a Cloudflare Turnstile CAPTCHA token.

**Auth:** None  
**Rate limit:** 10 req/min per IP  
**Returns:** `{ success: boolean }`

### GET /api/auth/csrf
Get (or generate) a CSRF token for the current session.

**Auth:** None (sets cookie on first call)  
**Cookie set:** `csrf-token` — `SameSite=strict; HttpOnly=false; Path=/`  
**Returns:** `{ data: { token: string } }`  
**Note:** Automatically called by `api-client.ts` before first mutation. Token must be sent as `X-CSRF-Token` header on all POST/PUT/PATCH/DELETE requests.

### POST /api/auth/2fa/recovery-codes
Generate a new set of 10 TOTP recovery codes for the authenticated user. Deletes all existing codes first.

**Auth:** Required (AAL1 session)  
**Tables:** totp_recovery_codes (DELETE + INSERT)  
**Returns:** `{ data: { codes: string[] } }` — plaintext shown once, not retrievable again  
**Status:** 201

### DELETE /api/auth/2fa/recovery-codes
Revoke all recovery codes for the authenticated user (called when 2FA is disabled).

**Auth:** Required  
**Tables:** totp_recovery_codes (DELETE)  
**Returns:** `{ data: { success: true } }`

### POST /api/auth/2fa/recover
Exchange a recovery code for access when the user has lost their TOTP app. Marks the code as used.

**Auth:** Required (valid AAL1 session must already exist)  
**Rate limit:** 10 req/min per IP  
**Body:** `{ code: string }` — plaintext recovery code  
**Tables:** totp_recovery_codes (SELECT + UPDATE used_at)  
**Returns:** `{ data: { success: true } }` — frontend redirects to /admin after success  
**Errors:** 400 if code wrong or already used; 401 if no session

---

## GDPR / USER DATA

### GET /api/user/data-export
Export all personal data for the current authenticated user as a JSON download.

**Auth:** Required  
**Rate limit:** 10 req/min per IP  
**Tables:** auth.users (meta), users, newsletter_subscribers, subscriptions, comments  
**Response headers:** `Content-Disposition: attachment; filename="iktissad-data-export.json"`  
**Returns:** JSON blob with keys: `auth`, `profile`, `newsletter`, `subscription`, `comments`

### DELETE /api/user/delete-account
Permanently delete the current user's account. Anonymises content, removes subscription, deletes Supabase Auth record.

**Auth:** Required + CSRF  
**Rate limit:** 10 req/min per IP  
**Tables:** users (UPDATE name/email to anonymised), newsletter_subscribers (DELETE), comments (UPDATE body to [deleted]), subscriptions (UPDATE status)  
**Side effect:** Calls `admin.auth.admin.deleteUser(userId)` — hard-deletes from Supabase Auth  
**Returns:** `{ data: { success: true } }`

---

## BOOKMARKS

### GET /api/bookmarks
List current user's bookmarked articles.

**Tables:** bookmarks (SELECT), articles (JOIN)  
**Auth:** Required (user session)

### POST /api/bookmarks
Add a bookmark.

**Body:** `{ articleId }`  
**Tables:** bookmarks (INSERT)  
**Auth:** Required

---

### DELETE /api/bookmarks/[articleId]
Remove a bookmark.

**Tables:** bookmarks (DELETE)  
**Auth:** Required

---

## SETTINGS

### GET /api/settings
Get all site settings.

**Tables:** site_settings (SELECT)  
**Auth:** Required

### PUT /api/settings
Update one or more setting keys.

**Body:** `{ [key: string]: object }`  
**Tables:** site_settings (UPSERT)  
**Auth:** Required (super_admin)

---

### POST /api/settings/change-password
Change the current admin user's password via Supabase Auth.

**Tables:** Supabase Auth (updateUser)  
**Auth:** Required

---

## UTILITY

### GET /api/market-data
Fetch live market data (currency rates, stock indices).

**Auth:** None

### POST /api/contact
Submit contact form message.

**Auth:** None (public)

### GET /api/preview/token
Generate a preview token for draft article access.

**Tables:** articles (SELECT), preview_tokens (INSERT)  
**Auth:** Required

### GET /api/pdf-proxy
Proxy PDF file through server to add auth headers.

**Auth:** Required (subscriber)

### POST /api/indexnow/key
Return the IndexNow key file for search engine verification.

**Auth:** None

### POST /api/graphql
GraphQL endpoint for public API access.

**Auth:** API key (Bearer in Authorization header)

### GET/POST /api/mcp
Model Context Protocol server endpoint for AI tool access.

**Auth:** Required

### GET /api/v1/articles
**GET /api/v1/articles/[slug]**  
**GET /api/v1/sections**  
**GET /api/v1/sectors**  
**GET /api/v1/series**  
**GET /api/v1/series/[slug]**

Public REST API for third-party integrations. Requires API key (`Authorization: Bearer <key>`).
Rate-limited per key. Returns published data only. Tables: articles, sections, sectors, article_series.

---

## Phase 9 — Infrastructure Routes

---

## `/api/health`



### GET /api/health
Public health check endpoint for uptime monitoring services. No authentication required.

**Auth:** None  
**Checks:** Database connectivity (SELECT on sections table), response latency, server uptime (process.uptime()), app version (package.json)  
**Returns 200:** `{ status: "healthy", version: string, uptime: number, timestamp: string, checks: { database: { ok: true, latencyMs: number } } }`  
**Returns 503:** Same shape but `status: "degraded"` and `checks.database.ok: false` with error message  
**Cache-Control:** no-store  
**Use for:** Uptime monitoring (e.g., UptimeRobot, Vercel Checks), load balancer health checks
