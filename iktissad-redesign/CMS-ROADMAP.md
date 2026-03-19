# IKTISSAD CMS — 2026 Roadmap
> The first AI-native Arabic newsroom CMS

**Last updated:** March 2026
**Vision:** A content operating system that creates, optimizes, and distributes Arabic financial journalism — with AI that thinks like an Arabic editor, not a translation layer.

---

## Strategic Framework

Four capabilities, one revenue thread running through all of them:

```
┌──────────────────────────────────────────────────────────┐
│  1. CREATE      Editor intelligence + Arabic AI identity  │
│  2. COLLABORATE Newsroom coordination without chaos       │
│  3. OPTIMIZE    SEO, analytics, monetization signals      │
│  4. DISTRIBUTE  Social, newsletter, multi-channel         │
│                                                          │
│  ████████████████ MONETIZE ████████████████████████████  │
│  Every feature answers: does this grow/retain subscribers?│
└──────────────────────────────────────────────────────────┘
```

---

## What We Already Have

A genuinely strong foundation — most custom CMS builds never get here:

| Domain | Status |
|--------|--------|
| Article CRUD + TipTap editor (RTL) | ✅ Done |
| Magazine spread designer (canvas, templates, zones, revisions) | ✅ Done |
| Editorial workflow (draft → review → published/scheduled) | ✅ Done |
| Media library (Supabase Storage, drag-drop) | ✅ Done |
| RBAC (5 roles, 2FA, permissions JSON) | ✅ Done |
| Audit log (full action trail, IP, diffs) | ✅ Done |
| Subscriptions + promo codes + revenue dashboard | ✅ Done |
| Ad campaigns + creatives + tracking | ✅ Done |
| Reading analytics (sessions, scroll depth, geo) | ✅ Done |
| Comment moderation | ✅ Done |
| Real-time dashboard (Supabase Realtime) | ✅ Done |
| Command palette (Cmd+K) | ✅ Done |
| AI excerpt + translate API routes (wired, not embedded) | ✅ Done |

**The gap:** The CMS is powerful but not intelligent. It has structure, permissions, data, workflows — but no decision-making assistance. That is exactly where the industry is going.

---

## Phase 0 — Stability & Observability
> Before building features, make what exists bulletproof.

**Timeline: Week 1–2 (parallel with Phase 0.5)**

### 0.1 Error Tracking (Sentry)
- Install Sentry for Next.js (frontend + backend)
- Capture editor crashes, API errors, unhandled promise rejections
- Slack/email alerts for critical errors
- Source maps for readable stack traces in production

### 0.2 Editor Performance Monitoring
- Measure TipTap hydration time, typing latency
- Track time-to-interactive for each admin page
- Flag slow renders (>200ms response to keystrokes)
- Real User Monitoring (RUM) for admin sessions

### 0.3 Database Observability
- Enable Supabase slow query logging (>100ms threshold)
- Identify N+1 queries in article list / analytics pages
- Add indexes where missing (check `EXPLAIN ANALYZE` on top 10 queries)
- Monitor Supabase connection pool usage

### 0.4 Rate Limit UX
- Proper 429 handling in API client with user-visible feedback
- Retry-after header respect
- Queue requests during bursts instead of failing silently

### 0.5 Error Boundaries in Admin UI
- Wrap each major admin section in React Error Boundary
- Graceful degradation: one broken widget doesn't crash the whole page
- Error state with "retry" and "report issue" actions

---

## Phase 0.5 — Arabic AI Core Identity
> This is the product differentiator. Build it alongside stability, not after everything else.

**Timeline: Week 2–4**

This is not a feature. It is the identity layer that shapes every AI capability built afterward. An AI sidebar that generates Arabic financial content the way an Arabic editor would write it — not a translation of English conventions.

### 0.5.1 — Arabic Editorial Style System

Define style presets baked into every AI prompt:

| Type | Arabic | Structure | Tone |
|------|--------|-----------|------|
| **خبر** (News) | تقرير إخباري | Inverted pyramid, 300–500 words | Neutral, factual, third person |
| **تقرير** (Report) | تقرير معمق | Context → Analysis → Implications, 800–1500 words | Explanatory, balanced |
| **تحليل** (Analysis) | تحليل اقتصادي | Thesis → Evidence → Conclusion, 1000–2000 words | Authoritative, expert voice |
| **مقابلة** (Interview) | مقابلة | Q&A or narrative, 600–1200 words | Conversational, attributed |
| **رأي** (Opinion) | مقال رأي | Hook → Argument → Call to action, 500–900 words | First person, persuasive |

### 0.5.2 — Financial Journalism Context Layer

