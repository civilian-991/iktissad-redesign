# GCC Markets Autonomous Newsroom — Complete A→Z Build Plan

> An agentic pipeline that ingests data and disclosures from the 7 GCC stock
> exchanges, thinks like a financial journalist (judgment → connect the dots →
> angle → write), fact-checks every number, and auto-drafts Arabic + English
> articles into the existing IKTISSAD CMS for editor approval — plus a live
> markets data product, newsletter, and social distribution.

Status: PLAN (not yet built). Owner: TBD. Target stack: Next.js 16 / Supabase /
Vercel AI SDK + AI Gateway / Inngest / a self-hosted Exchange Gateway worker.

---

## 0. Principles (the non-negotiables)

1. **Deterministic where possible, agentic where it adds judgment.** Numbers are
   fetched and validated by code; *meaning* (what's a story, the angle, the
   context) is the LLM's job. We never let an LLM invent a figure.
2. **Two streams, one newsroom.** Stream A = market data (EOD numbers). Stream B
   = disclosures/announcements (dozens of discrete events/day). Both feed one
   editorial pipeline.
3. **Journalism, not stenography.** Every published piece must show an *angle*
   and *connected context*, not restate a filing. Fact vs interpretation is
   always labeled.
4. **Grounded or it doesn't ship.** Every number traces to a source row; every
   causal claim is either data-backed or attributed.
5. **Human-in-the-loop by default.** Articles land as CMS drafts for editor
   approval. Auto-publish is opt-in per story type and gated on a confidence
   score.
6. **Self-healing.** When an exchange site changes, an agent re-discovers the
   data and proposes a fix instead of silently emitting N/A.
7. **Bilingual, RTL-first.** Arabic is primary; English is a first-class edition.
   Reuse existing i18n / `format.ts` / TipTap.

---

## 1. System architecture (the whole picture)

```
                         ┌──────────────────────────────────────────┐
                         │             THE WIRE (ingest)            │
  7 EXCHANGES            │  normalized + entity-linked event store  │
  ┌───────────┐  fetch   │                                          │
  │ clean     │────────► │  Stream A: market_summaries, indices     │
  │ feeds     │  HTTP    │  Stream B: disclosure_events (+ PDFs)     │
  │ (KW,MSX,  │          │  Macro:   macro_signals (oil/rates/FX)   │
  │  QSE)     │          └──────────────────────────────────────────┘
  └───────────┘                          │
  ┌───────────┐  via                     ▼
  │ gated     │  Exchange      ┌──────────────────────────────────┐
  │ feeds     │  Gateway       │  ENTITY RESOLUTION + DEDUP +      │
  │ (DFM*,ADX,│  (headless     │  PDF/Arabic EXTRACTION            │
  │  BHB,TDWL)│  browser svc)  └──────────────────────────────────┘
  └───────────┘                          │
        *DFM via UAE egress              ▼
                         ┌──────────────────────────────────────────┐
                         │   VALIDATION (deterministic rules)       │
                         │   breadth reconcile, mcap sanity, %↔pts   │
                         └──────────────────────────────────────────┘
                                         │
                                         ▼
   ╔══════════════════════ THE NEWSROOM (agentic) ══════════════════════╗
   ║  NEWS DESK / ASSIGNMENT EDITOR  → surveys whole wire + history,     ║
   ║     ranks, SPIKES non-stories, MERGES events into trend stories,   ║
   ║     flags FOLLOW-UPS → "story budget" (ranked assignments)         ║
   ║                         │                                          ║
   ║  REPORTER (per assignment) → builds evidence dossier: entity       ║
   ║     history, peer/sector compare, macro, archive RAG, full filing  ║
   ║     text, web quotes. Tests angle vs evidence; revises if needed.  ║
   ║                         │                                          ║
   ║  WRITER → inverted-pyramid Arabic, house voice, fact|opinion split ║
   ║                         │                                          ║
   ║  FACT-CHECKER → every number → source row, else strip/flag         ║
   ║                         │                                          ║
   ║  STANDARDS EDITOR → kills PR tone, ensures analysis+balance,        ║
   ║     hedges unconfirmed, adds "what to watch", scores confidence    ║
   ║                         │                                          ║
   ║  TRANSLATOR → English edition                                      ║
   ╚════════════════════════════════════════════════════════════════════╝
                                         │
                                         ▼
   ┌──────────────────────────── PUBLISH ───────────────────────────────┐
   │  CMS draft (status=pending_review, provenance panel) · charts ·     │
   │  live GCC Markets widget · daily newsletter block · social post     │
   └─────────────────────────────────────────────────────────────────────┘

   Orchestration: Inngest durable workflows + cron, driven by per-exchange
   TRADING CALENDARS (staggered local closes, holiday skip, retries, alerts).
   Self-healing: SCRAPER-DOCTOR agent on adapter failure.
   Observability: run ledger, cost meter, Slack/email alerts.
```

