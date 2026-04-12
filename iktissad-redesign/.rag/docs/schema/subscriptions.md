# Schema: Subscriptions Domain

Tables for subscription plans, paid subscribers, payments, promo codes, and newsletters.

---

## `subscription_plans`

Tiered plans offered to subscribers.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| name | TEXT | NOT NULL | English name |
| name_ar | TEXT | NOT NULL | Arabic name |
| description | TEXT | | English description |
| description_ar | TEXT | | Arabic description |
| price_monthly | NUMERIC(10,2) | NOT NULL | Monthly price |
| price_annual | NUMERIC(10,2) | | Annual price |
| interval | subscription_interval | DEFAULT 'monthly' | enum: monthly, annual, quarterly |
| features | JSONB | DEFAULT '[]' | English features list |
| features_ar | JSONB | DEFAULT '[]' | Arabic features list |
| is_active | BOOLEAN | DEFAULT true | |
| sort_order | INT | DEFAULT 0 | Display order |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated |

**RLS:** Public SELECT for is_active=true. Admin full access via service role.

---

## `promo_codes`

Discount codes that can be applied at checkout.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| code | TEXT | UNIQUE NOT NULL | The promo code string |
| discount_type | discount_type | NOT NULL | enum: percent, fixed |
| discount_value | NUMERIC(10,2) | NOT NULL | Percent (0–100) or fixed amount |
| max_uses | INT | | null = unlimited |
| uses_count | INT | DEFAULT 0 | Current usage count |
| valid_from | TIMESTAMPTZ | DEFAULT now() | |
| valid_until | TIMESTAMPTZ | | null = no expiry |
| plans | UUID[] | | Which plan IDs this code applies to (null = all) |
| is_active | BOOLEAN | DEFAULT true | |
| created_by | UUID | FK → users(id) | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## `subscribers`

Paid / trial subscribers (end-users who purchased a plan).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users(id) ON DELETE SET NULL | null if no CMS user account |
| email | TEXT | UNIQUE NOT NULL | |
| name | TEXT | | |
| phone | TEXT | | |
| country_code | TEXT | | ISO country code |
| plan_id | UUID | FK → subscription_plans(id) | |
| status | subscription_status | DEFAULT 'incomplete' | enum: trialing, active, past_due, canceled, paused, incomplete |
| trial_ends_at | TIMESTAMPTZ | | |
| current_period_start | TIMESTAMPTZ | | |
| current_period_end | TIMESTAMPTZ | | |
| canceled_at | TIMESTAMPTZ | | |
| payment_method | JSONB | | Stored payment method metadata |
| gateway_customer_id | TEXT | | Payment gateway customer ID |
| gateway_subscription_id | TEXT | | Payment gateway subscription ID |
| promo_code_id | UUID | FK → promo_codes(id) | Applied promo code |
| notes | TEXT | | Internal admin notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated |

**Indexes:** status, plan_id, email, created_at DESC  
**Realtime:** REPLICA IDENTITY FULL enabled for live dashboard  
**RLS:** Enabled; service role has full access

---

## `payments`

Immutable payment transactions linked to a subscriber.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| subscriber_id | UUID | NOT NULL FK → subscribers(id) ON DELETE CASCADE | |
| plan_id | UUID | FK → subscription_plans(id) | Plan at time of payment |
| amount | NUMERIC(10,2) | NOT NULL | |
| currency | TEXT | DEFAULT 'SAR' | ISO currency code |
| status | TEXT | NOT NULL | e.g. 'succeeded', 'failed', 'refunded' |
| gateway_payment_id | TEXT | | Payment gateway transaction ID |
| description | TEXT | | |
| paid_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** subscriber_id  
**RLS:** Enabled; service role has full access

---

## `newsletter_subscribers`

Simple email list — separate from paid subscribers.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| email | TEXT | UNIQUE NOT NULL | |
| status | subscriber_status | NOT NULL DEFAULT 'active' | enum: active, unsubscribed |
| subscribed_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** email

---

## `newsletters`

Newsletter content campaigns (email blasts to subscriber segments).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| title | TEXT | NOT NULL | Internal title |
| subject | TEXT | NOT NULL | Email subject line |
| preview_text | TEXT | | Email preview text |
| sender_name | TEXT | DEFAULT 'إكتساد' | |
| segment | TEXT | DEFAULT 'all' CHECK IN ('all','premium','free') | Target audience |
| status | TEXT | DEFAULT 'draft' CHECK IN ('draft','scheduled','sent','cancelled') | |
| blocks | JSONB | DEFAULT '[]' | Email content blocks |
| scheduled_at | TIMESTAMPTZ | | When to send |
| sent_at | TIMESTAMPTZ | | When actually sent |
| recipient_count | INT | | How many recipients |
| open_count | INT | DEFAULT 0 | |
| click_count | INT | DEFAULT 0 | |
| created_by | UUID | FK → auth.users(id) ON DELETE SET NULL | Supabase Auth user |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated |

**Indexes:** status, created_at DESC  
**RLS:** Authenticated users (admins) only

---

## `reading_sessions`

Per-article reading events. Populated by `POST /api/track/article-read`. Used for metered paywall counting and dynamic engagement scoring.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users(id) ON DELETE SET NULL | null for anonymous |
| article_id | UUID | FK → articles(id) ON DELETE CASCADE | |
| session_id | TEXT | | Anonymous browser cookie ID |
| time_on_page | INT | DEFAULT 0 | Seconds |
| scroll_depth | INT | DEFAULT 0 | 0–100 % |
| read_through | BOOLEAN | DEFAULT false | Reached end of article |
| referrer | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** user_id, article_id, session_id, created_at DESC  
**RLS:** Users can SELECT their own rows; service role has full access

---

## `gift_links`

Shareable paywall-bypass tokens generated by active subscribers.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| token | TEXT | UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(20),'hex') | URL-safe token |
| article_id | UUID | NOT NULL FK → articles(id) ON DELETE CASCADE | |
| created_by_subscriber_id | UUID | FK → subscribers(id) ON DELETE SET NULL | |
| created_by_user_id | UUID | FK → users(id) ON DELETE SET NULL | |
| max_uses | INT | NOT NULL DEFAULT 1 | |
| uses_count | INT | NOT NULL DEFAULT 0 | |
| expires_at | TIMESTAMPTZ | NOT NULL DEFAULT now()+30d | |
| referral_code | TEXT | | Analytics attribution tag |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes:** token, created_by_subscriber_id, created_at DESC  
**RLS:** Service role has full access  
**Quota:** 5 links/month per subscriber (enforced in API layer, configurable via site_settings paywall.giftLinksPerMonth)

---

## `article_purchases`

Single-article micropayment records.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL FK → users(id) ON DELETE CASCADE | |
| article_id | UUID | NOT NULL FK → articles(id) ON DELETE CASCADE | |
| payment_id | UUID | FK → payments(id) ON DELETE SET NULL | Filled by webhook |
| amount | NUMERIC(10,2) | NOT NULL | |
| currency | TEXT | NOT NULL DEFAULT 'SAR' | |
| gateway_payment_id | TEXT | | MPGS session ID |
| purchased_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Unique:** (user_id, article_id) — prevents duplicate purchases  
**Indexes:** user_id, article_id  
**RLS:** Users can SELECT their own rows; service role has full access
