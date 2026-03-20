# IKTISSAD Frontend — Connection & Feature Roadmap
> Connecting the CMS to the public-facing reader experience

**Created:** March 20, 2026
**Completed:** March 20, 2026
**Context:** CMS Phases 0–10 are complete. This roadmap closes the gap between the admin/API layer and the reader-facing frontend.

---

## Audit: What's Connected

| Component | Status | Notes |
|-----------|--------|-------|
| Hero (featured articles) | ✅ Live | SWR → `/api/articles?featured=true` |
| Latest News section | ✅ Live | SWR → `/api/articles?sort=date` + Load More |
| Sector News section | ✅ Live | SWR per sector + Load More |
| Country News section | ✅ Live | SWR per country slug |
| Featured Magazine | ✅ Live | SWR → `/api/magazines` |
| Video Section | ✅ Live | SWR → `/api/articles?section=videos` |
| Featured Profiles | ✅ Live | SWR → `/api/profiles` |
| Article detail page | ✅ Live | Server fetch + paywall + TipTap renderer |
| Section / Sector pages | ✅ Live | SWR with real data + live counts + Load More |
| Magazine reader | ✅ Live | Server auth + teaser for non-subscribers |
| Search page | ✅ Live | Hybrid semantic search + filters + trending |
| Login page | ✅ Live | Supabase auth + Google OAuth + magic link |
| Account / subscription page | ✅ Live | Full dashboard + saved + reading history |
| Market data widget | ✅ Live | Alpha Vantage provider + 15-min cache + stale indicator |
| Newsletter form | ✅ Live | POSTs to `/api/newsletter` + cookie dedup |
| Contact form | ✅ Live | POSTs to `/api/contact` + rate limiting |
| Sections listing counts | ✅ Live | Live COUNT from DB |
| Sectors listing counts | ✅ Live | Live COUNT from DB |
| About / team | ✅ Live | CMS-driven via profiles API + `site-config.ts` |
| Breaking news ticker | ✅ Live | SWR + Supabase Realtime + RTL marquee |
| Bookmarks | ✅ Live | Per-user, `/api/bookmarks` CRUD + optimistic UI |
| Comments | ✅ Live | Auth-gated, threaded, moderated |
| Tag / topic pages | ✅ Live | `/tags/[tag]` with article grid |
| Series landing pages | ✅ Live | `/series/[slug]` with episode list |
| Author profile links | ✅ Live | Byline → `/profiles/[id]` + articles by author |

---

## Phase F1 — Critical Revenue Path ✅ Complete

### F1.1 — Paywall Enforcement on Article Pages ✅
- Server-side subscription tier resolved from `auth.getUser()` on `[slug]/page.tsx`
- Free limit: 3 articles/month tracked via `reading_sessions`
- Paywalled articles: first 3 paragraphs shown with blur fade-out + `<PaywallModal />`
- DB: `articles.is_paywalled` column added

### F1.2 — Subscribe Checkout Flow ✅
- "اشترك الآن" button → `POST /api/checkout/session` → redirect to MPGS payment URL
- Promo code input with debounced validation via `GET /api/promo-codes/validate`
- Loading state + error handling on all plan buttons

### F1.3 — Newsletter Subscription Form ✅
- `Newsletter.tsx` POSTs to `/api/newsletter` with inline error messages
- Cookie `newsletter_subscribed=1` set on success — form hides on return visits
- Duplicate email returns 409 with Arabic feedback

### F1.4 — Reading Analytics Tracking ✅
- On mount: `POST /api/analytics/read` with `{ articleId, sessionId }`
- Scroll milestones: 25/50/75/100% fire PATCH updates
- `navigator.sendBeacon` on tab hide / unload for time-on-page
- sessionStorage dedup guard prevents double view counts

---

## Phase F2 — Article Page Completeness ✅ Complete

### F2.1 — TipTap Content Renderer ✅
- Replaces `dangerouslySetInnerHTML` — detects JSON vs legacy HTML automatically
- JSON → `<TipTapRenderer>` with RTL + article colour overrides
- HTML → original `dangerouslySetInnerHTML` fallback

### F2.2 — Comments Section ✅
- `ArticleComments.tsx`: auth-gated form, threaded replies (1 level), optimistic inserts
- Load more pagination, loading skeletons, empty state
- New `/api/comments` GET/POST routes

### F2.3 — Series Navigation ✅
- `<SeriesNav articleId={article.id} />` renders between body and related articles
- Handles its own SWR fetch; renders nothing if article is not in a series