---

## 2. Tech stack & infrastructure decisions

| Concern | Decision | Why |
|---|---|---|
| Orchestration | **Inngest** (durable functions + cron + fan-out) | Native to Next.js/Vercel, step-level retries, replay, concurrency, event-driven — ideal for a multi-step newsroom with per-exchange schedules. |
| AI runtime | **Vercel AI SDK** via **AI Gateway**, model strings (`anthropic/claude-opus-4-8` for desk/reporter, `claude-sonnet-4-6` for write/edit, `claude-haiku-4-5` for classify/extract) | Provider fallback, observability, cost control; `generateObject`+Zod for all structured steps. |
| Heavy crawling / auth | **Exchange Gateway** — a self-hosted long-lived **Playwright + stealth** worker (Railway or Fly) that mints/refreshes cookies/tokens and proxies the gated JSON APIs | Tadawul (Akamai), ADX (Cloudflare+BPM token), Bahrain (Cloudflare+Bearer JWT) need a *persistent* browser session, not stateless fetches. crawl4ai used as the extraction lib inside it. |
| DFM geo-gate | Route DFM calls through a **UAE egress** (proxy) **or** the sanctioned **Dubai Pulse open-API** key | `api2.dfm.ae` times out from datacenter IPs. |
| Clean feeds | Plain HTTP from Vercel functions / Inngest steps | Kuwait RSS, MSX RSS, QSE `MarketWatch.txt` need no browser. |
| PDF + Arabic | **Vision-LLM extraction** (Claude) as primary, `pdf-parse` fast-path for text PDFs | Disclosure bodies are PDFs, often Arabic-only / scanned; a vision model is the robust path. |
| Database | **Supabase Postgres** (existing) + **pgvector** for archive RAG | Already the system of record; add tables, don't fork infra. |
| Storage | Supabase Storage (existing buckets) for cached source PDFs/snapshots | Provenance + reprocessing. |
| Charts | Server-rendered SVG (e.g. a small chart lib) → uploaded as article images | Index line + sector heatmap per article. |
| Secrets | Vercel env + Supabase Vault for the gateway tokens | — |

**Services to provision:** (1) the Exchange Gateway worker, (2) a UAE proxy or
Dubai Pulse key, (3) Inngest account, (4) AI Gateway, (5) a residential/clean IP
pool for the stealth browser if datacenter IPs get blocked, (6) Slack/email
webhook for alerts.

---

## 3. Data model (Supabase)

New migration `…_gcc_newsroom.sql`. Tables (camelCase mappers as per existing
convention):

**Reference / entity graph**
- `exchanges` — id, code (TADAWUL/ADX/DFM/QSE/BK/BHB/MSX), name_ar/en, country,
  currency, timezone, close_time_local, data_tier (clean|gated), source_config (jsonb).
- `trading_calendars` — exchange_id, date, is_trading_day, holiday_name. Seeded
  per exchange, updated yearly.
- `companies` — id, exchange_id, ticker, isin, name_ar/en, sector_id, aliases (jsonb),
  is_active. **The entity-resolution anchor.**
- `sectors` — id, exchange_id, name_ar/en, canonical_sector (cross-exchange map).
- `people` — id, name_ar/en, role, company_id (execs/board, for "connect the dots").
- `themes` — id, slug, name_ar/en (e.g. oil-rebound, bank-earnings, ipo-wave) —
  cross-market narrative tags.

**Stream A — market data**
- `market_summaries` — exchange_id, trading_date, index_name, index_close,
  change_points, change_percent, volume, value, num_trades, market_cap,
  market_cap_unit, advancers, decliners, unchanged, currency, source_url,
  extraction_ts, raw (jsonb), confidence, notes.
- `sector_indices` — market_summary_id, sector_id, close, change_points, change_percent.

**Stream B — disclosures**
- `disclosure_events` — id, exchange_id, company_id, type (enum: market_summary,
  earnings, dividend, agm_egm, board, halt, ipo_listing, ownership, capital_change,
  regulatory, debt_fund, other), title_ar/en, body_ar/en, filed_at, source_url,
  pdf_url, pdf_text, structured (jsonb of parsed fields), theme_ids (array),
  dedup_hash, raw (jsonb), confidence.

