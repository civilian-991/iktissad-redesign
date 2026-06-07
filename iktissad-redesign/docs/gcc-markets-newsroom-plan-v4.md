---
title: "GCC Markets Autonomous Newsroom — Build Plan v4"
subtitle: "IKTISSAD · Arabic-only · n8n-orchestrated · origin-sourced · evidence-driven redesign after a 15-system comparative study"
date: "June 2026"
supersedes: "gcc-markets-newsroom-plan-v3.md"
companion: "gcc-markets-newsroom-research-appendix.md"
---

# GCC Markets Autonomous Newsroom — Build Plan **v4**

> v4 keeps v3's product (Arabic-only, n8n, Telegram screen-first, origin-sourced, complete-CMS
> output) but **re-architects the pipeline and re-sequences the roadmap** based on a code-level
> study of 15 comparable open-source systems (see the research appendix). The headline changes:
> the trust layer (ClaimCard, deterministic number-verification, idempotency, decision-logging)
> moves to **Phase 1**, not Phase 4; the Verifier and Researcher are redesigned from proven
> patterns; the Akamai egress is reframed as **the single keystone** that unblocks both sourcing
> and the flagship widget; and a free **Langfuse Cloud** layer closes all four ops gaps at once.

Status: **PARTIALLY LIVE** (the v3 vertical slice still runs). v4 is the plan to harden it into the
full product. Read v3 for the live-infra inventory; this doc only restates IDs where needed.

---

## 0. What carries over from v3 (unchanged)

- **Product decisions:** Arabic-only (no EN edition, no Translator agent, `*_en` empty);
  human-in-the-loop; no auto-publish of financial claims; quality over volume; deterministic where
  it concerns facts.
- **Live infra:** n8n `automation.iktissad.net`; Vercel AI Gateway (cred `X481PUJl6rh0AKU9`);
  Telegram @Iktissad_bot (cred `HdnrRkQus7s5btkX`, editor chat `8441765055`); Supabase project
  `vqdxinosmzezjveliemb` (cred `Y59XOCnYKY22pbuc`).
- **Live workflows:** Selector `i1PdqFuqOhhR1mbS`, Responder `IONLS3z9tlgNmH4A`.
- **Live tables:** `gcc_pending_drafts`; migration `20260604_044_gcc_newsroom.sql` written, not
  applied.

## 1. What changed v3 → v4 (decisions locked by evidence)

| Area | v3 | **v4** | Evidence (appendix §) |
|---|---|---|---|
| Trust layer timing | Phase 4 | **Phase 1** (ClaimCard, idempotency, number-verify, decision-log) | §2 meta-lessons 1,2,5,7 |
| Data shape | article blob | **claims-with-sources** (ClaimCard, evidence trace) | §3, §4, §6, §7 |
| Verifier | "diff where possible" | **inverted-FIRE loop + deterministic number diff + MISSING label + adversarial defender/prosecutor + deep adjudicator** | §8, §11 |
| Researcher | tool-using single pass | **typed parallel analysts + seed-search + per-turn retrieval + references-not-dumps** | §6, §8, §9, §7 |
| Cost/feedback | "tune from feedback" (vague) | **decision-log → editorial-profile + offline GEPA, human-gated** | §5, §10 |
| Origin egress | open decision | **managed browser w/ Saudi geo (Browserbase) #1; Patchright + SA residential #2** | §11 |
| Tadawul access | "needs clean egress" | **browser automation is the only proven path** (you already run it); Yahoo `.SR` price fallback | §12 |
| Observability | cost ledger ❌ | **Langfuse Cloud free tier** (cost + tracing + prompts + evals) | §15 |
| Arabic layer | implicit | **TS normalizer in-codebase for dedup; CAMeL NER microservice for entity-linking** | §13 |
| Live widget | "flagship, zero built" | **lightweight-charts v5 + Supabase Realtime + scheduled UPSERT** (gated on egress) | §14 |
| Images | open decision | **skip generative for v1** | §3, §5 |

