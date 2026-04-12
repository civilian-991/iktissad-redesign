# API: Engagement

All Phase 6 engagement routes — push notifications, live blogs, polls, and templates.

---

## `/api/notifications/push/subscribe`

### POST /api/notifications/push/subscribe
Subscribe a browser to web push notifications.

**Body:** `{ endpoint: string, keys: { p256dh: string, auth: string } }`  
**Tables:** push_subscriptions (UPSERT on endpoint)  
**Auth:** Optional (associates with user if logged in)  
**Returns:** `{ data: { id, endpoint, created_at } }` — HTTP 201

---

## `/api/notifications/push/unsubscribe`

### POST /api/notifications/push/unsubscribe
Remove a push subscription.

**Body:** `{ endpoint: string }`  
**Tables:** push_subscriptions (DELETE)  
**Auth:** None  
**Returns:** `{ data: { success: true } }`

---

## `/api/admin/notifications/push/send`

### POST /api/admin/notifications/push/send
Broadcast a web push notification to all subscribers. Uses web-push library with VAPID keys.

**Body:** `{ title: string, body: string, url?: string, articleId?: string }`  
**Tables:** push_subscriptions (SELECT, DELETE expired)  
**Auth:** Required  
**Env:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`  
**Returns:** `{ data: { sent: number, failed: number, total: number } }`

---

## `/api/live-blogs`

### GET /api/live-blogs
List live blogs. Filterable by articleId and status.

**Query:** `?articleId=UUID&status=active|ended`  
**Tables:** live_blogs (SELECT), articles (JOIN)  
**Auth:** None (public)

### POST /api/live-blogs
Start a new live blog for an article.

**Body:** `{ articleId: string }`  
**Tables:** live_blogs (INSERT)  
**Auth:** Required  
**Returns:** `{ data: LiveBlog }` — HTTP 201

---

## `/api/live-blogs/[id]`

### GET /api/live-blogs/[id]
Get a live blog with all its updates.

**Tables:** live_blogs (SELECT), live_blog_updates (SELECT), articles (JOIN), users (JOIN)  
**Auth:** None (public)  
**Returns:** `{ data: { ...blog, updates: LiveBlogUpdate[] } }`

### PUT /api/live-blogs/[id]
Update a live blog (e.g., end it).

**Body:** `{ status?: 'active' | 'ended' }`  
**Tables:** live_blogs (UPDATE)  
**Auth:** Required

---

## `/api/live-blogs/[id]/updates`

### POST /api/live-blogs/[id]/updates
Add a new update to a live blog. Triggers Supabase Realtime for connected clients.

**Body:** `{ content: string }`  
**Tables:** live_blog_updates (INSERT)  
**Auth:** Required  
**Returns:** `{ data: LiveBlogUpdate }` — HTTP 201

---

## `/api/polls`

### GET /api/polls
List polls, optionally filtered by article.

**Query:** `?articleId=UUID`  
**Tables:** polls (SELECT)  
**Auth:** None (public)

---

## `/api/polls/[id]/vote`

### POST /api/polls/[id]/vote
Cast a vote on a poll. One vote per voter_hash (enforced by unique constraint).

**Body:** `{ optionIndex: number, voterHash: string }`  
**Tables:** polls (SELECT), poll_votes (INSERT)  
**Auth:** Optional (associates with user if logged in)  
**Returns:** `{ data: { vote, counts: Record<number, number>, total: number } }` — HTTP 201  
**Errors:** 404 if poll not found, 400 if closed, 409 if already voted

---

## `/api/admin/polls`

### GET /api/admin/polls
List all polls with vote counts.

**Tables:** polls (SELECT), poll_votes (SELECT), articles (JOIN)  
**Auth:** Required

### POST /api/admin/polls
Create a new poll.

**Body:** `{ question: string, options: string[], articleId?: string, closesAt?: string }`  
**Tables:** polls (INSERT)  
**Auth:** Required  
**Returns:** `{ data: Poll }` — HTTP 201

---

## `/api/admin/templates`

### GET /api/admin/templates
List all article templates, ordered by category and name.

**Tables:** article_templates (SELECT)  
**Auth:** Required

### POST /api/admin/templates
Create a new article template.

**Body:** `{ name: string, nameEn?: string, description?: string, templateBody: any, category?: string }`  
**Tables:** article_templates (INSERT)  
**Auth:** Required  
**Returns:** `{ data: ArticleTemplate }` — HTTP 201

---

## `/api/admin/templates/[id]`

### DELETE /api/admin/templates/[id]
Delete an article template.

**Tables:** article_templates (DELETE)  
**Auth:** Required  
**Returns:** `{ data: { success: true } }`
