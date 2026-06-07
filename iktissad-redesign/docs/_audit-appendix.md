

\newpage

# Audit Findings — Required Revisions (v1 → v2)

> This section summarizes a five-perspective adversarial audit of the plan above
> (architecture, legal/compliance, applied-AI/cost, journalism/editorial, and
> data-engineering/FinOps). Five independent reviewers converged on the same core
> issues. **The plan as written has two dealbreakers and several build-blocking
> (P0) fixes.** Every fix makes the system simpler, cheaper, and safer. Treat the
> plan above as v1; this appendix defines the required v2 changes.

## Dealbreaker 1 — Do not scrape the auth-walled exchanges; license the data instead

Defeating Akamai (Tadawul), Cloudflare + token (ADX, Bahrain), and geo-gating (DFM)
to power a **commercial** product is not merely a Terms-of-Use breach — it is
potential **criminal liability in-jurisdiction**:

- **UAE Federal Decree-Law 34/2021** (cybercrime): unauthorized system access —
  AED 100k–1.5M and up to 5 years (applies to ADX, DFM).
- **Saudi Anti-Cyber Crime Law**: up to **10 years / SAR 5M** for data touching the
  "national economy" (applies to Tadawul).
- **ADX and QSE Terms of Use** explicitly prohibit systematic retrieval and
  commercial reuse, by name.

Critically, **stock prices and index values are not copyrightable** (Feist;
William Hill). Scraping therefore obtains the *same facts* a license would — with
none of the authorization and all of the risk.

**Required change — replace the Exchange Gateway / anti-bot pillar with official
channels:**

- **DFM** → Dubai Pulse open-API (already listed as the alternative; make it the default).
- **Tadawul** → sign the TILA information-provider license (the expected route for a news org).
- **ADX / Bahrain / QSE** → one regional aggregator (Mubasher / Decypha / DirectFN, or Refinitiv/LSEG) for delayed/EOD display tier — low-five-figures/year, replacing seven brittle scrapers.
- **Boursa Kuwait + MSX (Muscat)** → keep the clean RSS/PDF feeds (no anti-bot wall), with a Terms-of-Use check, polite rate-limiting, and attribution.

This deletes the Gateway single-point-of-failure, residential proxies, the anti-bot
maintenance treadmill, the (unworkable) "self-healing against Cloudflare" idea, and
the criminal exposure.

## Dealbreaker 2 — No auto-publishing of financial claims at launch

UAE **FDL33** (effective January 2026) criminalizes disseminating false or
misleading statements capable of influencing securities (penalties up to AED 200M
or 10× gains). Liability sits with the publisher; an LLM "confidence score" is not a
defense — and the score is **uncalibrated**, yet the plan makes it load-bearing for
the publish gate.

**Required change:** everything human-reviewed at launch. Revisit auto-publish only
after months of confidence calibration against a labeled gold set and a legal
sign-off — and even then only for the live data widget, never prose claims.

## Build-blocking (P0) technical fixes

1. **Make the fact-checker deterministic.** "An LLM verifies every number" will miss
   transpositions and derived-figure errors. Instead: the Writer must emit each
   numeric claim as structured data (`{value, unit, source_ref}`); a code step diffs
   it against the source row (and recomputes derived values). The LLM only judges
   attribution and causation — never arithmetic. The data model already supports this.
2. **Ban unattributed causation structurally.** "Frame causation" plus fact/opinion
   labels does not make a causal claim true. Require any causal clause to cite a
   quoted source, or render it as a hedged correlation ("coincided with"), never
   "because/as a result of."
3. **Text-first PDF extraction; numbers never from OCR.** Vision-LLM extraction of
   Arabic financial PDFs is ~65% accurate with errors concentrated on numbers — a
   direct contradiction of Principle #1. Use the text layer where present; take
   numbers from structured feeds; reserve vision for narrative text on true scans
   only (routed to Haiku/Sonnet, never Opus).
4. **Idempotency on publish.** Inngest is at-least-once; retried non-deterministic
   LLM steps produce duplicate/contradictory drafts. Add a unique constraint on
   `(story_budget_id, edition)` with an idempotent upsert as the final step, and
   memoize LLM steps by `input_hash`.
5. **Decouple from the production `articles` table.** The newsroom writes to its own
   staging tables; an article is promoted into `articles` only on editor approval —
   so machine drafts can never trip the publish-time social-auto-post or sitemap.