---

## 2. Architecture — the redesigned pipeline

```
            ┌──────────────────────── SOURCING (keystone) ──────────────────────────┐
            │  TadawulFetcher (hexagonal: list / fetch_detail / search)              │
            │   • clean egress confined here (managed browser, Saudi residential IP) │
            │   • mint _abck → fetch JSON in browser context → persist PDF+JSON       │
            │   • cache key = (exchange, an_id); return refs+facts, never payloads    │
            │   • FactExtractor: deterministic numbers → verified_figures            │
            │   • fallback: Mubasher (tag provenance), Yahoo .SR for prices          │
            └───────────────────────────────────────────────────────────────────────┘
                         │ DisclosureRef[] (≈30 tokens each)
                         ▼
   SELECTOR (n8n)  rule classify + risk-tier (monotonic) → dedup (Arabic-normalized + an_id)
                   → Telegram screening card (✍️/skip)               [idempotency: UNIQUE(exchange,an_id)]
                         │ editor taps ✍️
                         ▼
   ┌──────────────────────── DEEP PIPELINE (Responder draft branch) ───────────────────────┐
   │ Desk      personas (fixed financial lenses) + risk-tier + identity-pin + privilege split│
   │ Researcher typed parallel analysts (disclosure / issuer-history / market-reaction / sector)│
   │ Writer    outline-first → section-by-section (per-section retrieval) → citation-during-gen │
   │ SEO       structured-output schema + novelty injector (secondary keywords)               │
   │ Verifier  inverted-FIRE: disclosure-first; number diff vs verified_figures; ClaimCard;    │
   │           adversarial defender/prosecutor (cheap) + adjudicator (deep); MISSING blocks    │
   │ Assembler ReviewBundle snapshot+hash; fill ALL CMS fields; NewsArticle JSON-LD            │
   └────────────────────────────────────────────────────────────────────────────────────────┘
                         │ ReviewBundle (status=active)
                         ▼
   TELEGRAM REVIEW  ✅نشر / ✏️تعديل / ❌رفض  (staleness guard: reject if draft changed after submit)
                         │ approve
                         ▼
   PUBLISH  idempotent insert (all fields, versioned immutable row) → articles
                         │
                         ▼
   POST-PUBLISH  decision-log (approve/reject/edit-diff) · CorrectionTicket→reopen · event-memory write-back

   CROSS-CUTTING:  Langfuse (trace/cost/prompts/evals) · snapshot-hash cache · status/attempts + pg_cron recovery · DB-enforced audit
```

### 2.1 Agent specs (what each does, and the pattern it's built from)

- **Desk** [reasoning model] — input: `DisclosureRef` + facts. Generates **fixed financial
  personas** (equity analyst, governance/board specialist, sector-macro, retail explainer; always
  include a "الكاتب الأساسي للوقائع" base persona) [STORM]; assigns **risk tier** via monotonic
  rules that can only *raise* risk [newsflow]; **pins identity** (canonical Arabic issuer name,
  ticker, sector, exchange injected into every downstream prompt) [TradingAgents]; routes
  section/sector/country. **Privilege split:** the agent that reads disclosure text cannot trigger
  publish [agentic-patterns dual-LLM].
- **Researcher** [strong model + tools] — **typed parallel analysts**: Disclosure-parser
  (the filing itself), Issuer-history (CMS archive + prior disclosures), Market-reaction
  (price/volume around the event), Sector. Each runs **seed-search-first** + a short per-turn
  retrieval conversation [gpt-researcher + STORM], over **references not dumps** (reads
  `search_disclosure(an_id, pattern)` slices, never the full PDF) [EDGAR]. Context compression with
  fast-path bypass. **No-source-no-claim** hard refusal.
- **Writer** [top writing model] — **outline-first (draft-then-refine)** → section-by-section with
  per-section retrieval → **citation-during-generation** with a URL-keyed unified index that drops
  hallucinated/uncited refs [STORM] → **lede written last** (inverted pyramid) → dedup polish pass.
  Emits **claims-with-sources** alongside prose.
