---
title: "GCC Markets Autonomous Newsroom — Build Plan v2"
subtitle: "IKTISSAD · Official-data, human-reviewed, deterministically-grounded"
date: "June 2026"
---

# GCC Markets Autonomous Newsroom — Build Plan **v2**

> An agentic editorial system that ingests **officially-sourced** market data and
> disclosures from the 7 GCC stock exchanges, thinks like a financial journalist
> (judgment → connect the dots → angle → write), **checks every number with code**,
> and drafts Arabic + English articles into the existing IKTISSAD CMS for **human
> editor approval** — alongside a live markets data widget, a daily newsletter
> block, and social distribution.

Status: PLAN. Owner: TBD. Stack: Next.js 16 / Supabase (+pgvector) / Vercel AI SDK
+ AI Gateway / Inngest. **No web-scraping of auth-walled exchanges; no headless
"gateway"; no proxies.** Data is acquired through official feeds and licenses.

## What changed from v1 (and why)

v1 was rewritten after a five-perspective adversarial audit. The material changes:

| Area | v1 | v2 | Reason |
|---|---|---|---|
| Data sourcing | Scrape all 7 (defeat Akamai/Cloudflare/JWT/geo-gate) | **Official feeds + licenses**; scrape only the 2 truly-open feeds | Bypassing access controls of GCC financial institutions is a ToS breach and potential **criminal** offence (UAE Decree-Law 34/2021; Saudi Anti-Cyber Crime Law). Prices/indices aren't copyrightable, so scraping buys nothing a license wouldn't. |
| Publishing | Auto-publish high-confidence types | **100% human-reviewed at launch** | UAE FDL33 (Jan 2026) criminalizes false/misleading market statements; an LLM confidence score is not a legal defense. |
| Fact-checking | LLM "verifies every number" | **Deterministic code diff** of each number vs source row | LLM number-checking misses transpositions/derived errors. |
| PDF extraction | Vision-LLM primary | **Text-layer primary; numbers from structured feeds, never OCR** | Vision OCR of Arabic financial PDFs is ~65% accurate, errors concentrated on numbers. |
| Newsroom | 6 agents (3× Opus) | **4 LLM agents + a deterministic verifier** | Two Opus judgment passes overlapped; ~30% cost cut, no quality loss. |
| Volume | Dozens of articles/day | **3–5 substantial stories/day + data widget**; routine events → widget/newsletter | Avoids Google scaled-content-abuse, duplicate content, and editor rubber-stamping. |
| Infra | Self-hosted Playwright Gateway + residential proxies | **None** (deleted with the scraping) | Removes the single biggest SPOF, cost, and maintenance burden. |
| Data model | Columns only | **Keys, indexes, numeric types, FKs, indexed alias table** | v1 shipped zero keys/indexes; cascaded into the postgrest `never`-typing bug. |
| RAG | pgvector from day one | **Entity+date SQL first; RAG later** | Premature; entity-linked SQL is the 80% solution at this volume. |

---

## 0. Principles

1. **Official or licensed data only.** Every source is either openly published for
   reuse, or covered by a redistribution license/agreement. No circumvention of any
   access control. No source ships into an article unless the org is permitted to
   redistribute it.
2. **Deterministic where it concerns facts; agentic where it concerns meaning.**
   Numbers are fetched, parsed, and **checked by code**. The LLM decides what's a
   story, the angle, and the prose. The system never lets an LLM assert a figure it
   can't trace to a source row.
3. **Human-in-the-loop, always (at launch).** Articles land as drafts for editor
   approval. No auto-publishing of financial claims until there is calibrated
   confidence data and legal sign-off — and even then only the data widget.
4. **Journalism, not stenography.** Each published piece shows an angle and connected
   context. Fact and interpretation are always separated; causation is attributed or
   hedged, never asserted.
5. **Quality over volume.** A few substantial, genuinely synthetic stories per day
   plus a live data product — not a firehose of thin briefs.
6. **Grounded, attributable, correctable.** Every number is click-traceable to its
   source; every external claim is attributed; every error has a labeled correction
   that propagates to every surface.