### F2.4 — View Counter Increment ✅
- Covered by F1.4 analytics POST; sessionStorage flag prevents double-counting

### F2.5 — Semantic "More Like This" ✅
- Sidebar calls `/api/search/similar?articleId=X` (pgvector) first
- Falls back to same-section if no embeddings; `Sparkles` icon when AI results active

---

## Phase F3 — Static Page Data Connections ✅ Complete

### F3.1 — Section & Sector Live Counts ✅
- `GET /api/sections` and `/api/sectors` now return live `articleCount` from DB
- Both listing pages replaced hardcoded arrays with SWR

### F3.2 — Contact Form Backend ✅
- New `POST /api/contact` with Zod validation + 1/hour rate limit per email
- Saves to `contact_submissions` table (migration applied)

### F3.3 — About & Team Pages (CMS-Driven) ✅
- Team members fetched from profiles API (`?type=individual&featured=true`)
- Stats moved to `src/lib/site-config.ts`

### F3.4 — RSS Feed ✅
- Already live; added `xml:lang="ar"` attribute

### F3.5 — Dynamic Sitemap ✅
- Fetches all published article slugs in batches of 1000 via Supabase `.range()`

---

## Phase F4 — Discovery & Search ✅ Complete

### F4.1 — Breaking News Ticker ✅
- `BreakingNewsTicker.tsx`: SWR 60s poll + Supabase Realtime subscription
- RTL CSS marquee animation, session-dismissable
- Pulsing green "مباشر" dot when Realtime is connected
- `articles.is_breaking` column added + Realtime publication enabled

### F4.2 — Search Page Enhancements ✅
- Section dropdown + date range pills (week/month/year/all) — URL-synced
- Trending searches widget from `/api/search/trending`
- No-results suggestions with clickable term pills

### F4.3 — Tag / Topic Pages ✅
- `/tags/[tag]/page.tsx` + `PageClient.tsx` with article grid + load more
- Article tag links updated from `/search?q=TAG` → `/tags/TAG`

### F4.4 — Pagination / Load More ✅
- `useSWRInfinite` across: LatestNews, sections detail, sectors detail, search
- "تحميل المزيد" button with loading state; hidden when no more pages
- API routes updated with `.range()` pagination

---

## Phase F5 — Subscription Experience ✅ Complete

### F5.1 — Account Dashboard ✅
- `/account` — subscription status, recent bookmarks, reading history, quick links
- `/account/saved` — paginated bookmarks with remove button
- `/account/reading-history` — paginated history with scroll-depth progress bar

### F5.2 — Save / Bookmark Articles ✅
- `BookmarkButton.tsx` — gold filled/outline toggle, optimistic UI
- `/api/bookmarks` CRUD (GET, POST, DELETE) with RLS
- `bookmarks` table created with migration
- Unauthenticated users see "سجّل دخولك لحفظ المقالات" tooltip

### F5.3 — Auth: Social Login ✅
- Google OAuth button in login page → `signInWithOAuth`
- Magic link tab → `signInWithOtp`
- Forgot password inline flow → `resetPasswordForEmail`
- New `/auth/callback/route.ts` and `/auth/reset-password/` page

### F5.4 — Subscription Success + Onboarding ✅
- `/subscribe/success` — plan badge, benefits grid, sector preference checkboxes
- "ابدأ القراءة" + "إدارة اشتراكي" CTAs

---

## Phase F6 — Real-Time & Live Features ✅ Complete

### F6.1 — Live Breaking News ✅
- Supabase Realtime `postgres_changes` on `articles` table
- INSERT (is_breaking=true) triggers immediate SWR revalidation
- UPDATE triggers revalidation (removes un-flagged articles from ticker)

### F6.2 — Market Data Widget ✅
- Alpha Vantage provider with 15-min in-process cache + GCC trading hours detection
- `MARKET_DATA_PROVIDER=alpha_vantage` env var activates real data
- `isStale` flag + "آخر تحديث" timestamp displayed in all widget modes
- Mock data remains default; widget works without any API keys

### F6.3 — Reading Progress Bar ✅
- Already existed as `motion.div` with `scaleX` animation — confirmed working

---

## Phase F7 — SEO & Performance ✅ Complete

### F7.1 — Structured Data (JSON-LD) ✅
- `NewsArticle` + `BreadcrumbList` schemas on every article page
- Rendered as `<script type="application/ld+json">` in server component

