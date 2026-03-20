# IKTISSAD Frontend — Connection & Feature Roadmap
> Connecting the CMS to the public-facing reader experience

**Created:** March 20, 2026
**Context:** CMS Phases 0–10 are complete. This roadmap closes the gap between the admin/API layer and the reader-facing frontend.

---

## Audit: What's Already Connected

| Component | Status | Notes |
|-----------|--------|-------|
| Hero (featured articles) | ✅ Live | SWR → `/api/articles?featured=true` |
| Latest News section | ✅ Live | SWR → `/api/articles?sort=date` |
| Sector News section | ✅ Live | SWR per sector |
| Country News section | ✅ Live | SWR per country slug |
| Featured Magazine | ✅ Live | SWR → `/api/magazines` |
| Video Section | ✅ Live | SWR → `/api/articles?section=videos` |
| Featured Profiles | ✅ Live | SWR → `/api/profiles` |
| Article detail page | ✅ Live | Server fetch + SWR for related |
| Section / Sector pages | ✅ Live | SWR with real data |
| Magazine reader | ✅ Live | Server auth + Supabase data |
| Search page | ✅ Live | Debounced SWR full-text search |
| Login page | ✅ Live | Supabase auth |
| Account / subscription page | ✅ Live | Real Supabase data |
| Market data widget | ⚠️ Stub | Hits `/api/market-data` — mocked GCC prices |
| Newsletter form | ❌ Disconnected | Submit handler sets state only, never hits API |
| Contact form | ❌ Disconnected | Submit handler sets state only, no POST |
| Sections listing counts | ❌ Hardcoded | Static numbers (2450, 1890…) |
| Sectors listing counts | ❌ Hardcoded | Static numbers |
| About / team | ❌ Hardcoded | Unsplash placeholders, static stats |

---

## Phase F1 — Critical Revenue Path (Ship First)
> These directly affect subscription conversions. Nothing else matters until these work.

### F1.1 — Paywall Enforcement on Article Pages

**Current state:** Every article renders in full regardless of subscription. The metering logic, `PaywallModal.tsx`, and subscription APIs all exist — none of them are wired into the public article page.

**What to build:**
- Server-side: resolve the user's subscription tier from `auth.getUser()` on `[slug]/page.tsx`
- Pass `subscriptionTier` + `freeArticlesReadThisMonth` down to `PageClient.tsx`
- If the article is `paywalled: true` and the user is free-tier and has exceeded their monthly free limit:
  - Show the first 3 paragraphs (blurred fade-out)
  - Render `<PaywallModal />` with the subscribe CTA
- Track free article reads per user session in `reading_sessions` table

**Files to touch:** `src/app/[slug]/page.tsx`, `src/app/[slug]/PageClient.tsx`, `src/components/magazine/PaywallModal.tsx`

---

### F1.2 — Subscribe Checkout Flow (End-to-End)

**Current state:** The subscribe page renders plan cards. Selecting a plan does nothing observable — no API call, no redirect to payment.

**What to build:**
- Wire the "اشترك الآن" button → `POST /api/checkout/session` with `{ planId, billingCycle }`
- The API already creates an MIGS VPC session and returns a `paymentUrl`
- Redirect the user to `paymentUrl`
- On return, `/api/checkout/vpc-return` validates the MAC and activates the subscription
- Show a success page (`/subscribe/success`) with the plan summary
- Wire promo code input field → validate via `GET /api/promo-codes?code=X` before submit

**Files to touch:** `src/app/subscribe/PageClient.tsx`, create `src/app/subscribe/success/page.tsx`

---

### F1.3 — Newsletter Subscription Form

**Current state:** The homepage `Newsletter.tsx` component has a form that calls `setIsSubmitted(true)` on submit — it never hits the backend. Emails are silently discarded.

**What to build:**
- Wire `handleSubmit` → `POST /api/newsletter` with `{ email }`
- Handle validation errors (duplicate email, invalid format) with inline feedback
- On success, show confirmation + set cookie so the form hides on return visits
- Add the same wiring to any other newsletter form instances (Footer, etc.)