7. **Bilingual, RTL-first.** Arabic primary, English a first-class edition. Reuse
   existing i18n / `format.ts` / TipTap.

---

## 1. System architecture

```
   OFFICIAL DATA SOURCES                       ┌────────────────────────────┐
   ┌──────────────────────────┐   fetch/feed   │        THE WIRE            │
   │ Open feeds (build):      │──────────────► │  normalized, entity-linked │
   │  • Boursa Kuwait RSS/PDF  │                │  event store               │
   │  • MSX (Muscat) RSS/PDF   │                │  A: market_summaries       │
   ├──────────────────────────┤                │  B: disclosure_events      │
   │ Official API (integrate): │                │  Macro: macro_signals      │
   │  • DFM → Dubai Pulse API   │                └────────────────────────────┘
   ├──────────────────────────┤                              │
   │ Licensed (procure):       │                              ▼
   │  • Tadawul → TILA license  │            ┌────────────────────────────────┐
   │  • ADX/Bahrain/QSE →       │            │ ENTITY RESOLUTION (determ.) +   │
   │    aggregator or MDA       │            │ TEXT-layer extraction +         │
   └──────────────────────────┘            │ DEDUP (native IDs)              │
                                            └────────────────────────────────┘
                                                          │
                                                          ▼
                                            ┌────────────────────────────────┐
                                            │ VALIDATION (deterministic rules)│
                                            │ breadth · %↔pts · mcap band     │
                                            └────────────────────────────────┘
                                                          │
   ╔══════════════════════════ THE NEWSROOM (4 agents + verifier) ═══════════════════╗
   ║  NEWS DESK (Opus) → survey wire+history, SPIKE, MERGE into trend stories,        ║
   ║     flag FOLLOW-UPS → ranked "story budget" (≤ editor capacity)                  ║
   ║                       │                                                          ║
   ║  REPORTER (Sonnet; Opus for complex synthesis) → evidence dossier: entity        ║
   ║     history (SQL), peer/sector compare, macro window, prior coverage,            ║
   ║     filing text, whitelisted+verified quotes. Test angle vs evidence.           ║
   ║                       │                                                          ║
   ║  WRITER+STANDARDS (Sonnet) → inverted-pyramid Arabic, house voice, fact|opinion ║
   ║     split, hedged/attributed causation, "what to watch". Emits each number as   ║
   ║     STRUCTURED data {value, unit, source_ref} alongside the prose.              ║
   ║                       │                                                          ║
   ║  VERIFIER (CODE diff + thin Sonnet) → code checks every {value} vs source_ref    ║
   ║     row (and recomputes derived figures); LLM checks attribution & causation     ║
   ║     only. Compliance lint. Emits confidence + provenance map.                    ║
   ║                       │                                                          ║
   ║  TRANSLATOR (Sonnet) → English edition; re-run the SAME deterministic number     ║
   ║     diff on the English output.                                                  ║
   ╚══════════════════════════════════════════════════════════════════════════════════╝
                                                          │
                                                          ▼
   ┌──────────────────── EDITORIAL OPS (human-reviewed) ───────────────────┐
   │ Newsroom STAGING tables → review queue → on approval, PROMOTE into    │
   │ existing `articles` (idempotent). Provenance panel. Corrections.       │
   │ Surfaces: CMS article · live data widget · newsletter block · social   │
   └────────────────────────────────────────────────────────────────────────┘

   Orchestration: Inngest durable workflows + cron, per-exchange trading calendars
   (staggered closes, holiday skip, retries, DLQ). Observability: run/cost ledger.
```

---

## 2. Data-sourcing strategy (build-vs-buy, per exchange)

The acquisition layer is the project's biggest legal and durability risk, and the
smallest part of its value. v2 acquires the **same facts** through authorized
channels. Prices and index values are not copyrightable, so a license/feed gives the
identical numbers with redistribution rights.