- **SEO/Metadata** [strong model] — **structured-output schema** (typed JSON: title, deck, meta,
  slug, tags, og, JSON-LD, EEAT byline) so the CMS write never breaks; **novelty injector**
  surfaces unused entities as secondary keywords [Co-STORM].
- **Verifier** [reasoning model + code] — the trust-critical piece (§2.3).
- **Assembler** — freezes a **ReviewBundle** (draft + evidence + claim + risk snapshots →
  `bundle_hash`), fills **every CMS field**, attaches NewsArticle JSON-LD + EEAT byline +
  AI-disclosure, presents to Telegram. On نشر → **idempotent** insert of all fields as a versioned
  immutable row.

### 2.2 The trust-layer data model (Phase 1, not Phase 4)

New Supabase tables (lightweight ports of newsflow + FinSight):

```sql
-- atomic claim with four-bucket evidence (newsflow ClaimCard)
claim_cards(id, article_id, claim_text, claim_type,           -- number|name|date|semantic
  status,                                                       -- supported|contradicted|missing|unverified
  supporting_evidence jsonb, contradicting_evidence jsonb, missing_evidence jsonb,
  confidence_score numeric, risk_level, draft_anchor_ref, source_tier, reasoning)

-- deterministic figures extracted from the disclosure (FinSight metric store)
verified_figures(article_id, an_id, label, value numeric, unit, source_span)

-- immutable submit-time snapshot + staleness guard (newsflow ReviewBundle)
review_bundles(id, article_id, draft_version, claim_snapshot jsonb, evidence_snapshot jsonb,
  risk_snapshot jsonb, bundle_hash, status)                    -- active → superseded

-- versioned immutable article bodies (FinSight versioned reports)
article_versions(article_id, version, snapshot_hash, body jsonb, generated_at,
  unique(article_id, version))

-- editor decisions = the feedback corpus (openclaw + Hermes)
editorial_decisions(id, article_id, an_id, category, action,  -- approved|rejected|edited|manual_draft
  edit_diff jsonb, reason, decided_at)

-- post-publish corrections (newsflow CorrectionTicket)
correction_tickets(id, article_id, trigger_reason, impact_scope, proposed_fix, status, closed_at)

-- persisted knowledge (newsflow NewsroomMemory, but in Postgres)
event_memory(issuer_id, event_type, confirmed_facts jsonb, debunked_claims jsonb, persons jsonb,
  title_hash, occurred_at)

-- DB-enforced append-only audit (newsflow hash chain + the REVOKE it forgot)
audit_log(id, actor_id, actor_type, action, object_type, object_id, details jsonb,
  ai_model, ai_prompt_hash, ai_token_usage jsonb, override_flag, previous_hash, created_at)
-- + REVOKE UPDATE,DELETE and a BEFORE UPDATE/DELETE trigger that RAISEs
```

Idempotency: `UNIQUE(exchange, an_id)` on the disclosure-tracking table; publish via
`INSERT … ON CONFLICT DO NOTHING RETURNING id`.
Caching/corrections: `snapshot_hash = sha256(canonical JSON of {disclosure text, verified_figures,
source ids})` — reuse a draft if the hash matches; redraft automatically if the disclosure is
revised.

### 2.3 The Verifier (designed from FIRE + FinSight + TradingAgents)

1. **Type each claim** (number / name / date / semantic) from the Writer's claims-with-sources.
2. **Numbers/dates → deterministic diff** against `verified_figures` (exact/tolerance match, after
   Arabic-Indic→Western digit folding). The LLM never compares numbers.
3. **Semantic claims → inverted-FIRE loop**: disclosure checked *first and authoritatively*; the
   model may not answer from parametric knowledge; if not grounded in the disclosure → check
   gathered evidence → else **MISSING**. Low `max_steps` (2-3); redundancy early-stop.