System prompt fragment injected into every AI request:
- Arabic financial terminology glossary (GDP = الناتج المحلي الإجمالي, etc.)
- MENA-specific economic context (GCC, Vision 2030, OPEC+)
- Citation conventions for Arabic press (attribution patterns)
- Prohibited phrases (avoid English transliterations when Arabic terms exist)
- Number formatting (Arabic-Indic numerals vs. Western, depending on context)

### 0.5.3 — Style Preset Selector in Editor

Dropdown in article editor: **"نوع المقال"** (Article Type)
Selecting a type:
- Pre-fills the article structure outline
- Sets AI tone/voice for all AI sidebar actions
- Adjusts SEO panel word count targets
- Changes the article template in live preview

---

## Phase 1 — Editor Intelligence (CREATE)
> The highest daily-value investment. Editors touch the editor every single day.

**Timeline: Month 1–2**

### 1.1 — AI Sidebar in TipTap

A collapsible right-side panel in the article editor — **Arabic-first, financially aware**.

Actions:
- **أكمل** (Continue writing) — generate the next paragraph from context
- **حسّن** (Improve) — rewrite selected text (more precise, more concise, more authoritative)
- **لخّص** (Summarize) — condense selection to 1–2 sentences
- **ترجم** (Translate) — Arabic ↔ English, inline (wires your existing `/api/ai/translate`)
- **اقتبس** (Generate excerpt) — one-click excerpt from full article
- **اقتراح عنوان** (Suggest headlines) — 5 headline variants, ranked by expected CTR
- **تحقق من الأرقام** (Fact-check figures) — flag numbers that look inconsistent (% > 100, implausible growth rates)

Tech: TipTap `BubbleMenu` (for selected text) + floating panel for document-level actions + AI SDK `streamText` with Arabic system prompts from Phase 0.5.

### 1.2 — Real-Time SEO Panel (Arabic-native)

Live analysis panel updating as the editor types:

**Standard signals:**
- Keyword density for target keyword
- Arabic readability score (adapted Flesch-Kincaid for Arabic morphology)
- Heading hierarchy (H1 once, logical H2/H3)
- Meta title + description character counters with Google snippet preview (Arabic RTL)
- Word count vs. target range for selected article type

**Differentiated signals (beyond generic CMS):**
- **Entity detection** — extract mentioned companies, people, countries, sectors automatically → suggest as tags
- **Internal linking opportunities** — semantic match against your article archive → "link to this article about Saudi Aramco Q3 results"
- **Competitor gap** — top 3 ranking articles for the target keyword (external news API) → "your article misses these angles"
- **Conversion signal** — "articles in this section average 2.3x more subscription conversions when they include a data table" (driven by your own analytics)

### 1.3 — Live Split-Screen Preview

Side-by-side: editor (left) + live preview (right):
- Renders TipTap JSON using identical renderer as the public article page
- RTL-aware, same fonts + spacing as production
- Toggle viewport: desktop / tablet / mobile
- "Preview as published" vs "preview as draft with watermark"
- Preview shared URL (tokenized, 24h expiry) for external review — e.g., send draft to source for accuracy check before publishing

---

## Phase 2 — Newsroom Collaboration (COLLABORATE)
> 80% of coordination value, 20% of engineering effort. No Yjs for now.

**Timeline: Month 2**

### 2.1 — Inline Editorial Comments

Comment layer on the article editor (distinct from reader-facing comments):
- Select any text → add a note, question, or instruction
- Decorated text range with comment indicator
- Threaded replies per comment thread
- Resolve / unresolve
- Notifications sent to @mentioned users
- Filters: show all / show unresolved / show mine

DB: New `editorial_notes` table: `(article_id, text_anchor jsonb, body, author_id, resolved_at, parent_id)`

### 2.2 — @Mentions + Task Notifications

- `@username` in editorial comments → notification to that admin user
- "Needs your review" direct assignment from editor
- Mention notifications appear in existing `NotificationBell.tsx`
- Email digest option for offline editors

### 2.3 — Assignment Board (Kanban)

New page `/admin/assignments`:
- Kanban columns: **مسودة** (Draft) → **مراجعة** (Review) → **انتظار الموافقة** (Pending Approval) → **مجدول** (Scheduled) → **منشور** (Published)
- Article cards showing: title, assigned editor, due date, section
- Drag cards between columns to update status (uses existing status history)
- Overdue indicators (red badges on past-due articles)
- Filter by author, section, date range
- Uses existing `article_assignments` table (already in DB, no migration needed)

### 2.4 — Presence Indicators