| Exchange | v2 source | Type | Notes |
|---|---|---|---|
| **Boursa Kuwait** | RSS (`FeedFull.aspx?T=0/4/5/6`) + NewsPDF | **Open — build** | No anti-bot wall. Confirm ToS permits commercial reuse + attribution; polite rate-limit; cache snapshots. |
| **MSX (Muscat)** | RSS (`rss.aspx?t=Company/Circulars/Events/Daily`) + `/newsdocs/` PDFs | **Open — build** | Same ToS check. Arabic PDFs → text-layer extraction; numbers from RSS structured fields where available. |
| **DFM (Dubai)** | **Dubai Pulse** open-API (`dfm_indices`, trade-by-nationality/client-type) | **Official API — integrate** | Government-sanctioned. Confirm per-dataset commercial terms. Removes the UAE-proxy need entirely. |
| **Tadawul (Saudi)** | **TILA** (Tadawul Information License Agreement) | **License — procure** | The expected route for a news org; converts the worst legal risk into a vendor invoice. |
| **ADX (Abu Dhabi)** | Official Market Data Agreement **or** aggregator | **License — procure** | ToS explicitly bans scraping/commercial reuse. |
| **QSE (Qatar)** | Official Market Data Agreement **or** aggregator | **License — procure** | ToS bans commercial reuse. |
| **Bahrain Bourse** | Official Market Data Agreement **or** aggregator | **License — procure** | — |

**Two procurement options for the licensed four (Tadawul/ADX/QSE/Bahrain):**

- **Option A — one regional aggregator** (Mubasher / DirectFN / Decypha, or
  Refinitiv/LSEG) covering all licensed exchanges in a **delayed/EOD, display** tier.
  One integration, one contract, redistribution clause in writing. Realistically
  low-five-figures/year for the display tier. *Recommended for simplicity.*
- **Option B — per-exchange Market Data Agreements** + TILA. Cheaper per-exchange
  for some, but 4–5 separate contracts and integrations.

**Recommended:** open feeds for Kuwait + MSX (free), Dubai Pulse for DFM (free/low),
and **one aggregator** for Tadawul/ADX/QSE/Bahrain (Option A). This is buildable on
the free/official three **immediately** while the aggregator contract is negotiated
in parallel.

**Disclosures: summarize, never reproduce.** Store source PDFs privately for
provenance; in articles, summarize with attribution ("per a filing on [exchange]")
and a hard cap on quoted length. The vision step (when used) outputs **structured
facts**, not a copy of the document. This keeps the product in news-reporting/fair-use
territory and out of corporate-copyright territory.

---

## 3. Tech stack & infrastructure

| Concern | Decision | Notes |
|---|---|---|
| Orchestration | **Inngest** (durable steps + cron + fan-out) | Hobby (free) for an EOD-batch design, or self-host on a small Ubuntu box if outgrown. No $75 Pro needed at this volume. |
| AI runtime | **Vercel AI SDK** via **AI Gateway** | `generateObject`+Zod for structured steps. **Prompt caching** on stable prompts; **Batch API** for non-breaking generation. |
| Models | Opus 4.8 (Desk; Reporter on complex synthesis), Sonnet 4.6 (Reporter default, Writer+Standards, Translator, thin verifier), Haiku 4.5 (classify/extract) | Reserve Opus for genuine judgment; it's the dominant cost lever. |
| Data acquisition | Open feeds (HTTP), Dubai Pulse API, aggregator/TILA feed | **No headless browser, no proxies, no anti-bot fight.** |
| PDF text | `pdf-parse`/`pdfjs` text-layer; vision (Haiku/Sonnet) only for true scans, narrative only | Numbers never sourced from OCR. |
| Database | **Supabase Postgres** (existing) + pgvector (deferred for RAG) | New tables only; no new project. |
| Storage | Supabase Storage for cached source PDFs/snapshots | Capped retention (raw PDF N days → text+structured after). |
| Macro data | **EIA + FRED** (free APIs) | Brent/WTI/US 10Y/Fed/gold/USD index. No paid markets provider. |
| Charts | Server-rendered SVG → uploaded as article images | Index line + sector heatmap. |
| Hosting | Existing Vercel + Supabase; optional ~$10/mo Ubuntu box only if self-hosting Inngest | — |