4. **Three+ labels**: supported / contradicted / **missing** / unverified. MISSING and CONTRADICTED
   are **hard publish-blockers**.
5. **Mechanical confidence** = source-tier-weighted ratio (disclosure tier-1 ≈ 0.95), not LLM
   self-report; bucket ≥0.75 publish / 0.25-0.75 human-review / ≤0.25 block.
6. **Adversarial pass for contested claims only**: cheap-model Defender (argues supported) +
   Prosecutor (hunts unsupported/hallucinated/misattributed) → deep-model Adjudicator with a forced
   verdict and "don't default to PASS" [TradingAgents].
7. Output **populates `claim_cards`**; the Telegram card highlights unverified spans + a checklist.

### 2.4 The feedback loop (openclaw + Hermes/GEPA)

- Log every Telegram action to `editorial_decisions` (including the **edit-diff** — the highest-signal
  data) and `MANUAL_DRAFT` (editor covered something the Selector missed = blind-spot signal).
- Per-category drafting templates = **versioned Langfuse prompts** (labels: production/candidate),
  fetched at run start by the n8n Langfuse node.
- Weekly `pg_cron`: compute per-category accept/reject/blind-spot stats → append to an
  editorial-profile row (openclaw) AND, for high-reject categories, run an **offline DSPy+GEPA** job
  (~$2-10) that optimizes the classifier and drafting prompts using a **ground-truth metric**
  (approved-clean 1.0 / minor-edit 0.6 / rejected 0.0 + edit-distance) and **returns textual
  feedback** (the rejection/edit reason) to GEPA. Promotion is **human-gated** (diff sent to
  Telegram; flip the Langfuse label on approval) — never hot-swap.

### 2.5 Observability (Langfuse Cloud free tier)

One **session** per article; a nested **span** per agent; each Vercel-AI-Gateway call a
**generation** (instrument with the Langfuse OpenAI wrapper → auto tokens+cost). Register custom
model definitions for the gateway's `provider/model` strings so cost inference works. Push from n8n
via HTTP `POST /api/public/ingestion`. Prompt-version metrics (cost + median score) drive the GEPA
promotion decision; dataset experiments gate template changes.

---

## 3. Build roadmap (re-sequenced)

**Phase 0 — Foundations now (cross-cutting, cheap, high-leverage)**
0.1 Add 2 GB swap. 0.2 Wire Langfuse Cloud (OpenAI wrapper on the Gateway; spans from n8n).
0.3 Apply migration 044 + the new trust-layer tables (§2.2). 0.4 TS Arabic normalizer in-codebase
for dedup (§ appendix 13). 0.5 Start logging `editorial_decisions` from the *current* Responder
(even before the rest ships — begin collecting the corpus).

**Phase 1 — Keystone: origin egress + complete-article pipeline + trust layer**
1.1 **TadawulFetcher** adapter (managed browser w/ Saudi geo; mint `_abck`; fetch JSON in-context;
cache by `an_id`; references-not-payloads; deterministic FactExtractor → `verified_figures`).
Mubasher demoted to tagged fallback. 1.2 **Idempotency** (`UNIQUE(exchange, an_id)` + ON CONFLICT)
— prerequisite to enabling the schedule. 1.3 Rebuild the draft branch as the **deep pipeline**
(Desk→Researcher→Writer→SEO→Verifier→Assembler) emitting claims-with-sources and filling **all CMS
fields** + JSON-LD. 1.4 **ClaimCard + Verifier** (§2.3); MISSING/CONTRADICTED block publish.
1.5 **ReviewBundle snapshot+hash + staleness guard**; **versioned immutable** publish.

**Phase 2 — Trust hardening + feedback loop**
2.1 DB-enforced append-only audit. 2.2 CorrectionTicket → reopen; Arabic correction templates.
2.3 Persisted `event_memory` (debunked claims never re-asserted). 2.4 Feedback loop: editorial-
profile + offline GEPA, human-gated promotion (§2.4). 2.5 Keyword/rule **regression harness**
(golden disclosures, required figures, banned absolutist Arabic phrases) as a Langfuse dataset;
gate template changes.