**Files to touch:** `src/components/Newsletter.tsx`, `src/components/Footer.tsx`

---

### F1.4 — Reading Analytics Tracking

**Current state:** The admin dashboard shows reading analytics (sessions, scroll depth, geo). The `ArticleAnalytics.tsx` component and `/api/analytics/read` route exist. No tracking fires from public article pages.

**What to build:**
- On article page mount: `POST /api/analytics/read` with `{ articleId, sessionId }` to record a view
- Increment `articles.views` counter (already shown in the article header)
- Scroll depth tracking: fire updates at 25%, 50%, 75%, 100% scroll milestones
- Time-on-page: send on `beforeunload` / `visibilitychange`

**Files to touch:** `src/app/[slug]/PageClient.tsx`

---

## Phase F2 — Article Page Completeness

### F2.1 — TipTap Content Renderer (Replace dangerouslySetInnerHTML)

**Current state:** The article body renders via `dangerouslySetInnerHTML={{ __html: article.content }}`. The TipTap editor stores content as JSON (not HTML). Custom nodes — `marketData`, `pullQuote`, `callout`, `figure`, `sidebar` — will render as nothing or broken HTML.

**What to build:**
- Use `TipTapRenderer.tsx` (already built in `src/components/admin/`) for the public article body
- Parse `article.content` as TipTap JSON → render with proper node views:
  - `MarketDataNodeView` → `MarketWidget` (live chart)
  - `PullQuoteNodeView` → styled pull quote block
  - `CalloutNodeView` → callout box
  - `FigureNodeView` → image with caption + focal point
  - `SidebarNodeView` → inset sidebar block
- Ensure RTL text direction is applied throughout

**Files to touch:** `src/app/[slug]/PageClient.tsx`, `src/components/admin/TipTapRenderer.tsx`

---

### F2.2 — Comments Section on Articles

**Current state:** Comment moderation is in the admin. The `/api/comments` GET/POST endpoints exist with full auth, threading, and moderation support. No comment UI exists on the public article page.

**What to build:**
- `ArticleComments.tsx` — public comment component at the bottom of each article
- Load top-level approved comments via `GET /api/comments?articleId=X&status=approved`
- Auth-gated comment form: subscribers can comment, anonymous users see a "سجّل دخولك" prompt
- Threaded replies (one level deep)
- Pagination / "load more" for long threads
- Optimistic insert with SWR mutation

**Files to touch:** Create `src/components/ArticleComments.tsx`, `src/app/[slug]/PageClient.tsx`

---

### F2.3 — Series Navigation

**Current state:** `SeriesNav.tsx` component exists and `GET /api/series/by-article` endpoint exists. Neither is wired into the article page.

**What to build:**
- On article page: call `GET /api/series/by-article?articleId=X`
- If article belongs to a series, render `<SeriesNav>` between the body and related articles
- Show series title, part number, prev/next article links, and full episode list

**Files to touch:** `src/app/[slug]/PageClient.tsx`, `src/components/SeriesNav.tsx`

---

### F2.4 — View Counter Increment

**Current state:** `article.views` is displayed in the article header but is never incremented — reads are not tracked.

