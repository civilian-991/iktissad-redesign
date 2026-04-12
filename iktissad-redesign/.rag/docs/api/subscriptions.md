# API: Subscriptions, Plans, Payments & Checkout

Routes for subscriber management, plans, promo codes, and checkout flow.

---

## `/api/subscription-plans`

### GET /api/subscription-plans
List active subscription plans.

**Tables:** subscription_plans (SELECT WHERE is_active=true)  
**Auth:** None (public)  
**Returns:** `ApiResponse<SubscriptionPlan[]>`

### POST /api/subscription-plans
Create a new subscription plan.

**Tables:** subscription_plans (INSERT)  
**Auth:** Required (finance)

---

## `/api/subscription-plans/[id]`

### GET /api/subscription-plans/[id]
Get plan details.

**Tables:** subscription_plans (SELECT)  
**Auth:** None

### PUT /api/subscription-plans/[id]
Update plan pricing, features, or active state.

**Tables:** subscription_plans (UPDATE)  
**Auth:** Required (finance)

### DELETE /api/subscription-plans/[id]
Delete plan (soft-delete by setting is_active=false preferred).

**Tables:** subscription_plans (DELETE)  
**Auth:** Required (finance)

---

## `/api/subscriptions`

### GET /api/subscriptions
List subscribers with optional filtering.

**Query params:** `status`, `planId`, `page`, `pageSize`, `search` (email)  
**Tables:** subscribers (SELECT), subscription_plans (JOIN)  
**Auth:** Required (finance+)  
**Returns:** `ApiResponse<Subscriber[]>` with pagination

### POST /api/subscriptions
Create a new subscriber record (admin-initiated or webhook-triggered).

**Body:** `{ email, name?, phone?, planId, status?, countryCode?, promoCodeId?, gatewayCustomerId?, gatewaySubscriptionId? }`  
**Tables:** subscribers (INSERT)  
**Auth:** Required

---

## `/api/subscriptions/[id]`

### GET /api/subscriptions/[id]
Get subscriber detail with payment history.

**Tables:** subscribers (SELECT), payments (SELECT)  
**Auth:** Required

### PUT /api/subscriptions/[id]
Update subscriber (status change, plan change, add notes).

**Tables:** subscribers (UPDATE)  
**Auth:** Required

### DELETE /api/subscriptions/[id]
Delete subscriber record.

**Tables:** subscribers (DELETE)  
**Auth:** Required (super_admin)

---

## `/api/promo-codes`

### GET /api/promo-codes
List promo codes.

**Tables:** promo_codes (SELECT)  
**Auth:** Required (finance)

### POST /api/promo-codes
Create a new promo code.

**Body:** `{ code, discountType: 'percent'|'fixed', discountValue, maxUses?, validFrom?, validUntil?, plans?, isActive? }`  
**Tables:** promo_codes (INSERT)  
**Auth:** Required

---

## `/api/promo-codes/[id]`

### PUT /api/promo-codes/[id]
Update promo code (extend expiry, toggle active).

**Tables:** promo_codes (UPDATE)  
**Auth:** Required

### DELETE /api/promo-codes/[id]
Delete promo code.

**Tables:** promo_codes (DELETE)  
**Auth:** Required

---

## `/api/promo-codes/validate`

### POST /api/promo-codes/validate
Validate a promo code at checkout (check active, not expired, uses remaining).

**Body:** `{ code: string, planId?: string }`  
**Tables:** promo_codes (SELECT)  
**Auth:** None (public — called at checkout)  
**Returns:** `{ valid: boolean, discount: object | null, error?: string }`

---

## `/api/checkout/session`

### POST /api/checkout/session
Create a payment gateway checkout session.

**Body:** `{ planId, promoCode?, returnUrl }`  
**Tables:** subscription_plans (SELECT), promo_codes (SELECT)  
**Auth:** None (user initiates checkout)  
**Returns:** `{ sessionUrl: string }` — redirect URL to payment gateway

---

## `/api/checkout/vpc-return`

### GET /api/checkout/vpc-return
Handles payment gateway VPC (Virtual Payment Client) return callback.
Processes payment result and updates subscriber status.

**Tables:** subscribers (INSERT/UPDATE), payments (INSERT)  
**Auth:** None (gateway callback)

---

## `/api/webhooks/payment`

### POST /api/webhooks/payment
Payment gateway webhook handler (stubbed — awaiting gateway docs).
Handles events: payment.succeeded, payment.failed, subscription.canceled