6. **Data model: add keys and indexes.** The schema ships zero keys and zero indexes
   as written. Add: `UNIQUE(exchange_id, ticker)` and partial-unique ISIN on
   `companies`; `UNIQUE(exchange_id, trading_date, index_name)` on `market_summaries`;
   `UNIQUE(dedup_hash)` on `disclosure_events` (prefer exchange-native IDs — QSE
   InfoID, ADX content id — over a synthesized hash); composite indexes on
   `disclosure_events(company_id, filed_at DESC)`; `numeric` (not float) for all
   money/index fields; declare the pgvector dimension; declare the FKs (which also
   fixes the postgrest `Relationships → never` typing problem).

## Design and scope refinements (P1)

- **Collapse the newsroom from 6 agents to ~4.** Merge Writer + Standards Editor
  (one Sonnet pass); use Sonnet, not Opus, for the Reporter on routine story types;
  reserve Opus for the News Desk and the adversarial check. ~30% cheaper, no quality
  loss — prove additions later with golden-article regression.
- **Invert the volume model.** Produce 3–5 substantial, genuinely synthetic stories
  per day plus the live data widget — not dozens of thin briefs. Route routine
  events into the widget and the newsletter, not standalone indexed URLs.
  `noindex` or fold the per-market briefs into the canonical roundup. This fixes
  Google's scaled-content-abuse risk (manual actions since June 2025), duplicate
  content, and editor overload simultaneously — and competes where the brand wins
  (Arabic narrative + cross-market context) rather than where incumbents (Argaam,
  Mubasher) win (raw real-time data).
- **Entity resolution is a sub-project, not a step.** Seeding ~2,000 bilingual listed
  companies and building a deterministic resolver (ISIN → per-exchange ticker →
  normalized Arabic/English name → indexed alias table → high-threshold fuzzy →
  quarantine) is ~2–3 weeks with ongoing curation. Budget it explicitly; use the LLM
  only to *propose* alias additions for human approval.
- **Defer pgvector RAG.** Start with entity-id + date-range SQL over your own tables
  for follow-up detection; add semantic RAG once archive depth justifies it.
- **Scraper-doctor is propose-only** for financial fields (never auto-patch
  extraction); and it cannot fix anti-bot breakage (a network-layer problem) — only
  selector/schema drift on the clean feeds.
- **Editorial guardrails to add:** a finance-grade corrections protocol
  (labeled-as-correction, propagated to every surface, with a social-post kill
  switch); an AI-disclosure + desk-byline standard ("AI-assisted, reviewed by
  [editor]" — never a synthetic human byline); a compliance lint pass (block
  unattributed causation, advice language, forward-looking claims); whitelisted,
  human-verified quotes only; and a named human accountable for every published piece.

## Cost reality

AI tokens dominate — not infrastructure. The $75 Inngest concern targets the wrong
line item.

| Scenario | All-in per month |
|---|---|
| Cheapest viable (official feeds, free Upstash/Inngest, Batch + prompt caching, Sonnet reporter, low volume) | ~$170–285 |
| Realistic production | ~$450–800 |
| Unconstrained (Opus everywhere, large contexts) | $1,000+ |

Free savings to apply: oil/rates data from **EIA + FRED** (drop any paid markets
API); **Dubai Pulse** instead of a UAE proxy; **prompt caching (−90% on cached
input)** and the **Batch API (−50%)** on all non-breaking generation; cap the
Reporter's context (top-K RAG chunks, bounded macro window, truncated filing text).
The cost lever is the Reporter's model and context size, not the infra SKUs.

## What survives unchanged (the strengths)

All five reviewers endorsed the same core: the deterministic-numbers /
agentic-meaning split; the validation gate before the LLM; the **provenance panel**
(better than most human newsrooms); and human-in-the-loop as the default. The v2
changes protect these strengths by removing the legal, reliability, and cost risks
that would otherwise sink them.

## Net effect of v2

> Official/licensed data (no scraping the gated four) → deterministic number-checking
> → a 4-agent newsroom → a few real stories per day plus a live data widget →
> 100% human-reviewed.

Cheaper (~$200–400 vs $1,000+), legally clean (no criminal exposure, no regulatory
landmine), more reliable (no anti-bot treadmill, no duplicate drafts), and more
credible as journalism.