**Deleted from v1:** the Exchange Gateway worker, residential/UAE proxies, the
anti-bot/stealth stack, and the self-healing-against-Cloudflare idea.

---

## 4. Data model (Supabase) — with keys & indexes

Migration `…_gcc_newsroom.sql`. camelCase mappers per existing convention. **FKs are
declared** (which also fixes the postgrest `Relationships → never` typing issue).
Money/index fields are `numeric`, never float.

**Reference / entity graph**
- `exchanges` — id PK, code UNIQUE, name_ar/en, country, currency, timezone,
  close_time_local, data_tier, source_config (jsonb).
- `trading_calendars` — PK (exchange_id, date), is_trading_day, holiday_name.
- `companies` — id PK, exchange_id FK, ticker, isin, name_ar/en, sector_id FK,
  is_active. **`UNIQUE(exchange_id, ticker)`**, **`UNIQUE(isin) WHERE isin IS NOT NULL`**.
- `company_aliases` — id PK, company_id FK, alias_normalized, lang, source.
  **`UNIQUE(exchange_id, alias_normalized)`**, **pg_trgm GIN index** for fuzzy lookup.
- `sectors` — id PK, exchange_id FK, name_ar/en, canonical_sector.
- `people` — id PK, name_ar/en, role, company_id FK. *(deferred; build-later)*
- `themes` — id PK, slug, name_ar/en.

**Stream A — market data**
- `market_summaries` — id PK, exchange_id FK, trading_date, index_name, index_close
  numeric, change_points numeric, change_percent numeric, volume numeric, value
  numeric, num_trades, market_cap numeric, market_cap_unit, advancers, decliners,
  unchanged, currency, source_url, extraction_ts, raw jsonb, confidence, notes.
  **`UNIQUE(exchange_id, trading_date, index_name)`** (the natural idempotency key).
  BRIN index on `trading_date`.
- `sector_indices` — id PK, market_summary_id FK, sector_id FK, close numeric,
  change_points numeric, change_percent numeric.

**Stream B — disclosures**
- `disclosure_events` — id PK, exchange_id FK, company_id FK, type (enum), title_ar/en,
  body_ar/en, filed_at, source_url, native_id (exchange filing id), pdf_url, pdf_text,
  structured jsonb, extraction_schema_version int, theme_ids, dedup_key, raw jsonb,
  confidence. **`UNIQUE(dedup_key)`** — `dedup_key` prefers the exchange-native id
  (QSE InfoID, ADX content id, Bahrain announcement id) over a synthesized hash.
  Composite indexes: `(exchange_id, filed_at DESC)`, `(company_id, filed_at DESC)`.

**Macro**
- `macro_signals` — id PK, ts, kind, value numeric, unit, source_url, payload jsonb.
  BRIN index on `ts`.

**Newsroom (staging — decoupled from `articles`)**
- `story_budget` — id PK, run_id, assignment jsonb, newsworthiness, status.
- `generated_articles` — id PK, story_budget_id FK, edition (ar|en), draft jsonb
  (full TipTap body lives **here** until approval), confidence, fact_check jsonb,
  provenance jsonb, compliance jsonb, edit_distance, review_log jsonb,
  parent_article_id, supersedes_id, surfaces jsonb, correction_history jsonb,
  status, article_id FK (NULL until promoted). **`UNIQUE(story_budget_id, edition)`**
  (idempotency for at-least-once retries).
- `archive_embeddings` — *(deferred)* article_id FK, chunk, embedding `vector(N)`,
  HNSW index. Build only when archive depth justifies semantic recall.

**Ops**
- `scrape_runs` — id PK, exchange_id FK, started_at, finished_at, status, items,
  source, http_status, error, snapshot_url.