**Macro**
- `macro_signals` — ts, kind (brent, wti, usd_index, us_10y, fed_rate, gold,
  regional_headline), value, unit, source_url, payload (jsonb).

**Newsroom**
- `story_budget` — id, run_id, assignment (jsonb: angle, story_type, entity_ids,
  event_ids), newsworthiness, status (assigned|drafting|drafted|spiked).
- `generated_articles` — id, story_budget_id, article_id (FK → existing `articles`),
  edition (ar|en), confidence, fact_check (jsonb), provenance (jsonb: claim→source),
  status.
- `archive_embeddings` — article_id, chunk, embedding vector (pgvector) — RAG over
  own CMS for follow-ups.

**Ops**
- `scrape_runs` — id, exchange_id, started_at, finished_at, status, items, source,
  http_status, error, snapshot_url.
- `agent_runs` — id, run_id, agent, model, input_hash, tokens_in/out, cost,
  duration, status — the cost & audit ledger.

All tables get RLS + the mandatory `Relationships: []` array (postgrest-js gotcha).

---

## 4. Source adapters (per exchange) — concrete spec

Each adapter implements `fetchMarketSummary(date)` and `fetchDisclosures(since)`
→ canonical objects. Built from the live research.

| Exchange | Market data source | Disclosures source | Auth / wall | Adapter notes |
|---|---|---|---|---|
| **Boursa Kuwait** | Market Watch (15-min delayed, JS) + daily bulletin on `reports.` (F5-walled → via Gateway) | **RSS**: `rss.boursakuwait.com.kw/rss/FeedFull.aspx?T=0\|4\|5\|6` (EN) & `/A/rss/…` (AR); PDFs `docs.boursakuwait…/NewsPDF/{code}_NEWS_{yr}_{LANG}_{ts}.pdf` | clean for RSS/PDF | Easiest Stream B. Map T=0 halts, T=4 disclosures, T=5 AGM, T=6 insider. |
| **MSX (Muscat)** | `market-watch-custom.aspx` (AJAX, Gateway) + **RSS** `rss.aspx?t=Daily` | **RSS** `rss.aspx?t=Company` & `?t=Circulars` & `?t=Events`; PDFs `/msmdocs/images/newsdocs/{TICKER}-{DDMMYYYY}-{seq}.pdf` | none | Arabic-only PDFs → vision extraction. Stats RSS lacks links → scrape stats page. |
| **QSE (Qatar)** | **JSON** `qe.com.qa/pps/qse_files/MarketWatch.txt` (whole board) | HTML list → `displaynewsdetails?InfoID=N` (sequential, enumerable); body hydrates client-side → Gateway | WAF (browser headers/TLS) | Backfill via InfoID walk. Attachment URLs AES-encrypted → must scrape. |
| **DFM (Dubai)** | **JSON** `api2.dfm.ae/mw/v1/stocks\|indices\|status` | **JSON** `api2.dfm.ae/efsah/v1/prototype_efsah?types=&from=&to=`; `web/widgets/v1/data Command=GetAssemblyGeneralAssembly` | **geo/IP-gated** | Clean JSON but needs **UAE egress** or Dubai Pulse `dfm_indices-open-api` key. |
| **ADX (Abu Dhabi)** | `apigateway.adx.ae/adx/marketwatch-delayed/1.1/scrollingTicker` + `_next/data/{buildId}/…` | `apigateway.adx.ae/adx/tradings/1.1/news/category?categoryName=…&fromDate=&toDate=`; daily bilingual PDF `…/cdn/1.0/content/download/{id}` | **Cloudflare + BPM token** via `www.adx.ae/api/bpm/get-cookie` | Gateway mints token, then replays JSON. Indices also free from FTSE Russell. |
| **Bahrain Bourse** | `webapi.bahrainbourse.com/api/data/GetDailyTradingSummary` etc. | `…/GetAllAnnouncements?variationTitle=en&cid=0&month=-1&year=&pagenum=` + `GetAnnouncementDownloadsNew` for PDF | **Cloudflare + Bearer JWT** (short-lived, minted in `custom.js`) | Gateway loads page, captures token, replays. |
| **Tadawul (Saudi)** | flat EOD HTML `…/Resources/Reports-v2/DetailedDaily_en.html` + portlet `getMainNomucMarketDetails` | portlet `getNewsListData` (`…/issuer-news`); coarse type filters → sub-classify client-side | **Akamai** (full-domain 403) | Heaviest wall → headless-stealth session in Gateway; prefer flat report files for EOD. |