**Tables:** subscribers (UPDATE), payments (INSERT), admin_notifications (INSERT)  
**Auth:** Webhook signature verification (HMAC)

---

## `/api/newsletter`

### POST /api/newsletter
Subscribe an email to the newsletter.

**Body:** `{ email: string }`  
**Tables:** newsletter_subscribers (UPSERT)  
**Auth:** None (public)  
**Returns:** `{ success: boolean }`

---

## `/api/newsletters`

### GET /api/newsletters
List newsletters (admin only).

**Tables:** newsletters (SELECT)  
**Auth:** Required

### POST /api/newsletters
Create a new newsletter campaign.

**Body:** `{ title, subject, previewText?, senderName?, segment?, blocks?, scheduledAt? }`  
**Tables:** newsletters (INSERT)  
**Auth:** Required

---

## `/api/newsletters/[id]`

### GET /api/newsletters/[id]
Get newsletter details.

**Tables:** newsletters (SELECT)  
**Auth:** Required

### PUT /api/newsletters/[id]
Update newsletter content or scheduling.

**Tables:** newsletters (UPDATE)  
**Auth:** Required

### DELETE /api/newsletters/[id]
Delete newsletter (only if draft or cancelled).

**Tables:** newsletters (DELETE)  
**Auth:** Required

---

## `/api/newsletters/[id]/send`

### POST /api/newsletters/[id]/send
Trigger newsletter send to the configured segment.

**Tables:** newsletters (UPDATE sent_at, recipient_count), newsletter_subscribers (SELECT)  
**Auth:** Required

---

## `/api/account/subscription`

### GET /api/account/subscription
Get the current user's subscription status.

**Tables:** subscribers (SELECT WHERE email=current_user)  
**Auth:** Required (user session)

---

## `/api/account/preferences`

### GET /api/account/preferences
Get user content preferences.

**Auth:** Required

### PUT /api/account/preferences
Update user content preferences.

**Auth:** Required

---

## `/api/account/reading-history`

### GET /api/account/reading-history
Get articles the current user has read.

**Tables:** article_reads (SELECT), articles (JOIN)  
**Auth:** Required

---

## Phase 4 — Monetization Routes

### POST /api/track/article-read
Record a reading session (metered paywall + reading history).

**Body:** `{ articleId, sessionId, timeOnPage?, scrollDepth?, readThrough?, referrer? }`  
**Tables:** reading_sessions (INSERT)  
**Auth:** None (anonymous-safe; associates with user if logged in)  
**Returns:** `{ ok: true }`

---

### POST /api/gift-links
Create a shareable paywall-bypass link (subscribers only, 5/month quota).

**Body:** `{ articleId, referralCode? }`  
**Tables:** gift_links (INSERT), subscribers (quota check), site_settings (quota config)  
**Auth:** Required (active subscriber)  
**Returns:** `{ data: { token, url, expiresAt } }`  
**Errors:** 403 if not subscriber, 429 if monthly quota exceeded, 400 if article is free

### GET /api/gift-links/[token]
Validate a gift link token and increment use count.

**Tables:** gift_links (SELECT + UPDATE)  
**Auth:** None  
**Returns:** `{ data: { valid, articleId, articleSlug, expiresAt, reason? } }`

---

### POST /api/checkout/article
Create an MPGS checkout session for a single article purchase.

**Body:** `{ articleId }`  
**Tables:** articles (price lookup), article_purchases (pending insert), site_settings (default price)  
**Auth:** Required  
**Returns:** `{ data: { sessionId, payUrl, orderId, successIndicator } }`  
**Errors:** 409 if already purchased, 400 if article is free, 502 on gateway error

### GET /api/account/purchases
List articles purchased by the current user.

**Tables:** article_purchases (SELECT), articles (JOIN)  
**Auth:** Required  
**Pagination:** page, pageSize  
**Returns:** `ApiResponse<{ id, amount, currency, purchasedAt, article }[]>`

---

### GET /api/admin/paywall-metrics
Paywall conversion dashboard metrics for the current month.

**Tables:** reading_sessions, article_purchases, gift_links, articles  
**Auth:** Required (admin)  
**Returns:** `{ readsThisMonth, purchasesThisMonth, purchaseRevenue, giftLinksCreated, giftLinksRedeemed, topPaywalledArticles }`
