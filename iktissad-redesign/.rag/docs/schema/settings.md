# Schema: Settings Domain

Tables for site configuration, automation rules, webhooks, and delivery logs.

---

## `site_settings`

Key-value store for site-wide configuration. One row per setting group.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| key | TEXT | PRIMARY KEY | Setting group name |
| value | JSONB | NOT NULL | Setting values as JSON object |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Known keys and their value shapes:**

| key | value shape |
|-----|-------------|
| general | { siteName, siteDescription, language, timezone } |
| appearance | { darkMode, accentColor, fontSize } |
| notifications | { emailNotifications, newArticleNotify, newCommentNotify, newUserNotify, weeklyReport } |
| security | { twoFactorAuth, sessionTimeout } |
| email | { smtpHost, smtpPort, smtpUser } |
| backup | { autoBackup } |
| paywall | { freeArticleLimit, giftLinksPerMonth, singleArticleDefaultPrice, dynamicPaywall, socialBonusArticle, highEngagementBonus, highEngagementThreshold } |

---

## `webhooks`

Outgoing webhook endpoints configured by admins.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| name | TEXT | NOT NULL | Human label |
| url | TEXT | NOT NULL | Destination URL |
| secret | TEXT | NOT NULL | HMAC signing secret |
| events | TEXT[] | DEFAULT '{}' | Event types to listen for e.g. ['article.published'] |
| enabled | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Auto-updated |

**Indexes:** enabled

**Known event types:** article.published, article.review, article.high_views, subscriber.created, payment.failed

---

## `webhook_deliveries`

Delivery log for each webhook invocation attempt.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| webhook_id | UUID | NOT NULL FK → webhooks(id) ON DELETE CASCADE | |
| event | TEXT | NOT NULL | Event type |
| payload | JSONB | NOT NULL | Request body sent |
| response_status | INT | | HTTP response code received |
| response_body | TEXT | | Response body |
| attempt | INT | NOT NULL DEFAULT 1 | Retry attempt number |
| success | BOOLEAN | NOT NULL DEFAULT false | |
| delivered_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** webhook_id, delivered_at DESC

---

## `automation_rules`

Pre-built automation rules that can be toggled on/off by admins.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| rule_key | TEXT | UNIQUE NOT NULL | Identifier e.g. 'article_published_telegram' |
| name | TEXT | NOT NULL | Arabic display name |
| description | TEXT | | Arabic description |
| trigger_event | TEXT | NOT NULL | e.g. 'article.published', 'subscriber.created' |
| action_type | TEXT | NOT NULL | e.g. 'post_telegram', 'send_welcome_email', 'notify_admin' |
| config | JSONB | DEFAULT '{}' | Action-specific config |
| enabled | BOOLEAN | DEFAULT false | On/off toggle |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated |

**Indexes:** trigger_event, enabled

**Seeded rules:**
- `article_published_telegram` — posts to Telegram on article publish
- `subscriber_welcome_email` — sends welcome email to new subscriber
- `payment_failed_notify` — notifies finance admin on payment failure
- `article_high_views_featured` — auto-features article at 10,000 views
- `article_review_notify_editor` — notifies assigned editor when article enters review