**Phase 3 — Entity layer + scheduling**
3.1 CAMeL NER **microservice** (FastAPI, model loaded once); issuer/person extraction →
issuer-linking → event-memory (§ appendix 13). 3.2 status/attempts table + `pg_cron` recovery
sweep. 3.3 **Enable the Selector schedule** (now that idempotency + recovery exist) with
trading-calendar awareness.

**Phase 4 — Flagship live-markets widget**
4.1 Extend TadawulFetcher to market data (indices/movers/OHLCV) — same egress, same browser. Yahoo
`.SR` fallback for prices. 4.2 `market_summaries`/`market_sparklines`/`market_movers` + scheduled
UPSERT + Supabase Realtime. 4.3 `/markets` Arabic widget: hand-rolled lightweight-charts v5 client
component, Western-numeral formatters (`ar-SA-u-nu-latn`), RTL DOM, SSR-seeded.

**Phase 5 — Distribution + breadth**
5.1 Newsletter block + social (with correction kill-switch). 5.2 Add other GCC origins (ADX/DFM/
QSE/Boursa Kuwait/Bahrain/MSX) — each a new `DisclosureFetcher` behind the same ports. 5.3 Apple
News / Google News compliance (mostly done per v3).

---

## 4. Open decisions remaining (narrowed)

The big v3 decisions are resolved (see appendix §16). What's left is operational:

1. **Egress vendor:** Browserbase (managed, ~$39-99/mo, lowest effort) vs self-host Patchright + a
   specific Saudi residential proxy provider (~$10-30/mo, more effort, full control). Recommend
   **start Browserbase** to prove the loop, revisit self-host if cost/ToS bites at scale.
2. **GCC data residency for Langfuse Cloud** — acceptable, or must observability stay in-region?
   (If barred: Helicone proxy for cost-only, lose integrated prompts/evals.)
3. **Live-data freshness target** for `/markets` — 30-60s rollups (recommended for a news audience)
   vs paying a vendor (kun.pro) for real-time. Decide when Phase 4 starts.
4. **Writing-model A/B** — reason-in-English-localize-output vs pure-Arabic reasoning (TradingAgents
   pattern); measure with the Langfuse eval harness before locking.

---

## 5. Reference — IDs & endpoints

(unchanged from v3 — restated for convenience)
- Selector wf `i1PdqFuqOhhR1mbS` · Responder wf `IONLS3z9tlgNmH4A`
- Creds: Gateway `X481PUJl6rh0AKU9` · Telegram `HdnrRkQus7s5btkX` · Supabase `Y59XOCnYKY22pbuc`
- Telegram editor chat `8441765055` · bot @Iktissad_bot
- Gateway `https://ai-gateway.vercel.sh/v1/chat/completions`
- Mubasher (fallback) `https://www.mubasher.info/news/{cc}/now/announcements`
- Tadawul (origin, via egress) — announcements JSON `getAnnouncementListData`, detail by `anId`,
  category `1_23`; site is an IBM WebSphere portal (no composable REST — drive the rendered page /
  capture its XHR after minting `_abck`). See [Tadawul Announcements API] memory + appendix §12.

---

## 6. The single most important sentence

**Build the hardened Tadawul browser-fetch adapter first** — it is the keystone that unblocks both
the disclosure newsroom and the flagship live-markets widget, it is built on browser-automation you
already operate, and everything else (Verifier, ClaimCard, feedback loop, widget) composes cleanly
on top of the clean, deterministic, `an_id`-keyed facts it produces.

---

*v4 supersedes v3 as the build plan. The 15-system evidence base is in
`gcc-markets-newsroom-research-appendix.md`. v2 retains the deeper legal/sourcing rationale.*