- `agent_runs` — id PK, run_id, agent, model, input_hash, tokens_in/out, cost,
  duration, status. (Cost/audit ledger; `input_hash` doubles as the LLM-step
  memoization key so replays don't re-bill.)

**RLS, explicitly per-table:** public-readable: `market_summaries`, `sector_indices`
(feed the widget). Private: everything else (`agent_runs`, `story_budget`,
`generated_articles`, quarantine). Server jobs use the service-role key (bypasses
RLS) for writes.

---

## 5. Ingestion pipeline

1. **Acquire** (Inngest step): open feeds via HTTP; DFM via Dubai Pulse; licensed
   four via the aggregator/TILA feed.
2. **Snapshot** raw payload/PDF to Storage (provenance + reprocess).
3. **Numbers from structured feeds.** Market-data figures come from the feed's
   structured fields — never from PDF OCR. Normalize numerals (Arabic→Latin), strip
   commas, preserve currency + mcap unit (+ full-number column).
4. **PDF text extraction (narrative only).** Detect text layer; `pdf-parse` if
   present (free, exact); route only true scans to a vision model (Haiku/Sonnet) for
   **narrative text**, with extracted numbers flagged `confidence`-downgraded and
   cross-checked against structured feeds before use.
5. **Entity resolution (deterministic-first):** ISIN → per-exchange ticker →
   normalized name (strip diacritics, unify alef/hamza/yaa, fold tatweel,
   Arabic→Latin numerals) → `company_aliases` exact → high-threshold trigram fuzzy →
   else **quarantine**. LLM only *proposes* new aliases for human approval; never
   auto-merges.
6. **Classify** (Haiku): `disclosure_events.type` + `theme_ids`. Type priors set a
   baseline newsworthiness (e.g. halt = always surface); the Desk does final judgment.
7. **Dedup** via `UNIQUE(dedup_key)` + `ON CONFLICT DO NOTHING` (DB-enforced, race-safe).
8. **Persist**; emit `event.ingested` / `summary.ingested` to wake the newsroom.

> **Note:** Seeding the ~2,000-company bilingual universe + alias table is a
> **2–3 week sub-project** and a prerequisite for resolution. Until seeded, the
> quarantine queue dominates; budget an owner to clear it daily.

---

## 6. Macro feed

Cron pulling into `macro_signals` from **free** sources: EIA (Brent/WTI), FRED
(US 10Y, Fed funds, gold, USD index), plus a small curated set of regional-headline
RSS for *context only* (grounded, attributed, never copied). The Reporter queries
the macro window around an event to frame — attributed or hedged — causation.

---

## 7. Validation (deterministic, pre-newsroom)

Rules over Stream A + parsed Stream B numbers: advancers+decliners+unchanged ≈
traded; change_percent reconciles with change_points/prev-close; market_cap is
main/equity market; sector indices same exchange+date; mcap/volume sanity vs trailing
band → anomaly flag (also the "breaking" signal); currency/unit consistency. Hard
failures downgrade `confidence`, annotate `notes`, and block article generation +
alert. (Numeric reconciliation runs on `numeric` columns to avoid float-rounding
false positives.)

---

## 8. The newsroom (4 LLM agents + a deterministic verifier)

Implemented as an Inngest workflow; each agent is a `generateObject`/`generateText`
call with a Zod schema, logged to `agent_runs`, memoized by `input_hash` so retries
don't re-bill or diverge. **Idempotency:** all writes for an assignment key on
`run_id = hash(assignment + date)`; `generated_articles` is upserted on
`(story_budget_id, edition)`.

**8.1 News Desk (Opus).** Input: the day's full wire + history slice + open
follow-up threads. Applies news judgment; **spikes** routine items; **merges**
related events into trend stories; detects follow-ups (entity+date SQL over prior
coverage). Output: a **ranked story budget capped at editor capacity** —
`{angle, story_type, entity_ids, event_ids, why_now}`.

**8.2 Reporter (Sonnet default; Opus for complex synthesis).** Builds an evidence
dossier — entity history (SQL streaks/records), peer/sector comparison, **bounded**
macro window, prior coverage, filing text, and **whitelisted, human-verifiable**
quotes only. Pins web-research results on first success (retry-safe). Tests the angle
against the evidence; revises or flags "no story." Each fact carries a `source_ref`.

**8.3 Writer + Standards (Sonnet, one pass).** Inverted-pyramid Arabic, house voice,
bidi-isolated numbers (`format.ts`), TipTap-structured. Separates FACT (plain) from
INTERPRETATION (attributed/hedged). **Emits each numeric claim as structured data
`{value, unit, currency, source_ref, derivation?}` alongside the prose.** Kills
PR-tone, hedges the unconfirmed, appends "what to watch next."

**8.4 Verifier (deterministic code + thin Sonnet).** **Code** diffs every emitted
`value` against its `source_ref` row (and recomputes derived figures — % change, YoY
— from raw columns); any mismatch is stripped/flagged. The LLM portion only judges
what code can't: is the **attribution** accurate, is the **causation** supported.
**Compliance lint** (deterministic + LLM): block unattributed causal connectives,
advice language, forward-looking claims, named price-move attribution without a
source. Emits `confidence` + provenance map + compliance report.

**8.5 Translator (Sonnet).** English edition preserving fact/opinion structure and
numbers; **the same deterministic number diff re-runs on the English output** so the
editions can't drift on figures.

Reserve adding agents back only if golden-article regression proves the merged
version is worse.

### Specialized desks (config, not agents)
The Desk routes each assignment to a desk-specific prompt/policy (angle library +
checks): Market Summary, Indices/Sector, Earnings, Dividends/Corporate-Actions,
Assemblies (AGM/EGM), Board, **Halts ⚡**, IPO/Listings, Ownership. (Regulatory and
Debt/Funds fold into the nearest desk — usually data-only, rarely a standalone story.)

---

## 9. Editorial operations & article management (A→Z)

Auto-articles arrive in volume, are machine-made, can go stale, and relate to each
other — so they need a real editorial-operations layer.

**9.1 Reuse the CMS, add a control layer.** Drafts live in `generated_articles`
(full body) until approved; on approval a single **idempotent promotion** writes into
the existing `articles` table, so the public site/TipTap/i18n render them for free —
and machine drafts can **never** trip the publish-time social-auto-post or sitemap.

**9.2 Lifecycle (state machine):**
`generated → pending_review → {approved → scheduled → published | needs_changes |
spiked}`; published → `{updated/correction | superseded | archived}`. Every
transition logged (who/what/when). **No `auto_published` state at launch.**

**9.3 Inverted volume (the product decision).** The Desk's primary job is to
**spike and merge** into **3–5 substantial stories/day** (one GCC roundup with real
cross-market synthesis + the 2–4 events that clear a high newsworthiness bar).
Routine events become entries in the **live data widget** and the **newsletter
block**, not standalone indexed URLs. Per-market briefs are `noindex` or folded into
the canonical roundup. The system generates **≤ editor capacity**, prioritized by
newsworthiness.

**9.4 Triage UX.** Prioritized queue (halts + flagged on top); bulk actions; draft +
provenance panel + verifier report + source data side-by-side; inline TipTap edit
with **edit-distance tracking**; one-click spike with reason. Confidence badge + *why
it's in review*.

**9.5 Provenance & trust.** Every number click-traceable → source row + snapshot +
extraction time. **Byline = desk byline** («مكتب آيكتيصاد للأسواق» / "IKTISSAD
Markets Desk") **plus the approving editor**, with a visible **"AI-assisted, reviewed
by [editor]"** disclosure. **Never a synthetic human byline.** A named human is
accountable for every published piece.

**9.6 Dedup & relationships.** No two articles on one event (DB-enforced at ingest +
checked at article layer). Follow-ups link to the original; the Desk decides
update-in-place vs new article; the prior piece is marked `superseded`.

**9.7 Corrections (finance-grade, first-class subsystem).** A correction is
**labeled a correction** (never "updated/clarified" for a factual error), timestamped,
prominent, and **propagated to every surface the original hit** (article, EN edition,
newsletter, social, widget, RSS/Apple News/Google News), with a **one-click
recall + correct** that kills the social post. If a *source* later revises a number
you published, the system flags the live article and drafts a correction. Article
versioning preserves what was published.

**9.8 Quote & compliance guardrails.** Quotes only from a whitelist, human-verified;
default to no quote rather than a risky one. The §8.4 compliance lint blocks
advice/forward-looking/unattributed-causation language before review.

**9.9 Feedback loop.** Track edit-distance + spike/reject reasons per desk → tune
prompts; track any post-publish corrections → recalibrate confidence; readership
analytics → prioritize.

**9.10 Roles & governance.** A markets-editor role approves; super-admin owns the
(future) auto-publish policy + thresholds; an editorial-standards doc covers
corrections, AI disclosure, and a banned-claims list tied to GCC securities law;
legal sign-off precedes any future auto-publish.

---

## 10. Orchestration & scheduling

- **Per-exchange cron** keyed to local close (`close_time_local` + tz), staggered;
  skip non-trading days via `trading_calendars`; handle half-days/ad-hoc holidays.
- **Disclosure polling** on a moderate cadence (e.g. 15–30 min) during session hours
  — conditional GET / `pubDate` on RSS to stay cheap.
- **EOD per-market** summaries at each close; **GCC roundup** after the last bell.
- Inngest concurrency caps on the **newsroom fan-out** (backpressure) and a global
  **token-budget circuit breaker**; step retries with backoff; **dead-letter table**
  for assignments failing max retries → editor alert (never a silent drop).
- **Calendar maintenance** job (yearly + on announcement).

---

## 11. Publishing & distribution

1. **CMS article** — promoted into `articles` on approval, with provenance panel.
2. **Live GCC Markets widget/page** — reader-facing, fed by `market_summaries` /
   `sector_indices`. **Standalone value; lead the product with this** (it's where
   IKTISSAD beats terminals on Arabic + cross-market context).
3. **Daily newsletter block** — validated data + roundup into the existing system.
4. **Social** — roundup + breaking halts via existing `social-posting.ts`, with the
   correction kill-switch wired in.
5. **Charts** — server-rendered index line + sector heatmap as article images.
6. **Bilingual** — AR primary + EN edition.

SEO: the roundup is the canonical indexed piece; routine briefs are `noindex`/widget
entries to avoid scaled-content-abuse and internal duplication.

---

## 12. Editorial admin UI (in existing admin)

Review queue (prioritized, bulk actions, provenance, verifier report); story-budget
board (incl. spiked items, for transparency/tuning); source health (feed status, last
run, quarantine rate); controls (confidence thresholds, macro sources, calendar
editor, cost dashboard); entity admin (clear quarantine, approve proposed aliases).

---

## 13. Observability, cost & guardrails

- **Run/cost ledger** (`agent_runs`, `scrape_runs`) — tokens, cost, latency per step;
  daily cost dashboard + a hard token-budget cap.
- **Alerts** on: feed failure, validation hard-fail, **entity-quarantine rate**,
  low source-confidence blocking an article, DLQ entries, cost overrun,
  zero-data-on-a-trading-day.
- **Editorial standards** enforced in pipeline (fact/opinion labels, compliance lint,
  attribution, corrections, AI disclosure).
- **Legal posture:** official/licensed sources only; redistribution clauses in
  writing; summarize-don't-reproduce disclosures; no auto-publish of financial claims.

---

## 14. Testing & QA

- **Source fixtures** — recorded feed payloads per exchange; parser unit tests;
  contract tests that fail loudly on schema drift.
- **Golden articles** — past event→expected-angle cases; regression-test newsroom
  output (LLM-judge + human spot-check).
- **Verifier red-team** — inject wrong/transposed numbers; assert the code diff
  catches them.
- **Confidence calibration** — score the confidence model against a labeled gold set;
  publish precision/recall per threshold *before* the number gates anything.
- **End-to-end dry runs** on the free/official three before integrating the licensed four.
- **Browser/QA** — `/browse` to verify the widget + a rendered draft.

---

## 15. Cost model (all-in, monthly)

AI tokens dominate; infrastructure is minor. (Inngest $75 Pro is **not** needed.)

| Scenario | Drivers | All-in / month |
|---|---|---|
| **Cheapest viable** | open feeds + Dubai Pulse, free Upstash/Inngest, Batch + prompt caching, Sonnet reporter, low volume | **~$170–285** |
| **Realistic production** | + aggregator license amortized, normal volume, some Opus | **~$450–800** + license fee |
| **Unconstrained** | Opus everywhere, large contexts, high volume | **$1,000+** |

Plus the **data license** (aggregator/TILA) — realistically low-five-figures/year for
delayed/EOD display tier (procurement, not infra). Free levers applied throughout:
EIA/FRED macro, Dubai Pulse (no proxy), prompt caching (−90% cached input), Batch API
(−50%), Sonnet-not-Opus Reporter, bounded Reporter context, daily token cap.

---

## 16. Secrets / accounts checklist

- `SUPABASE_*` (existing) + pgvector enabled (RAG deferred).
- AI Gateway key; per-model access.
- Inngest signing/event keys (Hobby cloud, or self-host).
- **Dubai Pulse** API key + secret (DFM).
- **Data license** credentials: aggregator feed (ADX/QSE/Bahrain) and/or per-exchange
  MDAs; **Tadawul TILA** feed credentials.
- EIA + FRED API keys (free).
- Slack/email webhook for alerts.
- *(No proxies, no Gateway tokens — deleted with the scraping layer.)*

---

## 17. Build sequence (A→Z, ordered)

> Reordered so the buildable/free work starts immediately while licensing is
> negotiated in parallel.

**A. Foundations**
1. Migration: all tables (§4) with keys/indexes/FKs + numeric types + mappers + TS types.
2. Seed `exchanges`, `sectors`, `companies` + `company_aliases` (the ~2k bilingual
   universe) + `trading_calendars`.
3. Inngest + AI Gateway wiring; `agent_runs` ledger; idempotency/memoization helper.

**B. Open + official sources (no procurement gate)**
4. Boursa Kuwait adapter (RSS + NewsPDF).
5. MSX adapter (RSS + `/newsdocs/`).
6. DFM via Dubai Pulse API.
7. Text-layer PDF extraction (+ scan-only vision fallback).
8. Deterministic entity resolution + classification + DB-enforced dedup.
9. Validation rules engine.
   → **Milestone 1:** 3 exchanges → validated canonical rows.

**C. Newsroom (prove on the free/official three)**
10. Macro feed (EIA/FRED).
11. News Desk (story budget, capped).
12. Reporter (dossier via SQL; bounded context).
13. Writer+Standards → deterministic Verifier → Translator.
14. Specialized desks (Halts, Dividends, Earnings first).
15. Staging tables + idempotent promotion into `articles`.
   → **Milestone 2:** real AR+EN drafts in the review queue, end to end.

**D. Editorial surfaces**
16. Review queue + story-budget board + source health + entity admin.
17. Live GCC Markets widget/page.
18. Charts; newsletter block; social (with correction kill-switch).
   → **Milestone 3:** full product loop on the free/official tier.

**E. Licensed exchanges (procurement-gated, in parallel from day one)**
19. Sign aggregator/MDA + Tadawul TILA.
20. Integrate Tadawul, ADX, QSE, Bahrain via the licensed feed(s).
   → **Milestone 4:** all 7 exchanges live, legally.

**F. Resilience & quality**
21. DLQ + backpressure + token-budget breaker; full staggered scheduling.
22. Corrections subsystem (multi-surface + recall) + compliance lint hardening.
23. Observability dashboards, cost caps, alerting (incl. quarantine rate).
24. Testing harness: fixtures, golden articles, verifier red-team, **confidence
    calibration**.
25. Scraper-doctor (propose-only) for clean-feed schema drift.
   → **Milestone 5:** observable, legally-clean, human-reviewed GCC newsroom.

---

## 18. Open decisions to confirm

1. **License route** — one aggregator (Mubasher/Decypha/DirectFN/Refinitiv) vs
   per-exchange MDAs + TILA. (Recommended: aggregator + free feeds for KW/MSX/DFM.)
2. **Editor capacity** — the daily story cap (drives the Desk's spike aggressiveness).
3. **Inngest** — Hobby cloud vs self-host on a small Ubuntu box.
4. **Widget-first scope** — ship the live data widget before the article engine?
5. **Future auto-publish** — confirm "none at launch; revisit only post-calibration +
   legal sign-off, widget-only."