### F7.2 — next/image Migration ✅
- Article hero, related article thumbnails, team avatars migrated
- `fill` + `relative` parent + `sizes` + `priority` on above-fold images

### F7.3 — Core Web Vitals
- Not audited — recommend running Lighthouse after deployment

### F7.4 — IndexNow on Publish ✅
- Already fully wired in `src/lib/indexnow.ts`
- Fires on article `status → published` transition
- Note: Google Indexing API does NOT apply to news articles (JobPosting/VideoObject only)

---

## Phase F8 — Content Richness ✅ Complete

### F8.1 — Magazine Paywall Teaser ✅
- `MagazineTeaserClient.tsx` replaces hard redirect for non-subscribers
- Shows: cover image, table of contents, blurred first spread + subscribe CTA
- `PaywallModal` layers on top when preview lock is clicked

### F8.2 — Author Profile Links ✅
- Article bylines link to `/profiles/[id]`
- Profile pages show real articles by this author via `?authorId=` filter
- `mappers.ts` updated to include `author.id` from `author_id`

### F8.3 — Series Landing Pages ✅
- `/series/[slug]` with episode list, part badges, lock icons, subscribe CTA

### F8.4 — Article Print View ✅
- `@media print` CSS hides nav/footer/sidebar/comments/ticker
- Print-only header (site name + date + URL) injected at article top
- `Printer` button in article actions bar

---

## Feature Gap Summary (All Resolved)

| Gap | Phase | Status |
|-----|-------|--------|
| Paywall enforcement | F1.1 | ✅ Done |
| Checkout flow end-to-end | F1.2 | ✅ Done |
| Newsletter form wiring | F1.3 | ✅ Done |
| Reading analytics tracking | F1.4 | ✅ Done |
| TipTap renderer | F2.1 | ✅ Done |
| Comments section (public) | F2.2 | ✅ Done |
| Series navigation in articles | F2.3 | ✅ Done |
| View counter increment | F2.4 | ✅ Done |
| Semantic related articles | F2.5 | ✅ Done |
| Section/sector live counts | F3.1 | ✅ Done |
| Contact form backend | F3.2 | ✅ Done |
| About/team CMS-driven | F3.3 | ✅ Done |
| RSS feed verification | F3.4 | ✅ Done |
| Dynamic sitemap | F3.5 | ✅ Done |
| Breaking news ticker | F4.1 | ✅ Done |
| Search enhancements | F4.2 | ✅ Done |
| Tag/topic pages | F4.3 | ✅ Done |
| Pagination / load more | F4.4 | ✅ Done |
| Account dashboard | F5.1 | ✅ Done |
| Bookmark / save articles | F5.2 | ✅ Done |
| Social login (Google) | F5.3 | ✅ Done |
| Subscribe success + onboarding | F5.4 | ✅ Done |
| Live breaking news (Realtime) | F6.1 | ✅ Done |
| Market data (real API) | F6.2 | ✅ Done |
| Reading progress bar | F6.3 | ✅ Done |
| JSON-LD structured data | F7.1 | ✅ Done |
| next/image migration | F7.2 | ✅ Done |
| Core Web Vitals | F7.3 | ⚠️ Pending — run Lighthouse after deploy |
| IndexNow on publish | F7.4 | ✅ Done |
| Magazine paywall teaser | F8.1 | ✅ Done |
| Author profile links | F8.2 | ✅ Done |
| Series landing pages | F8.3 | ✅ Done |
| Article print view | F8.4 | ✅ Done |

---

## DB Migrations Applied (March 20, 2026)

| Migration | Status |
|-----------|--------|
| `articles.is_breaking BOOLEAN DEFAULT false` | ✅ Applied |
| `articles.is_paywalled BOOLEAN DEFAULT false` | ✅ Applied |
| `bookmarks` table + RLS policies | ✅ Applied |
| `contact_submissions` table + RLS policies | ✅ Applied |
| `supabase_realtime` publication — articles table | ✅ Applied |

## Pending Manual Steps

| Step | Status |
|------|--------|
| Enable Google OAuth provider in Supabase dashboard | ⏳ Requires Google Cloud client ID/secret |
| Add `/auth/callback` to Supabase allowed redirect URLs | ⏳ Dashboard step |
| Set `ALPHA_VANTAGE_API_KEY` env var for real market data | ⏳ Optional — mock data works without it |

---

*Built on: Next.js 16 · Supabase · TipTap · AI SDK · Tailwind CSS v4*
*Completed: March 20, 2026 — 34 tasks across 8 phases*