**Adapter contract:** every adapter is a small module with a `manifest` (selectors/
endpoints/URL patterns) kept in `exchanges.source_config` so the **scraper-doctor**
agent can patch it without a code deploy.

---

## 5. Ingestion pipeline

1. **Fetch** (per adapter, via Inngest step; clean → HTTP, gated → Gateway).
2. **Snapshot** raw payload/PDF to Supabase Storage (provenance + reprocess).
3. **PDF/Arabic extraction** — `pdf-parse` fast-path; fallback vision-LLM →
   `{text, structured fields}`. Normalize numerals (Arabic→Latin), strip commas,
   preserve currency & mcap unit (+ add full-number column).
4. **Entity resolution** — map ticker/name → `companies`; fuzzy + alias table;
   unmatched → quarantine queue + `notes`.
5. **Classification** — Haiku `generateObject` assigns `disclosure_events.type` +
   `theme_ids` + newsworthiness hint. (Cheap, deterministic-leaning.)
6. **Dedup** — `dedup_hash` (exchange+company+type+normalized-title+date); skip
   re-emits.
7. **Persist** canonical rows. Emit Inngest events (`event.ingested`,
   `summary.ingested`) that wake the newsroom.

---

## 6. Macro feed

Independent cron pulling, into `macro_signals`:
- **Oil**: Brent/WTI (EIA / a markets API).
- **Rates/FX**: US 10Y, Fed funds, USD index, gold (FRED / markets API).
- **Regional wire**: a curated set of RSS/news sources for GCC headlines (grounded,
  cited; used as *context*, never copied).

The reporter agent queries the macro window around an event to frame causation.

---

## 7. Validation (deterministic, pre-newsroom)

Rules engine over Stream A + parsed Stream B numbers:
- advancers + decliners + unchanged ≈ traded/listed count.
- change_percent reconciles with change_points / prev close.
- market_cap is main/equity market (not bonds/ETFs) unless flagged.
- sector indices same exchange + same date.
- mcap / volume sanity vs trailing N-day band → anomaly flag.
- cross-field currency + unit consistency.
Failures → `confidence` downgrade + `notes`, and (if hard) block article gen +
alert. This is also the anomaly signal the desk uses for "breaking" stories.

---

## 8. The newsroom (agentic core) — step by step

Implemented as an **Inngest workflow**; each agent is a Vercel AI SDK
`generateObject`/`generateText` call with a Zod schema, logged to `agent_runs`.

### 8.1 News Desk / Assignment Editor (model: Opus)
- **Input:** the day's full wire (events + market summaries + validation flags) +
  recent history slice + open follow-up threads.
- **Does:** applies news judgment (impact, prominence, timeliness, proximity,
  novelty); **spikes** routine items; **clusters** related events into trend
  stories; detects **follow-ups** to prior coverage (via archive RAG); proposes an
  **angle** + **story_type** per assignment.
- **Output (schema):** `story_budget[]` ranked, each `{angle, story_type,
  entity_ids, event_ids, why_now, suggested_desk}`.

### 8.2 Reporter (per assignment, model: Opus; fan-out)
- **Builds an evidence dossier:** entity history (per-company time-series, streaks,
  records), peer/sector comparison, macro window, **archive RAG** (own prior
  coverage), full filing text, web research for analyst/official quotes (cited).
- **Tests the angle against the evidence**; if data contradicts, revises the angle
  or flags "no story."
- **Output:** `{revised_angle, dossier{facts[], context[], quotes[], data_points[]},
  fact_opinion_map}`. Each fact carries a `source_ref`.

### 8.3 Writer (model: Sonnet)
- Inverted-pyramid **Arabic**, house voice (reuse existing style), bidi-isolated
  numbers (`format.ts`), TipTap-structured (headline, dek, body, pull-quotes).
- **Hard rule:** separate FACT (plain) from INTERPRETATION (attributed/hedged).
- Output: TipTap JSON + headline variants.

### 8.4 Fact-checker (model: Sonnet, adversarial)
- Extracts **every** numeric/factual claim → verifies against `source_ref` rows.
- Unsupported number → strip or flag. Emits `fact_check` report + provenance map +
  a numeric `confidence`.

### 8.5 Standards Editor (model: Opus)
- Kills press-release tone & unsupported causation; ensures genuine analysis +
  balance; hedges the unconfirmed; appends a **"what to watch next"**; sets final
  `confidence` and a `auto_publishable` boolean per the story type's policy.