- Article list shows avatar of who is currently editing each article
- "2 editors viewing" indicator at top of article editor
- No cursor sync (that's Yjs — later). Just awareness of who's in the document.

> **Real-time collaborative editing (Yjs):** Deferred to Phase 7+. Revisit only when the team actually hits the wall of two editors overwriting each other's work. The coordination features above solve 80% of the problem.

---

## Phase 3 — Editorial Calendar (COLLABORATE)
> Every newsroom needs this. It's how editors plan coverage.

**Timeline: Month 2**

### 3.1 — Visual Editorial Calendar

New page `/admin/calendar`:
- Month / week / day views
- Articles plotted by `published_at` (scheduled) or section deadline
- Color-coded by status: draft=zinc, review=amber, scheduled=blue, published=green
- Color-coded by section
- Drag article cards to reschedule → updates `published_at`
- Click empty date slot → quick-create article modal
- Filter by author, section, status

### 3.2 — Coverage Gap Detection

- Highlight days with no scheduled content
- "No articles scheduled for next Thursday in الاقتصاد الخليجي" warning
- Publishing frequency heatmap (GitHub contribution graph style)
- Weekly publishing cadence targets (set in settings, flagged when missed)

---

## Phase 4 — Distribution Engine (DISTRIBUTE)
> Content without distribution is a library.

**Timeline: Month 3**

### 4.1 — Social Publishing Hub

New page `/admin/distribute` per article:

Auto-generate platform-native content from article:
- **تغريدة** (Tweet/X thread) — 5-tweet thread with Arabic + numbers-first hook
- **لينكد إن** (LinkedIn post) — professional tone, 150–200 words, Arabic
- **تيليغرام** (Telegram) — formatted for channel posting, with emoji markers
- **ملخص** (TL;DR) — 3-bullet summary for any platform

One-click post to connected accounts via OAuth:
- Twitter/X API
- LinkedIn API
- Telegram Bot API (post to channel)

Schedule posts independently from article publish date.

### 4.2 — Headline A/B Lab

Before publishing, test headline variants:
- Generate 5 headline variants via AI (different angles, hooks, emotional triggers)
- Preview each variant with estimated CTR signal (based on your own historical data)
- Optionally A/B test on the public site (split traffic for 24h, pick winner automatically)

### 4.3 — Newsletter Content Builder

New page `/admin/newsletters/new`:
- Visual email builder (drag-drop blocks: headline, article card, quote, CTA, divider)
- Pull articles from your CMS directly into newsletter layout
- Bilingual sections (Arabic main + English summary, or vice versa)
- Segment: send to all subscribers / premium only / free tier only / custom filter
- Preview in dark + light mode
- Track opens and clicks per issue
- Connects to existing `newsletter_subscribers` table

---

## Phase 5 — Content Intelligence + Monetization (OPTIMIZE + MONETIZE)
> Turn analytics into editorial decisions. Connect content performance to revenue.

**Timeline: Month 3–4**

### 5.1 — Article Performance Dashboard in Editor

For published articles, show a live panel inside the editor:
- Total views, unique readers, return readers
- Average scroll depth %
- Average time-on-page
- Traffic sources (direct, social, search, referral)
- Geographic distribution (country breakdown)
- Subscription conversions attributed to this article

The `ArticleAnalyticsPanel.tsx` component already exists — embed it in the published article detail page.

### 5.2 — Revenue Attribution per Article

**The metric that makes the CMS business-critical:**
- Track which articles a subscriber read before converting
- "This تحليل piece drove 18 new subscriptions this month"
- "Articles with data tables convert 2.4x more than text-only"
- "Free tier users who read 3+ تقرير articles have 67% conversion rate"

Surface in: article list (revenue column), article editor sidebar, dashboard widgets.

DB: Extend `reading_sessions` to join with subscription events. New `conversion_touches` table for attribution model.

### 5.3 — Paywall Optimization Suggestions

AI-powered paywall intelligence:
- "Move this article behind the paywall — it's performing in your top 10% for engagement but 100% free"
- "This article has 90% scroll depth on free tier — high intent signal, gate the full version"
- Suggest optimal metering threshold (currently free articles before paywall shows)
- A/B test free vs. gated variants

### 5.4 — Content Gap Analysis

Dashboard widget:
- Topics trending in GCC financial news (via RSS / news API) vs. your coverage
- Sections with publishing volume below target
- Geographic coverage gaps (countries mentioned in fewer than N articles this month)
- "Suggested story ideas" one-click to create article with brief pre-filled

### 5.5 — AI Performance Recommendations

For each published article with below-average performance:
- "This article gets 42% fewer views than your section average — suggestions:"
  - Add internal links to 3 related articles (auto-suggested)
  - Strengthen headline (3 AI variants)
  - Add a data table or visualization
  - Expand the introduction (current intro: 45 words, recommended: 80–120)

---

## Phase 6 — Content Safety (CREATE)
> Git-style versioning. Because content matters as much as code.

**Timeline: Month 4**

### 6.1 — Full Content Versioning with Diff

- Every save creates a version snapshot (debounced: 5 minutes of editor inactivity)
- Version timeline panel in editor: visual history of all snapshots
- Side-by-side diff view (old vs. new) — highlight added/removed paragraphs
- One-click rollback to any version
- AI-generated change summary per version ("Added 3 paragraphs in the analysis section, changed headline")

DB: New `article_versions` table: `(article_id, version_number, content jsonb, changed_by, created_at, summary)`

### 6.2 — Tokenized Preview Links

- "Share for review" button in editor → generates a secret tokenized URL
- Preview renders the full article page with draft content (watermarked)
- Token expires after 48h (configurable)
- Used for: source accuracy review, advertiser approval, executive sign-off before publish

---

## Phase 7 — Smart Media (CREATE)
> DAM quality that matches 2026 standards.

**Timeline: Month 4–5**

### 7.1 — AI Alt Text Generation

On image upload (or retroactive batch run):
- Call vision model (`google/gemini-3.1-flash`) to describe image content
- Generate bilingual alt text: Arabic (primary) + English
- Editable before saving
- Retroactive: "Generate alt text for all 847 media items missing it" batch job

Tech: `POST /api/ai/alt-text` → `generateText` with image input → AI Gateway.

### 7.2 — AI Media Auto-Tagging

On upload:
- Extract tags from image (people, organizations, locations, events, objects)
- Store as `tags jsonb` in `media` table
- Filter/search media library by AI-generated tags
- Cross-reference with your sectors/countries/profiles for structured tagging

### 7.3 — Focal Point for Article Images

Extend the existing `FocalPointSelector.tsx` (already in spread editor) to article featured images:
- Visual focal point selector on featured image upload
- Store `featured_image_focal_point: {x: number, y: number}` in articles table
- Used by `next/image` `objectPosition` for proper responsive cropping
- Prevents every mobile user seeing a sky-only crop of an interview photo

### 7.4 — Semantic Media Search

- Text-to-image search: "find photos of Dubai skyline" returns semantically relevant results
- "Find similar images" button on any media item
- Powered by CLIP embeddings stored in `media` table (`embedding vector(512)`)
- Requires `pgvector` extension in Supabase (already supported)

---

## Phase 8 — Automation & Webhooks (DISTRIBUTE)
> Connect the CMS to your broader stack without custom code every time.

**Timeline: Month 5**

### 8.1 — Outgoing Webhooks

New page `/admin/settings/webhooks`:
- Configure endpoint URLs per event type
- Events: `article.published`, `article.updated`, `subscriber.created`, `payment.received`, `comment.flagged`, `subscriber.churned`
- Full resource JSON in payload
- HMAC-signed requests (webhook secret per endpoint)
- Retry with exponential backoff on failure (3 attempts)
- Webhook delivery log with response status codes

DB: New `webhooks` table + `webhook_deliveries` log table.

### 8.2 — Automation Rules (Simple)

Start with rule-based automation before a visual builder:

Pre-built rule templates:
- "When article published → Post to Telegram channel"
- "When subscriber signs up → Send welcome email via Resend"
- "When payment fails → Notify finance admin + flag subscriber"
- "When article hits 10,000 views → Add to featured list"
- "When article enters review → Notify assigned editor"

UI: `/admin/settings/automations` — list of on/off toggles for pre-built rules + simple configuration (which channel, which email template, threshold values).

> **Visual no-code workflow builder:** Deferred to Phase 9+. Pre-built rules cover 90% of the value.

---

## Phase 9 — Advanced AI (OPTIMIZE)
> Move from AI-assisted to AI-native operations.

**Timeline: Month 5–6**

### 9.1 — AI Article Brief Generator

Before writing, generate a structured editorial brief:
- Input: topic or headline idea
- Output:
  - Recommended article type (خبر / تقرير / تحليل)
  - Suggested angle and thesis
  - Key points to cover (structured outline)
  - Relevant internal articles to link to (from your archive)
  - Competitor articles on the same topic (external)
  - SEO keyword targets
  - Suggested sources (organizations, people to quote)
  - Target word count by section
- One-click "Start article from brief" → pre-fills editor with outline structure

### 9.2 — Arabic AI Content Agent

An autonomous research + draft agent:

```
@وكيل: اكتب مسودة عن نمو الناتج المحلي غير النفطي في السعودية خلال الربع الأول 2026
```

The agent:
1. Searches your article archive for related coverage
2. Searches web for latest data and reports
3. Drafts a structured article in the correct type format
4. Cites sources inline
5. Suggests 5 internal links from your existing content
6. Generates headline, excerpt, meta description, and social posts simultaneously

UI: Chat interface in admin sidebar using AI SDK `Agent` class + `streamText`.

### 9.3 — GEO Optimization (Generative Engine Optimization)

Optimize content for AI search engines (Perplexity, ChatGPT, Gemini) alongside Google:
- Direct answer paragraph at article top (AI search surfaces these as citations)
- Structured FAQ section suggestions
- Source citation formatting for AI attribution
- "AI search readiness" score alongside traditional SEO score
- Structured data recommendations (`@Article`, `@FAQPage`, `@NewsArticle` schema)

### 9.4 — Semantic Search Upgrade

Upgrade `/api/search` from full-text to hybrid:
- Embed articles at publish time (AI SDK `embed`, stored in `pgvector`)
- Hybrid search: keyword match + semantic similarity, ranked by combined score
- "More like this" for related articles (used in editor sidebar + public site)
- Semantic archive search for journalists: "find our coverage of Saudi banking sector reform"

---

## Phase 10 — Platform & APIs
> Open the platform when the core is mature.

**Timeline: Month 6+**

### 10.1 — Newsroom-Specific Features

**Market data embeds in editor:**
- TipTap extension: insert live stock chart or price widget inline
- Data from financial API (Alpha Vantage, Yahoo Finance)
- Renders as interactive chart on article page

**Source & contact CRM:**
- `/admin/sources` — journalist source database
- Link sources to articles they were quoted in
- Embargo date tracking
- Encrypted notes per source, private per reporter

**Article series / dossiers:**
- Group articles into investigative series
- Auto-generated series landing page
- Reading order navigation between parts

### 10.2 — Webhooks as Public API

Expose your content as a developer API:
- Public read-only REST endpoints (articles, sections, sectors) with API key auth
- API key management per integration
- Rate limiting per key
- API usage dashboard (calls, errors, top consumers)

### 10.3 — GraphQL (Deferred)

Add only when there is a concrete need: external developer integrations, public API consumers who request it, or SaaS expansion. REST + semantic search covers all internal needs.

### 10.4 — MCP Server

Expose content as an MCP (Model Context Protocol) server:
- AI agents (Claude, Cursor, etc.) can query articles, search content, draft new pieces
- Enables AI editorial assistant integrations beyond the CMS UI
- Positions IKTISSAD CMS as a platform, not just a tool

### 10.5 — Real-Time Collaborative Editing (Yjs)

Revisit when the team actually hits the wall of concurrent editing conflicts. Pre-requisites:
- All Phase 2 collaboration features shipped and in use
- Clear demand signal (editors reporting lost work)
- Dedicated engineering sprint (it is a significant complexity investment)

---

## Execution Summary

| Phase | Name | Timeline | Capability | Effort |
|-------|------|----------|------------|--------|
| 0 | Stability & Observability | Week 1–2 | Foundation | Low |
| 0.5 | Arabic AI Core Identity | Week 2–4 | CREATE | Low |
| 1 | Editor Intelligence | Month 1–2 | CREATE | Medium |
| 2 | Newsroom Collaboration | Month 2 | COLLABORATE | Medium |
| 3 | Editorial Calendar | Month 2 | COLLABORATE | Low |
| 4 | Distribution Engine | Month 3 | DISTRIBUTE | Medium |
| 5 | Content Intelligence + Monetization | Month 3–4 | OPTIMIZE + MONETIZE | Medium |
| 6 | Content Safety (Versioning) | Month 4 | CREATE | Low |
| 7 | Smart Media | Month 4–5 | CREATE | Medium |
| 8 | Automation & Webhooks | Month 5 | DISTRIBUTE | Medium |
| 9 | Advanced AI | Month 5–6 | OPTIMIZE | High |
| 10 | Platform & APIs | Month 6+ | PLATFORM | High |

---

## The Moat

Every major CMS is racing toward AI. But none of them are building for:

> **Arabic financial journalism, written by editors who think in Arabic — not translated from English.**

The Arabic editorial style system (Phase 0.5) is not a localization feature. It is the product soul.
Every AI action, every prompt, every SEO suggestion, every content brief is shaped by it.

That is what makes this not just a CMS competitor — but a category of one.

---

*Built on: Next.js 16 · Supabase · TipTap · AI SDK · Tailwind CSS v4*
