# Schema: Ads Domain

Tables for advertisers, campaigns, ad placements, and conversion tracking.

---

## `advertisers`

Advertiser company records.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| name | TEXT | NOT NULL | Arabic name |
| name_en | TEXT | | |
| contact_name | TEXT | | Primary contact person |
| contact_email | TEXT | | |
| contact_phone | TEXT | | |
| notes | TEXT | | Internal notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## `ad_campaigns`

A campaign groups one or more ad placements under a budget and time window.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| advertiser_id | UUID | FK → advertisers(id) | |
| name | TEXT | NOT NULL | Campaign name |
| start_date | DATE | | |
| end_date | DATE | | |
| budget_cents | INT | | Budget in smallest currency unit |
| status | TEXT | CHECK IN ('draft','active','paused','completed') DEFAULT 'draft' | |

---

## `ads`

Individual ad creative placements within a campaign.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| campaign_id | UUID | FK → ad_campaigns(id) | |
| type | TEXT | CHECK IN ('full-page','half-page','banner','sponsor-card') | Ad format |
| image_url | TEXT | NOT NULL | Creative image URL |
| target_url | TEXT | | Click destination URL |
| alt_text | TEXT | | Accessibility alt text |
| impressions | BIGINT | DEFAULT 0 | View count |
| clicks | BIGINT | DEFAULT 0 | Click count |
| issue_id | UUID | FK → magazine_issues(id) | Placed in this issue |
| spread_number | INT | | Specific spread page in issue |
| active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## `conversion_touches`

Revenue attribution: records which articles a visitor read before subscribing.
Used for first-touch / last-touch attribution analysis.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| subscriber_id | UUID | NOT NULL FK → subscribers(id) ON DELETE CASCADE | |
| article_id | UUID | NOT NULL FK → articles(id) ON DELETE CASCADE | |
| session_id | TEXT | | Client session ID |
| touch_position | INT | DEFAULT 1 | 1 = first touch, N = last touch before conversion |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** article_id, subscriber_id, created_at DESC  
**RLS:** Authenticated users can SELECT; service role INSERT