### 8.6 Translator (model: Sonnet)
- Produces the **English** edition from the approved Arabic, preserving
  fact/opinion structure and numbers.

### 8.7 Specialized desks (the 12 types)
The desk routes each assignment to a **specialized prompt/policy** so each news
type gets the right template, fact-checks, and angle library:

| Desk | Trigger type | Angle library / checks |
|---|---|---|
| Market Summary | market_summary | breadth, streaks, leaders/laggards, vs macro |
| Indices/Sector | indices | sector rotation, outliers |
| Earnings | earnings | beat/miss vs prior & peers, margin trend |
| Dividends/CA | dividend, capital_change | yield, ex-date, payout vs history |
| Assemblies | agm_egm | resolutions, governance changes |
| Board | board | strategy/leadership signal |
| **Halts** ⚡ | halt | breaking alert, why, resumption |
| IPO/Listings | ipo_listing | size, sector, pipeline context |
| Ownership | ownership | stake change, who, implication |
| Regulatory | regulatory | rule impact (often spiked) |
| Debt & Funds | debt_fund | niche/data-only |
| **Trend/Synthesis** | desk-merged | the cross-event thesis |

---

## 9. Self-healing scrapers (scraper-doctor)

On adapter failure or schema-drift (validation can't find expected fields):
1. Capture a fresh DOM/network snapshot via the Gateway.
2. Scraper-doctor agent (Opus) inspects snapshot + the adapter `manifest`, locates
   the data, proposes a patched selector/endpoint as a **diff to `source_config`**.
3. Auto-apply if confidence high + a dry-run re-fetch validates; else open a
   ticket/alert with the proposed patch for a human.
4. Log to `scrape_runs`. Never silently emit N/A.

---

## 10. Orchestration & scheduling

- **Per-exchange cron** keyed to local **close time** (`exchanges.close_time_local`
  + tz), staggered (Gulf markets close at different times). Skip non-trading days
  via `trading_calendars`.
- **Intraday pollers** for Stream B (disclosures, esp. halts) on a tighter cadence
  during session hours.
- **EOD market-summary** job at each close → per-market brief; **GCC roundup** after
  the **last** close.
- Inngest concurrency caps per exchange (avoid Gateway contention); step retries
  with backoff; dead-letter → alert.
- **Calendar maintenance** job (yearly + on-holiday-announcement) to keep
  `trading_calendars` current.

---

## 11. Publishing & distribution

1. **CMS draft** — write to existing `articles` (status `pending_review`), linked
   via `generated_articles`, with a **provenance panel** (click any number → source
   row + snapshot). Auto-publish only for high-confidence policy-allowed types.
2. **Charts** — server-render index line + sector heatmap → upload as article hero/
   inline images.
3. **Live GCC Markets widget/page** — reader-facing, fed by `market_summaries` /
   `sector_indices` (standalone value even before articles).
4. **Newsletter** — daily markets block into the existing newsletter system.
5. **Social** — auto-post roundup + breaking halts via existing `social-posting.ts`.
6. **Bilingual** — AR primary + EN edition for each piece.

---

## 12. Editorial admin UI (in existing admin)

- **Review queue** — drafts with confidence, story type, provenance, fact-check
  report; approve / edit / spike.
- **Story budget board** — what the desk proposed today, including spiked items
  (transparency + tuning).
- **Source health** — adapter status, last successful run, scraper-doctor tickets.
- **Controls** — per-type auto-publish toggles & confidence thresholds; macro
  sources; trading-calendar editor; cost dashboard (`agent_runs`).
- **Entity admin** — resolve quarantined unmatched companies; manage aliases/themes.

---

## 13. Observability, cost, guardrails

- **Run ledger** (`agent_runs`, `scrape_runs`) — tokens, cost, latency, status per
  step; daily cost dashboard + budget cap that throttles non-critical gen.
- **Alerting** — Slack/email on: adapter failure, validation hard-fail, low-
  confidence spike rate, cost overrun, zero-data-on-trading-day.
- **Editorial standards** — fact/opinion labeling enforced; "AI-assisted, editor-
  reviewed" disclosure policy; correction workflow; no unsupported causation;
  attribution required for external claims.
- **Legal/ToS** — official sources only; respect robots/ToS; cache snapshots for
  provenance; rate-limit politely; flag any fallback to non-official source.

---

## 14. Testing & QA

- **Adapter fixtures** — record real payloads per exchange; unit-test parsers
  against them; contract tests that fail loudly on schema drift.
- **Golden articles** — a set of past event→expected-angle cases; regression-test
  the newsroom output against them (LLM-judge + human spot-check).
- **Fact-checker red-team** — inject wrong numbers; assert they're caught.
- **End-to-end dry runs** on the 3 clean feeds before wiring the gated 4.
- **Browser/QA** — use `/browse` to verify the live widget + a rendered draft.

---

## 15. Secrets / accounts checklist

- `SUPABASE_*` (existing) + pgvector enabled.
- AI Gateway key; per-model access.
- Inngest signing/event keys.
- Exchange Gateway worker host (Railway/Fly) + internal auth token.
- UAE proxy creds **or** Dubai Pulse `dfm_indices-open-api` key+secret.
- Residential/clean IP pool for stealth (if needed).
- Oil/rates market-data API key (EIA/FRED/markets provider).
- Slack/email webhook for alerts.
- Per-exchange: no logins needed for public data; Gateway handles cookie/token mint.

---

## 16. THE BUILD SEQUENCE (A→Z, ordered)

> Dependency-ordered. Each block is shippable/testable on its own.

**A. Foundations**
1. Migration: all tables in §3 + pgvector + RLS + mappers + TS types.
2. Seed `exchanges`, `sectors`, `companies` (from listed-company lists), and
   `trading_calendars` (current year per exchange).
3. Inngest setup in the Next app; AI Gateway wiring; `agent_runs` logging helper.

**B. Exchange Gateway worker**
4. Stand up the Playwright+stealth worker (Railway/Fly) with an internal API:
   `GET /fetch?exchange=&kind=`. Implement session/cookie/token mint + refresh.
5. Wire DFM egress (UAE proxy or Dubai Pulse key).

**C. Adapters — clean tier first (de-risk the newsroom)**
6. Boursa Kuwait adapter (RSS + NewsPDF) — Stream A + B.
7. MSX adapter (RSS Company/Circulars/Events + market-watch) — A + B.
8. QSE adapter (`MarketWatch.txt` + InfoID disclosures) — A + B.
9. PDF + Arabic extraction service.
10. Entity resolution + classification + dedup.
11. Validation rules engine.
   → **Milestone 1:** 3 exchanges flowing into validated canonical rows.

**D. Newsroom (prove on clean feeds)**
12. Macro feed cron.
13. Archive-RAG embeddings of existing CMS articles.
14. News Desk agent (+ story_budget).
15. Reporter agent (dossier + connect-the-dots).
16. Writer → Fact-checker → Standards Editor → Translator chain.
17. Specialized desks (start with Halts ⚡, Dividends, Earnings, then the rest).
18. Wire newsroom to CMS drafts + provenance.
   → **Milestone 2:** real Arabic+English drafts in the review queue from 3
     exchanges, end to end.

**E. Editorial surfaces**
19. Admin review queue + story-budget board + source health + controls.
20. Live GCC Markets widget/page.
21. Charts generation.
22. Newsletter block + social auto-post.
   → **Milestone 3:** full product loop on the clean tier.

**F. Gated exchanges**
23. DFM adapter (clean JSON via egress).
24. ADX adapter (Cloudflare + BPM token via Gateway).
25. Bahrain adapter (Cloudflare + Bearer JWT via Gateway).
26. Tadawul adapter (Akamai headless + flat EOD reports).
   → **Milestone 4:** all 7 exchanges live.

**G. Resilience & scale**
27. Scraper-doctor self-healing.
28. Full scheduling (staggered closes, intraday halt poller, calendar maintenance).
29. Observability dashboards, cost caps, alerting.
30. Testing harness (fixtures, golden articles, fact-check red-team).
31. Backfill history via sequential IDs (QSE InfoID, ADX CDN) to deepen the
    analyst's context.
   → **Milestone 5:** autonomous, self-healing, observable GCC newsroom.

---

## 17. Open decisions to confirm before coding

1. **Gateway: self-hosted vs managed** — self-hosted Playwright worker
   (recommended, full control of token mint) vs Firecrawl/Browserless.
2. **DFM access** — UAE proxy vs Dubai Pulse open-API key.
3. **Macro scope** — oil+rates+FX+regional wire from the start (recommended for
   real journalism) confirmed.
4. **Auto-publish policy** — which story types (if any) may publish without a human
   (candidate: high-confidence halts + data roundup), vs all human-reviewed.
5. **Hosting for the worker** — Railway vs Fly vs other.
```