**What to build:**
- On article page load, `POST /api/articles/[id]/view` (or include in F1.4's analytics call)
- Debounce: only count once per session per article (use sessionStorage flag)
- This feeds the "trending" signals used by the Hero and admin analytics

---

### F2.5 — Semantic "More Like This" (Replace Same-Section Related)

**Current state:** Related articles in the sidebar fetch `?section=X` — purely by editorial section. Phase 9.4 built `/api/search/similar` (pgvector semantic search).

**What to build:**
- Replace the related articles SWR call with `GET /api/search/similar?articleId=X&limit=4`
- Falls back to same-section if no embeddings exist yet
- Label the sidebar: "مقالات ذات صلة" with a subtle AI indicator

**Files to touch:** `src/app/[slug]/PageClient.tsx`

---

## Phase F3 — Static Page Data Connections

### F3.1 — Sections & Sectors Listing Pages (Live Article Counts)

**Current state:** The sections listing page shows hardcoded `articleCount: 2450, 1890, ...`. Sectors page does the same.

**What to build:**
- `GET /api/sections` already returns the sections list
- Extend the response to include `articleCount` (COUNT query grouped by section)
- Do the same for `GET /api/sectors`
- Update `PageClient.tsx` for both pages to use SWR instead of static arrays

**Files to touch:** `src/app/sections/PageClient.tsx`, `src/app/sectors/PageClient.tsx`, `src/app/api/sections/route.ts`, `src/app/api/sectors/route.ts`

---

### F3.2 — Contact Form Backend Wiring

**Current state:** Contact form collects name, email, subject, message — but `handleSubmit` only sets `isSubmitted(true)`. Nothing is saved or sent.

**What to build:**
- Create `POST /api/contact` — save to a `contact_submissions` table in Supabase + trigger Resend email notification to admin
- Wire the form submit handler to this endpoint
- Add proper error handling (rate limit: 1 submission per IP per hour)
- Pull office info (phone, address) from a CMS settings table instead of hardcoding

**Files to touch:** `src/app/contact/PageClient.tsx`, create `src/app/api/contact/route.ts`

---

### F3.3 — About & Team Pages (CMS-Driven)

**Current state:** About page has hardcoded team members with Unsplash placeholder images and hardcoded stats (1956, +50K, +2M).

**What to build:**
- Profiles with `type='individual'` and `featured=true` → appear as team members on the About page
- Fetch via `GET /api/profiles?type=individual&featured=true`
- Stats (founding year, reader count, article count) → site settings table or static config file (these change rarely, a config file is fine)
- Team page (`/team`) already has a `PageClient.tsx` — wire it to the same profiles API

**Files to touch:** `src/app/about/PageClient.tsx`, `src/app/team/PageClient.tsx`

---

### F3.4 — RSS Feed (Real DB Articles)

**Current state:** `/feed.xml` route exists. Verify it queries live Supabase articles vs. using mock data.

**What to build (if not already live):**
- Fetch last 20 published articles from Supabase in the route handler
- Proper `<item>` elements with title, description (excerpt), pubDate, link, category (section)
- Arabic-language `xml:lang="ar"` and `<language>ar</language>`

**Files to touch:** `src/app/feed.xml/route.ts`

---

### F3.5 — Dynamic Sitemap (Real DB)

**Current state:** `sitemap.ts` may be static or partially connected. Verify it includes all published article slugs from the DB.

**What to build (if not already live):**
- Fetch all published article slugs from Supabase (paginated if >1000)
- Include sections, sectors, countries, series, and magazine issue URLs
- `lastmod` from `updated_at`, `changefreq` by content type

**Files to touch:** `src/app/sitemap.ts`

---

## Phase F4 — Discovery & Search Enhancements

### F4.1 — Breaking News Ticker

**What to build:**
- Thin horizontal strip in Header (or just below it) showing the 5 latest `breaking=true` articles
- Auto-scrolls horizontally (RTL direction)
- SWR poll every 60 seconds for freshness
- Dismissed per session

**Files to touch:** `src/components/Header.tsx`, create `src/components/BreakingNewsTicker.tsx`
**DB:** Add `is_breaking boolean default false` column to `articles`

---

### F4.2 — Search Page Enhancements

**Current state:** Search works with full-text. Phase 9.4 added hybrid semantic search — it's not surfaced on the search page.

**What to build:**
- Switch `GET /api/search` to hybrid mode (semantic + keyword) now that embeddings exist
- Add filters to the search page: by section, sector, date range, article type
- "No results" suggestions: "لم نجد نتائج لـ X — جرّب: Y, Z" (related terms)
- Trending searches widget (top 5 queries from analytics)

**Files to touch:** `src/app/search/PageClient.tsx`, `src/app/api/search/route.ts`

---

### F4.3 — Tags / Topic Pages

**Current state:** Article tags render as links → `/search?q=tag`. There are no dedicated tag pages.

**What to build:**
- Create `/tags/[tag]/page.tsx` — list all articles with this tag
- Reuse the section/sector page layout
- Update tag links in article page to point to `/tags/X` instead of `/search?q=X`

**Files to touch:** Create `src/app/tags/[tag]/page.tsx` + `PageClient.tsx`

---

### F4.4 — Pagination / Load More on Listing Pages

**Current state:** LatestNews loads 12 articles. Sections and sectors load a fixed set. No way to see more.

**What to build:**
- Add "تحميل المزيد" (Load More) button to all article listing components
- SWR `useSWRInfinite` for cursor-based pagination
- Applies to: LatestNews, section detail, sector detail, country detail, search, tags

---

## Phase F5 — Subscription Experience

### F5.1 — Account Dashboard (My Content)

**Current state:** `/account/subscription` shows subscription status. There's no broader "my account" experience.

**What to build:**
- `/account` — dashboard with: subscription status, billing date, reading history (last 10 articles), saved articles
- `/account/reading-history` — paginated list of articles the user has read
- `/account/saved` — articles the user has bookmarked (see F5.2)
- Manage subscription: cancel, change plan, update payment method

**Files to touch:** Create account sub-pages

---

### F5.2 — Save / Bookmark Articles

**Current state:** No bookmark feature exists anywhere.

**What to build:**
- Bookmark icon on article cards and article header
- `POST /api/bookmarks { articleId }` + `DELETE /api/bookmarks/[articleId]`
- Persisted per user in `bookmarks` table: `(user_id, article_id, created_at)`
- Anonymous users → prompt to sign in; subscribers → instantly saved
- Accessible from `/account/saved`

**DB:** New `bookmarks` table

---

### F5.3 — Auth: Social Login

**Current state:** Login page has email+password only (Supabase auth).

**What to build:**
- Add Google OAuth button (Supabase supports this natively)
- Optional: Apple ID (required if ever releasing an iOS app)
- "نسيت كلمة المرور" → forgot password flow (Supabase `resetPasswordForEmail`)
- Magic link / OTP option for passwordless login

**Files to touch:** `src/app/login/LoginClient.tsx`

---

### F5.4 — Subscription Success + Onboarding

**After checkout (F1.2 complete):**
- Success page: "مرحباً بك في اقتصاد Premium" — show what they now have access to
- Onboarding checklist: set up preferences (sectors of interest, countries, email frequency)
- These preferences feed personalized article recommendations (future)

---

## Phase F6 — Real-Time & Live Features

### F6.1 — Live Article Updates (Breaking News)

**What to build:**
- Supabase Realtime subscription on the `articles` table for `is_breaking=true` inserts
- When a new breaking article is published, the BreakingNewsTicker updates without a page refresh
- Optional: browser `Notification` permission prompt for subscribers → push on breaking news

---

### F6.2 — Market Data Widget (Real Data)

**Current state:** `MarketWidget` and `TipTapRenderer` are complete. `/api/market-data` returns mock GCC stock prices with generated 30-day history.

**What to build:**
- Integrate Alpha Vantage (or an Arabic financial data provider: Tadawul API, Mubasher, etc.)
- Cache responses in Supabase or Upstash Redis (market data changes every 15min during trading hours)
- Support: individual stock price, index level, currency pair
- Stale-while-revalidate with timestamp shown ("آخر تحديث: ٢:٣٠ م")

**Files to touch:** `src/app/api/market-data/route.ts`

---

### F6.3 — Reading Progress Bar (Already Imported, Needs Component)

**Current state:** `<ReadingProgressBar />` is imported in the article page but the component file doesn't appear to be in `src/components/` (not in the glob results). Either it's missing or named differently.

**What to build / verify:**
- Create `src/components/ReadingProgressBar.tsx` if it doesn't exist
- Thin gold bar at the top of the viewport that fills as the user scrolls through the article
- Use `scroll` event listener + `requestAnimationFrame` for performance

---

## Phase F7 — SEO & Performance

### F7.1 — Structured Data (JSON-LD) on Article Pages

**What to build:**
- `NewsArticle` schema on every article page
- `BreadcrumbList` for section → article path
- `FAQPage` schema on articles where the GEO panel added FAQ sections (Phase 9.3)
- These are already recommended by the admin GEO panel — wire the output to the article page `<head>`

**Files to touch:** `src/app/[slug]/page.tsx`

---

### F7.2 — Image Optimization (next/image Migration)

**Current state:** Article page uses `<img src={article.featuredImage}>` directly. Homepage components use `<img>` tags in several places.

**What to build:**
- Replace `<img>` with `next/image` on: article featured image, article card thumbnails, profile avatars, magazine covers
- Use `focal_point` from the `articles` table (once F7 from CMS roadmap lands) for `objectPosition`
- Add `priority` prop to above-the-fold images (Hero, article header)

---

### F7.3 — Core Web Vitals Audit

**What to measure and fix:**
- LCP: Hero section is client-side (`'use client'` + SWR) — consider converting to a server component with `Suspense` fallback for the initial featured article
- CLS: Article images without `width`/`height` cause layout shift
- INP: Sector News makes N parallel SWR requests (one per sector card) — batch or defer

---

### F7.4 — IndexNow + Search Console Ping

**Current state:** `/api/indexnow/key` exists to return the verification key. Actual ping on article publish is not wired.

**What to build:**
- On article `status` change to `published`: `POST https://api.indexnow.org/indexnow` with the article URL
- Trigger this from the article status change API route (`PATCH /api/articles/[id]/status`)
- Also ping Google Search Console via the Indexing API for news content

---

## Phase F8 — Content Richness

### F8.1 — Magazine Preview (Non-Subscriber Teaser)

**Current state:** Non-subscribers see a locked reader. The `PaywallModal` exists on the reader page.

**What to build:**
- Free users: show the magazine cover + table of contents + first spread as a teaser
- "اقرأ الآن" CTA on the cover → PaywallModal → subscribe flow
- Ensure the magazine listing page (`/magazine`) shows cover thumbnails for all issues (already SWR-connected)

---

### F8.2 — Author Profile Pages

**Current state:** `/profiles/[id]` page exists. Authors on article pages show initials in a circle.

**What to build:**
- Link author name in article byline → `/profiles/[id]`
- Profile page: bio, photo, social links, all articles by this author (via `GET /api/articles?authorId=X`)
- "تابع الكاتب" button → email digest for this author's articles (future)

**Files to touch:** `src/app/[slug]/PageClient.tsx`, `src/app/profiles/[id]/page.tsx`

---

### F8.3 — Article Series Landing Pages

**Current state:** `/api/series/[slug]` and `/api/series/[slug]/articles` exist. No public series page exists.

**What to build:**
- `/series/[slug]/page.tsx` — series landing page with all parts listed
- Series card component for embedding in the homepage or section pages
- "ملفات" (Files/Dossiers) section linked from navigation

---

### F8.4 — Print View for Articles

**Current state:** `/print/[issueId]` exists for magazine spreads. Articles have no print view.

**What to build:**
- CSS `@media print` stylesheet for article pages (clean typography, no nav, no ads)
- "طباعة" button in the article actions bar
- Remove: header, footer, sidebar, comments, related articles
- Add: publication name, URL, date printed

---

## Feature Gap Summary

| Gap | Phase | Priority | Effort |
|-----|-------|----------|--------|
| Paywall enforcement | F1.1 | 🔴 Critical | Medium |
| Checkout flow end-to-end | F1.2 | 🔴 Critical | Medium |
| Newsletter form wiring | F1.3 | 🔴 Critical | Low |
| Reading analytics tracking | F1.4 | 🔴 Critical | Low |
| TipTap renderer (replace innerHTML) | F2.1 | 🔴 Critical | Medium |
| Comments section (public) | F2.2 | 🟠 High | Medium |
| Series navigation in articles | F2.3 | 🟠 High | Low |
| View counter increment | F2.4 | 🟠 High | Low |
| Semantic related articles | F2.5 | 🟡 Medium | Low |
| Section/sector live counts | F3.1 | 🟠 High | Low |
| Contact form backend | F3.2 | 🟠 High | Low |
| About/team CMS-driven | F3.3 | 🟡 Medium | Low |
| RSS feed verification | F3.4 | 🟡 Medium | Low |
| Dynamic sitemap | F3.5 | 🟡 Medium | Low |
| Breaking news ticker | F4.1 | 🟠 High | Medium |
| Search enhancements | F4.2 | 🟡 Medium | Medium |
| Tag/topic pages | F4.3 | 🟡 Medium | Low |
| Pagination / load more | F4.4 | 🟠 High | Medium |
| Account dashboard | F5.1 | 🟠 High | High |
| Bookmark / save articles | F5.2 | 🟡 Medium | Medium |
| Social login (Google) | F5.3 | 🟡 Medium | Low |
| Subscribe success + onboarding | F5.4 | 🟠 High | Low |
| Live breaking news (Realtime) | F6.1 | 🟡 Medium | Medium |
| Market data (real API) | F6.2 | 🟡 Medium | Medium |
| Reading progress bar | F6.3 | 🟢 Low | Low |
| JSON-LD structured data | F7.1 | 🟠 High | Low |
| next/image migration | F7.2 | 🟠 High | Low |
| Core Web Vitals | F7.3 | 🟡 Medium | Medium |
| IndexNow on publish | F7.4 | 🟢 Low | Low |
| Magazine paywall teaser | F8.1 | 🟠 High | Low |
| Author profile links | F8.2 | 🟡 Medium | Low |
| Series landing pages | F8.3 | 🟡 Medium | Medium |
| Article print view | F8.4 | 🟢 Low | Low |

---

## Recommended Execution Order

### Sprint 1 — Revenue Critical (Ship in Week 1)
1. **F1.3** Newsletter form → `/api/newsletter` (1 hour)
2. **F1.4** Reading analytics tracking on article pages (2 hours)
3. **F2.4** View counter increment (1 hour)
4. **F3.2** Contact form backend (2 hours)
5. **F1.2** Subscribe checkout flow — wire button → `/api/checkout/session` → redirect (3 hours)

### Sprint 2 — Content Quality (Week 2)
6. **F2.1** TipTap renderer replacing `dangerouslySetInnerHTML` (4 hours)
7. **F1.1** Paywall enforcement on article pages (4 hours)
8. **F3.1** Section/sector live counts (2 hours)
9. **F2.3** Series navigation (2 hours)
10. **F6.3** Reading progress bar (1 hour)

### Sprint 3 — Discovery & Engagement (Week 3)
11. **F2.2** Public comments on articles (6 hours)
12. **F4.4** Load more / pagination on listing pages (4 hours)
13. **F7.1** JSON-LD structured data (2 hours)
14. **F7.2** next/image migration (3 hours)
15. **F4.1** Breaking news ticker (3 hours)

### Sprint 4 — Subscription Experience (Week 4)
16. **F5.4** Subscribe success + onboarding (3 hours)
17. **F5.1** Account dashboard (8 hours)
18. **F5.2** Bookmark articles (4 hours)
19. **F5.3** Google OAuth on login (2 hours)
20. **F8.1** Magazine paywall teaser (3 hours)

### Sprint 5 — SEO & Richness (Month 2)
21. **F3.3** About/team CMS-driven (3 hours)
22. **F4.3** Tag/topic pages (3 hours)
23. **F8.2** Author profile links in articles (2 hours)
24. **F8.3** Series landing pages (4 hours)
25. **F2.5** Semantic related articles (2 hours)
26. **F6.2** Market data real API (6 hours)
27. **F7.3** Core Web Vitals audit + fixes (1 day)

---

*Built on: Next.js 16 · Supabase · TipTap · AI SDK · Tailwind CSS v4*
