---
title: "GCC Markets Autonomous Newsroom — Comparative Research Appendix"
subtitle: "15 code-level dissections of comparable open-source systems, with lessons mapped to the IKTISSAD v3/v4 plan"
date: "June 2026"
companion_to: "gcc-markets-newsroom-plan-v4.md"
status: "reference — advisory research, not an execution record"
---

# GCC Markets Autonomous Newsroom — Comparative Research Appendix

> This document records a research sweep across 15 open-source systems, each **cloned and
> read at the source-code level** (real file paths, prompts, schemas, formulas), then mapped
> back to the IKTISSAD newsroom's pillars and gaps. It is the evidence base behind
> **v4** of the build plan. Nothing here was executed against the product; it is study.

## How to read this

- **§1** is the reference library (what each system is, why it matters).
- **§2** is the cross-cutting synthesis — the patterns that recurred across *multiple*
  independent systems (the highest-confidence signals).
- **§3–§17** are the per-system dissections.
- **§18** resolves the v3 open decisions with the evidence gathered.

Repos were cloned to `/tmp/research/*` (read-only) during the sweep; clone them again to
re-verify any quoted path.

---

## 1. The reference library (15 systems)

| # | System | ★ (approx) | Pillar it informs |
|---|---|---|---|
| 1 | [Yaogui415/newsflow-oss](https://github.com/Yaogui415/newsflow-oss) | 119 | Editorial trust layer — ClaimCard, approval state-machine, corrections, audit |
| 2 | [juanjuandog/FinSight-AI](https://github.com/juanjuandog/FinSight-AI) | ~1000 | Production resilience, deterministic financial metrics, snapshot-hash cache, regression eval |
| 3 | [jacob-bd/openclaw-newsroom](https://github.com/jacob-bd/openclaw-newsroom) | 166 | Cost discipline, dedup, editorial-feedback self-update loop |
| 4 | [stanford-oval/storm](https://github.com/stanford-oval/storm) | canonical | Deep research→article pipeline (perspective personas, outline-first, citation-grounded) |
| 5 | EDGAR family ([sec-edgar-agentkit](https://github.com/stefanoamorelli/sec-edgar-agentkit), [mcp-edgar-ux](https://github.com/bxxd/mcp-edgar-ux), [sec-edgar-agent](https://github.com/Aman12x/sec-edgar-agent)) | — | Official-source adapter pattern (references-not-payloads, deterministic XBRL verify) |
| 6 | [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) | ~84k | Financial multi-agent roles + bull/bear debate as adversarial verification |
| 7 | [assafelovic/gpt-researcher](https://github.com/assafelovic/gpt-researcher) | ~28k | Production deep-research; reviewer↔reviser loop |
| 8 | [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) + [self-evolution](https://github.com/NousResearch/hermes-agent-self-evolution) | ~4k | Self-improving loop (DSPy+GEPA), skills-from-experience, Telegram gateway |
| 9 | [mbzuai-nlp/fire](https://github.com/mbzuai-nlp/fire) + [FailSafe](https://github.com/Amin7410/FailSafe-Fact-Checking) | — | Atomic-claim fact-checking (the Verifier's core algorithm) |
| 10 | n8n/agent template libraries ([awesome-n8n-templates](https://github.com/enescingoz/awesome-n8n-templates), [awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps), [awesome-agentic-patterns](https://github.com/nibzard/awesome-agentic-patterns)) | 23k+ | Concrete n8n node wiring + agentic patterns |
| 11 | [techinz/browsers-benchmark](https://github.com/techinz/browsers-benchmark) + [anti-detect-comparison](https://github.com/pim97/anti-detect-browser-tools-tech-comparison) + [stagehand](https://github.com/browserbase/stagehand) | 321 / 52 / 23k | Clean-egress / anti-bot (the Akamai blocker) |
| 12 | Tadawul repos ([tadawul_mcp](https://github.com/Eldakhmisi/tadawul_mcp), [saudi-stock-market-api](https://github.com/StockerAPI/saudi-stock-market-api), [Saudi_Stock_Web_Scrape](https://github.com/zaakki-ahamed/Saudi_Stock_Web_Scrape)) | — | Saudi market data sourcing reality |
| 13 | [CAMeL-Lab/camel_tools](https://github.com/CAMeL-Lab/camel_tools) | 554 | Arabic NLP (normalization for dedup, NER for entity-linking) |
| 14 | [tradingview/lightweight-charts](https://github.com/tradingview/lightweight-charts) + react-wrapper + finnhub-pipeline | 16k | Flagship live-markets widget |
| 15 | [langfuse/langfuse](https://github.com/langfuse/langfuse) + agentops landscape | ~29k | LLM observability, cost ledger, prompt management, evals |

---

## 2. Cross-cutting synthesis — the 8 meta-lessons

These appeared in **three or more independent systems**, which makes them the strongest signals.

1. **Deterministic-first; the LLM never touches numbers.** FinSight computes metrics in
   `BigDecimal`; EDGAR-langgraph diffs XBRL within 5%; TradingAgents forces a
   "verified snapshot" tool; the FIRE lesson is "never let an LLM compare numbers" (Arabic
   mixes Arabic-Indic ٠-٩ and Western digits, currency scale). → **Extract and verify every
   figure in code; the model only writes prose around verified numbers.** This is *the*
   financial-newsroom invariant and it touches sourcing, Researcher, and Verifier at once.

2. **Object-centric, claim-level provenance — decided on day one.** newsflow (ClaimCard),
   FinSight (RagTrace + evidence binding), gpt-researcher (per-learning `sourceUrl`), STORM
   (URL-keyed citations). → Don't emit an article blob; emit claims-with-sources. Retrofitting
   this later is the painful path.

3. **Split the challenger from the judge; cheap model challenges, expensive model adjudicates.**
   TradingAgents (bull/bear on quick model, judge on deep), FailSafe (3-persona council +
   editor), gpt-researcher (reviewer↔reviser). → The Verifier = a cheap adversarial
   Defender/Prosecutor pass + one deep-model adjudicator.

4. **Snapshot-hash everything → free cache invalidation *and* corrections.** FinSight keys the
   cache on `sha256(all inputs)`, not the prompt. → If a disclosure is revised, the hash
   changes and the article auto-redrafts. Corrections infrastructure for free.

5. **Idempotency via natural key + UNIQUE index; status/attempts table + cron recovery. No
   broker.** FinSight, EDGAR (`anId`), openclaw (seen-DB). → `UNIQUE(exchange, an_id)` +
   `INSERT … ON CONFLICT` gives exactly-once publishing. **Must land before enabling the
   schedule.**

6. **References, not payloads.** EDGAR-ux returns a path (~50 tokens) not a 241K-token filing;
   Hermes uses progressive disclosure; STORM/gptr compress context. → Fetch the disclosure once,
   persist to Storage, pass everyone the URL + `anId` + extracted facts. Never dump a PDF into a
   prompt.

7. **The feedback loop is a decision-log → prompt, not fine-tuning.** openclaw (profile +
   blind-spots from `MANUAL_DRAFT`), Hermes (GEPA mines session logs with a ground-truth
   metric). → Your Telegram approve/reject/**edit-diff** log is the highest-signal training data
   either system never had. Log it from day one.

8. **Fail-closed, source-tier authority, no-source-no-claim.** Every financial repo privileges
   the canonical source; STORM/gptr/FIRE refuse to assert without evidence; gpt-researcher's
   fail-*open* curator is explicitly the thing **not** to copy. → The disclosure is tier-1 truth;
   anything unverified is held, not published.

### Per-agent distillation (the redesigned pipeline at a glance)

- **Desk** — STORM-style fixed financial personas + newsflow monotonic risk-tiering + TradingAgents identity-pinning + plan-then-execute privilege split.
- **Researcher** — typed parallel analysts (TradingAgents) + seed-search-first & parallel fan-out (gpt-researcher) + per-turn retrieval (STORM) + references-not-dumps (EDGAR) + context-compression fast-path (gptr).
- **Writer** — outline-first draft-then-refine (STORM) → section-by-section w/ per-section retrieval → citation-during-generation w/ URL-keyed dedup → lede-last → dedup polish pass.
- **SEO/Metadata** — structured-output schema + Co-STORM novelty injector for secondary keywords.
- **Verifier** — FIRE iterative loop *inverted* (disclosure-first, never parametric) + 3+ labels incl. MISSING + deterministic number diff (FinSight/EDGAR) + mechanical confidence from source tier (FailSafe) + adversarial defender/prosecutor + deep adjudicator (TradingAgents) → populates ClaimCard.
- **Assembler/Publish** — ReviewBundle snapshot+hash w/ `status='active'` staleness guard (newsflow) + idempotent publish + all CMS fields + versioned immutable rows.
- **Trust layer** — ClaimCard, DB-enforced append-only audit, CorrectionTicket→reopen, persisted event-memory.
- **Feedback loop** — decision-log → editorial-profile + offline GEPA optimization + per-category drafting "skills" (versioned rows), human-gated promotion.
- **Ops** — Langfuse Cloud (cost/tracing/prompts/evals), snapshot-hash cache, status/attempts + pg_cron recovery, golden-set regression eval.

---

## 3. newsflow-oss — the editorial trust layer

**Stack:** Python FastAPI + SQLAlchemy async + Pydantic; React/Vite frontend; LangChain
(`ChatOpenAI` + `ChatPromptTemplate`); SQLite or Postgres. Chinese-newsroom system; default
model `gpt-4o-mini`, high-risk `gpt-4o`, verification temp `0.0`. **Migrations dir is empty** —
tables created from ORM at runtime; "append-only/immutable" claims are convention only, not
DB-enforced.

### Data model (the object graph)
Spine: `EventCase → StoryPacket → {EvidencePack, ClaimCard, DraftVersion} → ReviewBundle →
ApprovalTask → DecisionLog`, with `ChannelPackage, RiskReport, CorrectionTicket, AuditLog,
SourceVault` attached. All IDs `String(36)` UUID; JSON stored as TEXT via `JSONType`.

- **`ClaimCard`** (`models/claim_card.py`) — the atomic claim. Fields: `claim_text, risk_level
  (L0–L3), status (default unverified), supporting_evidence(JSON), contradicting_evidence(JSON),
  missing_evidence(JSON), confidence_score(Float), manual_accept_reason, draft_anchor_ref (links
  claim → span in draft), verified_by`. The **four-bucket evidence matrix** (support / contradict
  / missing / score) is the reusable core.
- **`EvidencePack`** — versioned; `version, sources(JSON), citation_anchors(JSON),
  completeness_score, is_snapshot, snapshot_of_id`. Send-to-review clones the live pack as a
  snapshot.
- **`ReviewBundle`** — the **immutable submit-time snapshot**: `draft_version_id,
  evidence_pack_id, claim_snapshot(JSON), risk_report_snapshot(JSON), bundle_hash(String64),
  status (active → superseded)`.
- **`ApprovalTask`** — `approval_stage, status, policy_rule(JSON), signer_slots(JSON),
  execution_mode (sequential/any/all), sla_deadline`.
- **`DecisionLog`** — the human sign-off, INSERT-only: `signer_id, signer_role, action,
  decision_reason, override_ai_flag, override_reason, return_category`.
- **`ChannelPackage`** — per-platform; `drift_score` vs `drift_threshold(0.30)` gates publish
  (guards a per-channel rewrite from diverging from approved facts).
- **`CorrectionTicket`** — `trigger_reason, impact_scope, proposed_fix, status (open→…)`.
- **`AuditLog`** — append-only hash chain: `actor_id, action, object_type, object_id,
  details(JSON), previous_hash(String64), ai_model, ai_prompt_hash, ai_token_usage(JSON),
  override_ai_flag`.

### Verification logic (`agents/verification.py`)
Two LLM steps + a deterministic scorer:
- `DECOMPOSE_CLAIMS_PROMPT` → atomic claims; splits compound sentences, surfaces *implicit*
  claims, and **reframes single-source/anonymous claims as "X claims Y", never as fact**.
- `CROSS_VERIFY_PROMPT` → per-claim `status ∈ {supported, contradicted, insufficient,
  unverified}` + `confidence_score` + three evidence buckets. **Biases to `insufficient` when a
  key party's response is missing or the chain doesn't close.**
- **Deterministic `calculate_confidence(source_types, consistency, recency_days)`** =
  `max(SOURCE_CREDIBILITY_WEIGHTS)` (official_announcement 0.95, court/regulatory 0.90,
  mainstream 0.75, social 0.30, anonymous 0.15) × consistency × recency factor. The LLM and
  deterministic scores both exist but are **not reconciled** — use the deterministic one to gate.
- `build_evidence_matrix()` auto-raises `high_risk_alerts` when an L2/L3 claim is contradicted or
  insufficient.

### Approval state-machine (`core/state_machine.py`)
Declarative `Transition{from, to, preconditions[], requires_approval, approval_stage}`.
StoryPacket states: `created → researching → verification_pending → drafting → editorial_review →
risk_review → channel_packaging → channel_review → ready_to_publish → published → monitoring →
{reopened, archived}` + lateral `killed`. **Fail-closes on unresolved `blockers`.** Human gates =
`requires_approval=True` transitions; publish needs `human_publish_confirmed`; reopen needs an
open CorrectionTicket. Risk-tiered policy as data: `APPROVAL_POLICIES[risk_level][stage] =
{required_signers, execution_mode, sla_hours}` (e.g. L3 risk_review = `[compliance_editor, legal,
chief_editor]`, `all`, 24h). **L2/L3 approvals require a typed reason; AI-override requires a
reason.**

### Top lessons for IKTISSAD
1. Adopt the **ClaimCard four-bucket model** verbatim (Supabase table). `missing_evidence` +
   `draft_anchor_ref` are the high-value columns — render "this Arabic sentence is unverified"
   inline and drive a Telegram checklist.
2. Split confidence into deterministic + LLM; **gate on the deterministic one**. GCC source
   weights: exchange/regulator ~0.95, social low.
3. Encode the verification prompt's priors: reframe single-source as "X claims Y"; bias to
   `insufficient`.
4. **Risk-tiered approval as data** (`approval_policies` table); n8n Switch on `risk_level` →
   one editor (L0/L1) vs multi-confirm (L2/L3). Keep "typed reason required" rule.
5. **Deterministic risk rules that only raise risk** (monotonic), run as a cheap n8n node before
   LLM triage.
6. **ReviewBundle snapshot + hash + `status='active'` staleness guard** — reject a stale approval
   if the draft changed after submit. Closes the "approved an older version" hole.
7. `blockers` + fail-closed publish.
8. **Append-only audit with a real hash chain — but enforce immutability in Postgres** (RLS +
   `REVOKE UPDATE,DELETE` + trigger), which newsflow itself omitted.
9. CorrectionTicket → reopen precondition; steal the three correction templates (correction /
   supplement / retraction), translate to Arabic.
10. **Persisted knowledge write-back** (newsflow's `NewsroomMemory` is in-RAM and evaporates) —
    make it a real `event_memory` table keyed by issuer; store **debunked_claims** so the pipeline
    never re-asserts a known-false claim.

### Do NOT copy
Two unreconciled implementations of audit and of CorrectionTicket; in-memory orchestrator and
NewsroomMemory; empty migrations / no DB-level immutability; `SourceVault` "AES-256" is vaporware
(plain TEXT); the hash-chain has a global-vs-per-object inconsistency; `detect_logical_contradictions()`
is a CJK-specific toy; naive `datetime.utcnow()`; regex JSON extraction.

---

## 4. FinSight-AI — production resilience + deterministic finance

**Stack:** Spring Boot 3 (Java) + FastAPI AI sidecar + Postgres/pgvector + RabbitMQ + Redis +
Elasticsearch + MinIO (per README — **but ES/MinIO are dead infra; zero code references them**).
China A-share oriented. Dual persistence (in-memory default; JDBC under `postgres` profile).

### Resilient workflow
- **`WorkflowTask`** record: `idempotencyKey, status, stage, attempts, leaseOwner, fencingToken`.
  `failed()` dead-letters at `attempts >= 3`.
- Idempotency two layers: deterministic key `source:symbol:date`; DB-enforced
  `createIfAbsent()` catching `DataIntegrityViolationException` on a UNIQUE constraint, plus
  `INSERT … ON CONFLICT DO UPDATE`.
- **Redis Lua single-flight lease** (atomic lease + monotonic fencing token); falls back to a
  local `ConcurrentHashMap` lock if Redis absent (proves single-node doesn't need Redis).
- **`WorkflowRecoveryScheduler`** `@Scheduled(60s)`: finds `RUNNING` tasks older than `PT10M`,
  dead-letters or retries. Backed by `idx_workflow_tasks_status_updated`.
- RabbitMQ DLX/DLQ with `setDefaultRequeueRejected(false)`; non-rabbit profile runs synchronously
  via `DirectWorkflowTaskPublisher` (proves the broker is optional).

### Deterministic financial metrics (the Verifier blueprint)
- `MetricDefinitionCatalog` — a versioned DAG (`metric-dag-v2`) of `source()` and `derived()`
  metrics (ROE, DEBT_RATIO, YoY, CASH_EARNINGS_GAP, RECEIVABLE_GROWTH_SPREAD). All `BigDecimal`,
  `HALF_UP`, scale 8; div-by-zero → 0. **Zero LLM.**
- `RiskRule` components with **hardcoded thresholds** (LeverageRule `DEBT_RATIO>0.65`,
  CashEarningsQualityRule `OCF_NET_PROFIT<0.8`, etc.), deterministic signal id
  `nameUUIDFromBytes(symbol:code:title)` for idempotent re-detection.

### Snapshot-hash cache invalidation
`contextHash(request)` = `sha256(JSON of {symbol, quote, all metric values, all risks, evidence
identities})`. **Cache key = `symbol + ":" + dataSnapshotHash`** → invalidation is automatic; if
any input changes the key changes and the old entry is never read. Reports versioned
(`reportVersion = count + 1`, `UNIQUE(symbol, version)`).

### Evidence tracing + RAG
`DocumentChunker` (220 chars, 40 overlap, section metadata). `HybridRetrievalGateway` merges
keyword (Postgres FTS `ts_rank`) + vector (pgvector `<=>`), dedup by id with a +0.08 hybrid bonus.
`EvidenceRetriever` **synthesizes pseudo-evidence chunks from the deterministic metric store**
(score 0.95) so computed numbers enter the evidence pool as first-class citations the LLM may only
*cite*, not invent. Every answer ships a persisted `RagTrace{channels, evidenceCount, latency}`.

### Regression eval (the testing harness)
`RagEvaluationService` — hand-rolled, keyword/heuristic (no LLM judge → deterministic, CI-friendly):
weighted composite of **evidenceCoverage (0.25), answerCoverage (0.30), hallucinationRisk
(banned absolutist words + token-overlap), conclusionConsistency, confidenceCalibration,
ragHitRate, citation presence, latency**. `passed = failures.isEmpty()`. All six named metrics
exist verbatim.

### Graceful degradation
Every external dep has a deterministic local fallback that swallows the error: embeddings →
SHA-seeded pseudo-vector; rerank/answer → templated; LLM analysis → rule-based rating; Redis lease
→ local lock; Rabbit off → synchronous. Runs end-to-end with zero LLM/Redis/Rabbit.

### Top lessons for IKTISSAD (lightweight equivalents)
1. **Idempotency key = natural business key + UNIQUE index**: `UNIQUE(exchange, an_id)`,
   `INSERT … ON CONFLICT DO NOTHING RETURNING id`. Exactly-once drafting, no Redis.
2. **Snapshot-hash cache key**: `data_snapshot_hash` on each article version; reuse if found,
   redraft if the disclosure changed. Free invalidation, no TTL.
3. **Deterministic figure verification BEFORE prose, figures fed in as the only allowed numeric
   source.** Parse figures with rules → `verified_figures` table → Verifier rejects any draft
   number not in the set.
4. **Status/stage/attempts table + `pg_cron` recovery sweep** replaces RabbitMQ 1:1.
5. **Dead-letter as a status** + manual `/retry`.
6. **Versioned immutable reports** (`article_versions`, `UNIQUE(article_id, version)`).
7. **Per-output evidence trace** (`trace` JSONB: disclosures/figures/sources/prompt-hash/model/
   tokens).
8. **Keyword/rule regression eval in CI** (golden disclosures, required figures/phrases, banned
   absolutist Arabic phrases). Gate deploys.
9. Every external call has a deterministic fallback marked `ai_generated=false`.
10. Per-entity audit rows beat fancy metrics at newsroom scale.

### Do NOT copy
RabbitMQ/DLX, Redis single-flight (use a Postgres advisory lock if ever multi-node), Redis cache
tier, **Elasticsearch + MinIO (README claim, no code)**, the Ollama sidecar + hashing-embedding,
the `@Profile` in-memory/JDBC duplication. Note: `COMPENSATING` state has no saga logic; eval is
substring-only with 3 near-identical cases; thresholds are hardcoded literals (externalize them).

---

## 5. openclaw-newsroom — cost discipline + feedback loop

13 shell+Python scripts, stdlib-only, state in flat files + one SQLite DB. **No Telegram code**
(delivery delegated to OpenClaw's channel system). Cron: 7 fixed daytime slots (README says "every
2 hours" — mismatch).

### Pipeline & graceful degradation (`news_scan_deduped.sh`)
`set -e` but every source wrapped in `timeout … || echo "Warning (continuing)"` + counter-to-zero;
`trap cleanup EXIT`. Collect (5 sources) → `quality_score.py --max 50` → `enrich_top_articles.py
--max 8 --max-chars 1200` → `llm_editor.py`. If all LLM providers fail, candidates persist to a
file with a manual re-run command (nothing lost). All scored candidates recorded to dedup DB.

### Quality scoring (`quality_score.py compute_score`)
`PRIORITY_SOURCES` points (T1 +5 / T2 +3 / X +2) **stacked** with numeric tier points (+4/+2/+1) +
`min(HIGH_VALUE_KEYWORDS×2, 6)` + `BREAKING_KEYWORDS +3` + title-length heuristic. **No recency
term** (dangerous for time-sensitive disclosures — add one).

### Dedup (`dedup_db.py`)
SQLite `seen_articles(url_normalized, url_original, title, source, status, first_seen, scan_id)`.
`normalize_url` strips trailing punct, forces https, drops `www.`, strips trailing slash, **drops
all query+fragment**. Three thresholds: within-batch 80%, cross-scan title 75% over a 2-day window
(`SequenceMatcher`). Written at scored/presented/published stages.

### LLM curation (`llm_editor.py`)
**SQLite pre-filter before any LLM call** (`filter_already_posted`) — the core cost lever; exits
with 0 picks and zero tokens if nothing new. **3-tier failover** (Gemini Flash Lite → OpenRouter
Grok → Gemini Preview); skips providers with no key; shrinks candidate list to 30 on retry. Prompt
injects the **editorial profile verbatim** + recent-picks tail + candidates; rules: "3 great > 7
mediocre", max 2/source, 1-sentence why, rank breaking>deals>launches>analysis.

### Editorial-feedback self-update loop (the gem — `update_editorial_profile.py`)
Human logs `[ts] APPROVED|SKIPPED|MANUAL_DRAFT | title | url | category` to
`editorial_decisions.md`. `analyze_patterns` tallies per-category approve/skip/manual + approval
rate. **Blind-spot detection:** a category where `manual_draft > approved` is flagged — "the
editor seeks this out more than the scanner finds it." `update_profile` surgically rewrites only
the auto-generated stats tail; hand-written "always pick / never pick" rules preserved.
**Feedback-as-context, not fine-tuning.**

### Top lessons
1. **SQLite-pre-filter-before-LLM** → Supabase `seen_disclosures`; for GCC use exchange + `anId`
   (stronger than URL).
2. Two-stage dedup (within-batch 0.85, cross-window 0.75) — but **normalize Arabic first** (see
   §13), don't `SequenceMatcher` raw.
3. **Editorial-profile-as-prompt** in a Supabase `settings` row; human-written rules + appended
   stats.
4. **`MANUAL_DRAFT` = blind-spot signal** — log "I'll cover something you didn't surface" in the
   Telegram decision log; nightly `pg_cron` computes `manual > scanner` per sector.
5. Best-effort per-source isolation (n8n "Continue On Fail" + Merge).
6. Failover across vendors, cheapest-first, shrink-on-retry.
7. Quality score = coarse pre-rank to bound prompt size; **add recency**.
8. Gated, capped enrichment (top-N, char cap, paywall skip-list).
9. Append-only logs as audit; DB for queries.
10. The whole tuning budget = one prompt + one nightly stats script before any classifier.

### Do NOT copy
Flat-file URL fallback; `SequenceMatcher` on raw Arabic; stacking two trust signals; no recency
term; two drifted keyword filters; hard-coded sources; README counts; the bash orchestration
itself (you're on n8n); bird-CLI/Chrome-cookie Twitter auth.

---

## 6. STORM / Co-STORM — deep research→article

DSPy-based; `knowledge_storm/` with `storm_wiki/` and `collaborative_storm/`. Four checkpointed,
file-passing stages.

### Pipeline
1. **Knowledge curation** — generate personas, run one writer↔expert conversation per persona in
   parallel threads → `StormInformationTable`.
2. **Outline** — concat all dialogues → **draft-then-refine** (draft from parametric knowledge,
   refine against conversation).
3. **Article generation** — embed index over all snippets (`paraphrase-MiniLM-L6-v2`); write each
   top-level section in parallel (skip intro/conclusion), re-retrieving per section; post-process
   prunes + renumbers references.
4. **Polish** — lead/summary generation (front-inserted) + de-duplication pass.

### Signature techniques
- **Perspective-guided personas** — `FindRelatedTopic` scrapes TOCs of similar articles →
  `GenPersona` builds a panel; a default "Basic fact writer" is always prepended.
- **Simulated conversation** — `ConvSimulator` loop, `max_conv_turn=3`, self-terminates on "Thank
  you so much for your help!"; keeps last 4 turns full, older summarized; **every expert turn is
  RAG-grounded** and **hard-refuses if retrieval is empty** (no-source-no-claim).
- **Citation-during-generation** — `WriteSection` demands inline `[n]`; `update_section` drops
  hallucinated indices and uncited sources, maps local→**global URL-keyed** citation index;
  `reorder_reference_index` renumbers by appearance and deletes uncited refs.
- **Multi-model split** — `conv_simulator_lm`/`question_asker_lm` = gpt-4o-mini; `article_gen_lm`/
  `article_polish_lm` = gpt-4o. `_lm` suffix auto-wires usage/cost.
- **Pluggable retriever** — `dspy.Retrieve` subclasses (one `forward(query, exclude_urls) → [{url,
  title, description, snippets}]`); `VectorRM` = local-corpus RAG (model for your CMS-archive
  retriever).

### Co-STORM HITL
Round-table of `CoStormExpert` + `Moderator` (novelty injector: picks uncited/unused snippets,
scored "close to topic, far from already-covered") + `SimulatedUser`. Dynamic **mind-map
KnowledgeBase** with node-expansion. `step()` to observe or `step(user_utterance)` to inject.
Report = mind-map walk.

### Top techniques to port (→ which agent)
1. Perspective personas (→ Desk/Researcher) — but **hardcode** financial lenses, don't survey the
   open web. Keep the "Basic fact writer" default. Survey *your CMS archive* not Wikipedia.
2. Writer↔expert RAG conversation w/ per-turn retrieval (→ Researcher).
3. No-source-no-claim hard refusal (→ Researcher/Verifier).
4. Draft-then-refine outline (→ Writer).
5. Outline-first section-by-section parallel writing w/ per-section retrieval (→ Writer) — swap to
   a multilingual/Arabic embedder.
6. Inline citation + URL-keyed unified index + drop-hallucinated-and-uncited (→ Writer/Verifier/
   Assembler).
7. Skip auto intro/conclusion; synthesize lede last (→ Writer).
8. Dedup polish pass (→ Assembler).
9. Multi-model `_lm` split (cross-cutting).
10. Context compression in long loops.
11. Provenance in `meta` (question+query) into the writing prompt.
12. Moderator novelty injector (→ Researcher/SEO).

### Do NOT port
Open-web "related topics" surveying; URL-only dedup with no authority ranking (privilege the
disclosure); the "no intro/conclusion" rule blindly (finance needs an outlook section); the
self-termination string as sole stop; `ground_truth_url` exclusion (that's an eval artifact — you
want the opposite); aggressive first-snippet-only truncation for numeric/tabular content; full
Co-STORM HITL round-table (overkill — port the mind-map, not the interactive loop).

---

## 7. EDGAR family — official-source adapter pattern

Three shapes: **edgar-agentkit** (toolkit, mostly stubs — teaches the tool taxonomy),
**mcp-edgar-ux** (real MCP server, hexagonal — the richest), **sec-edgar-agent/AFIP** (LangGraph
pipeline with a deterministic verifier loop).

### The headline pattern: references not payloads (edgar-ux)
README: *"I return file paths, you use Read/Grep/Bash. A Tesla 10-K is 241K tokens — I save it to
disk so you read only what you need."* `FetchFilingService.execute` downloads once, writes to
disk, `del content` (10-160 MB released), returns `FilingContent` with `content=""` and only
`path/size/total_lines`. Each result ends with an **affordance line** teaching the next call. Search
shells out to `ugrep` and returns only matched lines + context (~50 tokens, not 241K).

### Hexagonal ports (edgar-ux `core/ports.py`)
`FilingFetcher` (`list_available, fetch, get_latest`), `FilingRepository` (disk cache
`get/save/list_all/exists`), `FilingSearcher`. 4 agent-facing tools (`fetch_filing, search_filing,
list_filings, get_financial_statements`); synthetic `CORE` category (essential forms) — analogous
to Tadawul category `1_23`.

### Deterministic XBRL verification (sec-edgar-agent — the Verifier gold)
`xbrl_utils.py` regex-extracts `<ix:nonFraction>` order-independently (name/contextRef/scale/
decimals/value), **scale-normalizes to millions**, filters to a concept allow-list, dedups by
`name|contextRef`, compresses to a token-cheap snippet. The judge **cross-checks LLM amounts
against XBRL within 5%**, returns a structured critique and **loops up to N** (`should_retry`).
Completeness guards: "text has dollar amounts but instruments list is empty" → likely a block page.

### Caching, dedup, polite fetching
edgar-ux keys disk by `(ticker, form, date)`, dedups by accession number, TTL+stale-while-
revalidate for listings, disables the library's HTTP cache (caused 1.8 GB RSS). sec-edgar-agent:
**token-bucket** rate limiter (10 req/s, burst 10) + tenacity exponential backoff; **validates UA
at node entry** (rejects `example.com`). The native filing ID is the natural dedup key everywhere.

**Egress caveat:** none solve datacenter-IP banning — SEC is open to datacenter IPs given a UA +
≤10 req/s. The SEC ecosystem solved *politeness*, not *clean egress* (that's §11).

### Recommended IKTISSAD adapter
Hexagonal ports, one `DisclosureFetcher` per exchange, `(exchange, an_id)` PK everywhere,
clean-egress confined to the fetcher, deterministic `FactExtractor`. `list_disclosures(category=
"1_23")` → `DisclosureRef[]` (~30 tokens each); `fetch_detail(an_id)` → fetch once via egress,
persist JSON+PDF to Storage, run `extract_facts`, return URLs + facts dict, `del raw`;
`search_disclosure(an_id, pattern)` → FTS over the persisted artifact. Deterministic Verifier =
`FactExtractor` + a judge looping on numeric diff within tolerance.

---

## 8. TradingAgents — financial multi-agent + debate

LangGraph `StateGraph`. 4 teams: **Analysts → Researchers (bull/bear) → Trader → Risk team →
Portfolio Manager**. Every agent uses the **quick** model except the two **judges** (Research
Manager, Portfolio Manager) which use **deep**.

### Debate mechanics (adversarial verification)
Bull/bear are separate nodes ping-ponging via conditional edges, each reading the full transcript +
opponent's last turn, **explicitly told to rebut, not list data**. Termination at `2 *
max_debate_rounds` (default 1 → 2 turns). The **Research Manager** (deep) judges with a forced
5-tier rating and "**reserve Hold for genuinely balanced evidence**" (anti-fence-sitting). Risk =
3-way round-robin judged by the Portfolio Manager. **Debaters and judge are different agents with
different model tiers** — cheap adversarial pressure, expensive adjudication.

### Other reusable bits
- Shared `TypedDict` state extending `MessagesState`; nested sub-state per debate; **"Msg Clear"
  nodes** wipe tool-call scratchpad between agents so only distilled reports flow downstream.
- **Identity-pinning** — `resolve_instrument_identity` runs once and injects the canonical company
  into every prompt to stop chart-driven hallucination (issue #814).
- **Outcome-grounded reflection** — after a run, fetch realized alpha vs benchmark and have a
  Reflector write a terse 2-4 sentence lesson stored in an append-only log, re-injected for the
  same ticker. "Every word must earn its place." The model can't grade its own homework.
- **`get_verified_market_snapshot`** — a source-of-truth tool the analyst must defer to; flag
  conflicts rather than invent reconciliations.
- Config knobs: deep/quick tiers, debate rounds, news limits, `output_language` (keeps internal
  reasoning in English, localizes only output — relevant to your Arabic-only mandate, worth A/B).

### Top lessons
1. Split debaters (cheap) from judge (deep).
2. **Bull/bear debate as the Verifier**: Defender argues every claim is supported; Prosecutor hunts
   unsupported/hallucinated/misattributed; deep Adjudicator issues per-claim verdicts with a forced
   scale + "don't default to PASS".
3. Force a typed verdict with a forbidden fence-sit.
4. Outcome-grounded reflection (corrections/editor-edits as the ground truth, not self-assessment).
5. **Decompose Researcher into typed analysts** (Disclosure / Issuer-history / Market-reaction /
   Sector).
6. Identity-pinning (canonical Arabic issuer name injected everywhere).
7. Localize output only, reason in one language (A/B test for Arabic).
8. A source-of-truth verification tool the Verifier must defer to.
9. "Msg Clear" between stages — only distilled reports flow downstream.
10. Rounds/tiers as config (1 round routine, 3 rounds market-moving).

### Do NOT copy
The technical-indicator menu; the 3-way risk debate (collapse — you have no position to size);
Trader/position-sizing/price-target schemas; alpha/benchmark machinery; the investment rating
scale. Caution: default debate depth (1 round) is too shallow for real adversarial verification —
use ≥2.

---

## 9. gpt-researcher — production deep research

`gpt_researcher/skills/` single-agent + `multi_agents/` LangGraph.

### Core loop
`plan_research` → parallel `asyncio.gather` over sub-queries → per-query scrape + embed-filter →
concat → optional curation → write. **Seed-search-before-planning** (inject real snippets into the
sub-query planner). Agent self-selects a domain persona. Deep-research variant: breadth×depth
recursion (breadth halves each level).

### Curation & compression
- Always-on **embedding compression** (`RecursiveCharacterTextSplitter` 1000/100 + `EmbeddingsFilter`
  cosine threshold ~0.35) with a **fast-path bypass** when content < ~8000 chars (skip embeddings).
- Optional LLM curator (off by default): **inclusion-biased, forbidden to rewrite/summarize,
  biases toward quantitative sources**; fail-open (returns all on parse error — **don't copy**).
- Written-content dedup across sections (embed prior sections, surface overlaps, threshold 0.5).

### Report writing
Smart LLM, temp 0.35, streamed. Forces inline `([citation](url))` per sentence/paragraph + a
dedup'd reference list, "prioritize trusted/new sources". Intro/conclusion generated separately at
low temp. Subtopic prompt is heavily uniqueness-instructed.

### The multi-agent detailed-report flow (→ your Desk + Verifier)
Outer: `browser → planner → human(plan review, max 3) → researcher → writer → publisher`. Inner
per-section loop: `researcher → reviewer → (accept→END | revise→reviser→reviewer)`. **Accept = the
reviewer returns `None`.** Reviser writes `revision_notes` back to the reviewer (two-way handshake)
→ converges. Review only runs if `follow_guidelines` (free-text rules in `task.json`).

### Config
3-tier: FAST `gpt-4o-mini`, SMART `gpt-4.1` (writing/curation), STRATEGIC `o4-mini` (planning).
Pluggable retrievers (Tavily default). Per-call temps lower than global default for factual tasks.

### Top lessons
Seed-search-first; 3-tier model split; parallel sub-query fan-out; embedding compression w/
fast-path; inclusion-biased no-rewrite curator; written-content dedup; citation-density mandate
(LTR-isolate URLs in RTL via your `addBidiIsolation`); separate low-temp intro/conclusion (lede
last for news); **the reviewer↔reviser two-way loop = your Desk+Verifier editorial loop**;
guideline-driven review gated by a flag; provenance at the learning level; cheap structural
junk-filtering.

### STORM vs gpt-researcher (which to prefer)
- Researcher (gathering) → **gpt-researcher** (production parallel sub-query + compression +
  pluggable scrapers).
- Angle generation → neither's open-ended generation; **hardcode** financial perspectives.
- Outline → STORM's outline-as-artifact for analytical pieces.
- Desk/Verifier → **gpt-researcher's reviewer↔reviser loop**.
- Writer → gpt-researcher's context-only + citation-density, adapted to inverted-pyramid.

### Do NOT copy
`CURATE_SOURCES=False`/fail-open (you need **fail-closed**); reviewer that checks only guidelines
not facts (you need entailment); the "important to my career" prompt trick; disjoint intro/body
seams; string-concatenated context with no source boundaries; `"None" in response` substring
accept (use structured output); English-centric scraper heuristics; unbounded recursion for a
single-disclosure seed.

---

## 10. Hermes + self-evolution — self-improving loop

### The learning loop (hermes-agent)
A **skill** = `~/.hermes/skills/<name>/SKILL.md` (YAML frontmatter + structured body: trigger
conditions → numbered steps with exact commands → pitfalls → verification). Progressive disclosure:
only `name`+`description` always visible; body loaded on demand. One tool `skill_manage` (create/
patch/edit/delete). **Trigger logic is the tool description prose** ("Create when complex task
succeeded 5+ calls; patch immediately when a skill failed to cover a case"). A `.usage.json`
sidecar + curator transitions skills `active → stale → archived`.

### Memory (no vector DB)
`MEMORY.md` + `USER.md` injected once at session start (**frozen snapshot** preserves the prefix
cache; refreshes next session). Conversation recall = **SQLite FTS5** (zero LLM cost), deduped by
session lineage.

### DSPy + GEPA self-evolution (the highest-value part)
Only Phase 1 (skill evolution) is implemented; Phases 2-5 are stubs (PLAN.md is a design doc). A
`SKILL.md` body is wrapped as a `dspy.Module` (`SkillModule`, the body is the optimizable param).
Loop: load skill → build eval dataset (synthetic / golden / **sessiondb-mined**, 50/25/25 split) →
`dspy.GEPA(metric=skill_fitness_metric).compile(...)` (fallback `MIPROv2`) → re-validate constraints
(size ≤15 KB, **≤20% growth gate**) → **holdout eval baseline vs evolved** → promote only if
`improvement > 0` AND constraints pass → write candidate + `metrics.json`, **PR for human review,
never auto-commit**.

- **Two metric layers, with a real gap:** the *wired* `skill_fitness_metric` is cheap keyword
  overlap returning a bare float — **under-feeds GEPA** (GEPA wants textual feedback). The richer
  `LLMJudge` (correctness/procedure/conciseness + `feedback` string + length penalty) is what GEPA
  *should* use. **Benchmarks are GATES, not fitness** ("a variant that improves quality 20% but
  drops a benchmark 5% is REJECTED").
- Models: `optimizer_model=gpt-4.1`, `eval/judge` cheaper. ~$2-10/run, no GPU.

### Telegram/messaging gateway
~25 platform adapters subclass `BasePlatformAdapter` (`connect/disconnect/send`), normalizing
inbound to one `MessageEvent`. **HITL primitives:** `send_slash_confirm(... confirm_id ...)`
renders inline **Approve Once / Always / Cancel** buttons; callback routed back via
`_resolve_slash_confirm(confirm_id, choice)`; text fallback for button-less platforms.
`send_clarify` for multiple-choice or next-message capture. **The pattern: a stable short
`confirm_id` in callback_data, resolved server-side, graceful text fallback.**

### Top lessons
1. Each per-category drafting template = a **versioned Supabase "skill" row** (SKILL.md structure)
   loaded by the n8n drafting node.
2. Mine the editor approve/reject/**edit-diff** log like Hermes mines session history — the diff is
   the highest-signal data Hermes never had.
3. Build fitness from the editor decision (approved-clean 1.0 / minor-edit 0.6 / rejected 0.0 +
   edit-distance penalty), not an LLM guess.
4. **Use GEPA properly — return textual feedback** (the edit/rejection reason), not a float.
5. Two evolvable targets: classifier prompt + per-category drafting prompt, each a `SkillModule`.
6. Promotion = human-gated version bump, never hot-swap.
7. Gate every candidate (size, ≤20% growth, holdout replay of past decisions).
8. Editor decisions feed the eval set forever (weekly n8n cron, re-run GEPA on high-reject
   categories).
9. Telegram gateway around `send_slash_confirm` 3-button + callback_id; `mark_awaiting_text` for
   edits.
10. Per-category "curator" sidecar (uses/accept-rate/last-rejected-reason) drives auto-triage.

### Do NOT copy
`USER.md`/personal user-modeling (model the *style guide* instead); agent self-authoring skills
live mid-task (keep evolution offline, gated); the keyword-overlap metric; synthetic datasets as
primary (anchor on the real editor corpus); the 25-adapter sprawl; Phases 2-5 as if they exist
(stubs).

---

## 11. FIRE / FailSafe — claim fact-checking (the Verifier core)

**FIRE** is tiny and surgical — its whole algorithm is `eval/fire/verify_atomic_claim.py` (275
lines). It does NOT decompose (assumes atomic claims). **FailSafe** is a heavyweight multi-stage
pipeline that does the full decompose→retrieve→verify→report.

### FIRE's iterative verify loop
```
for _ in range(max_steps=5):
    decision = final_answer_or_next_search(claim, knowledge)  # ONE call decides BOTH
    if FinalAnswer: return                                    # confident → done
    if GoogleSearchResult: knowledge.append(...)              # need evidence → loop
# fell through → must_get_final_answer(...) forces a verdict
```
The innovation: a **single LLM call decides "do I know enough?" AND "what's the next query?"**.
First iteration `KNOWLEDGE="N/A"` → can answer from parametric knowledge with **zero retrieval** if
confident (the cost win, but a **liability for finance**). Stopping: emit `final_answer`;
`max_steps`; **redundancy early-stop** (SBERT cosine > 0.9 vs recent queries); forced terminal
verdict. **Label set is binary True/False — no NEI, no numeric confidence** (its biggest gap).

### FailSafe (the architectural opposite)
Decompose with **coreference resolution** + dedup (cosine 0.85) + **checkworthiness filter** before
retrieval spend; **Structured Argumentation Graph** (claims + supports/attacks edges); HybridRetriever
(ChromaDB then Serper) with **per-evidence `trust_level`**; **AI Council** of 3 adversarial personas
(Logician/Researcher/Skeptic) → majority vote → **`factuality = support/(support+refute)` ratio** →
bucketed (≥0.75 supported, ≤0.25 refuted, else controversial); KB cache of prior verdicts.

### Top lessons for IKTISSAD's Verifier (you HAVE a canonical source — inverts the design)
1. Steal FIRE's fused decide-or-retrieve call, but **invert priority**: disclosure checked first
   and authoritatively; never answer numeric claims from parametric knowledge.
2. **Don't use binary True/False — add an explicit MISSING/NEI label** mapped to ClaimCard's
   `missing_evidence`; a financial claim with no source backing must not render as True.
3. **Compute confidence mechanically** (FailSafe ratio weighted by source authority), not LLM
   self-report; bucket ≥0.75 publish / 0.25-0.75 human-review / ≤0.25 block.
4. Per-evidence `trust_level`, disclosure = tier-1.
5. **Type claims (numbers/names/dates)**; verify numbers by **exact/tolerance match against the
   disclosure**, not LLM judgment.
6. Keep FIRE's redundancy early-stop + low `max_steps` (2-3 — canonical source resolves fast).
7. Multi-agent council **only for contested claims** (FailSafe robustness at FIRE cost).
8. Coreference + dedup pre-steps (resolve "الشركة"/pronouns so each claim is self-contained).
9. Persist full evidence trace + reasoning into the ClaimCard.
10. **MISSING ≠ CONTRADICTED** — "draft asserts 12% but disclosure is silent" is a hard
    publish-blocker.

### Do NOT copy
FIRE's binary labels; its parametric-first fast path; its lack of numeric confidence; trusting an
LLM to compare numbers; FailSafe's pseudoscience-tuned personas; `IRRELEVANT`-as-catch-all (split
into IRRELEVANT vs MISSING); FailSafe's stylometry/clickbait screening (you author the draft);
FIRE's hard unconditional CUDA call.

---

## 12. n8n + agent template libraries — concrete wiring

### Relevant n8n templates (top wiring)
- **HITL approval gate** (`AI-powered email ... approval (Yes_No)`): an approval node emits a
  resumable `$json.data.approved` boolean read by a downstream IF (true→send, false→stop). The
  email equivalent of your Telegram approve/reject tap.
- **Inline-button callback routing** (`NeurochainAI Telegram`): buttons built in a Code node, posted
  via `reply_markup`; taps return through the same Telegram Trigger as `callback_query`; a **Switch**
  fans out on callback data. Same pattern as your Responder.
- **Two-layer dedup** (`Deduplicate Scraping AI Grants`): query-side `dateRange:"1"` (24h window) +
  `removeDuplicates` in `removeItemsSeenInPreviousExecutions` mode keyed on a stable `id` (n8n
  persists seen-keys across runs — cheaper than a SELECT-to-check).
- **News scrape without RSS**: HTML CSS-extract listing → Code date-filter → per-item HTTP → parallel
  summary/keywords → Merge → DB.
- **Structured extraction from a listing**: `chainLlm` + `outputParserStructured` (typed JSON) →
  table — the reliable typed-output recipe.
- **Supabase CRUD**: plain `n8n-nodes-base.supabase` insert/upsert/retrieve.

### awesome-llm-apps examples
- **AI Journalist Agent** — Searcher→Writer→Editor (Editor as coordinator with NYT-editor
  instructions) — maps 1:1 to fetch→draft→polish.
- **Beifong** (News & Podcast) — pluggable **processor-per-source** + scheduler + SQLite — the
  cleanest source-abstraction model (one processor per GCC exchange).
- **Multi-Agent Researcher**, **AI Investment Agent**, **KG-RAG with Citations** — orchestrator
  emitting multiple formats; finance-tool report shape; per-claim citation grounding.

### Agentic patterns (most relevant)
HITL Approval Framework (+ audit trail); Reflection Loop; Structured Output Specification; **Output
Verification Loop** (extract claims → check vs evidence → per-claim trust before acting);
Hybrid LLM/Code Coordinator (deterministic nodes for dedup/DB, LLM for drafting); Signal-Driven
Activation; **Plan-Then-Execute / Dual-LLM** (untrusted ingested text must not control publish —
prompt-injection defense); **LLM Map-Reduce** (draft each disclosure in isolation); Spectrum of
Control (auto-publish routine, gate market-movers).

### Gaps you must build custom
Telegram 4096-char chunking; RTL/Arabic handling; GCC-exchange parsers; edit-in-Telegram flow;
idempotent-publish state machine; per-disclosure autonomy tiering; AI-Gateway cost/audit governance.

---

## 13. CAMeL Tools — Arabic NLP

NYU Abu Dhabi, MIT license, Python ≥3.11, depends on torch + transformers.

### Normalization (pure regex, no model — port to TS)
`utils/normalize.py`: `normalize_unicode` (NFKC + ﷼/﷽ fixes), `normalize_alef_ar` (أإآٱ → ا),
`normalize_alef_maksura_ar` (ى → ي), `normalize_teh_marbuta_ar` (ة → ه), `dediac_ar` (strips the 8
harakat + shadda + superscript alef). **Does not remove tatweel (U+0640) — do it yourself.** **No
Arabic-Indic→Western digit fold — do it yourself** (you already enforce Western numerals).

Ready dedup recipe (TS, no Python service):
```ts
function normalizeTitleForDedup(s: string): string {
  return s.normalize('NFKC')
    .replace(/[ً-ْٰ]/g, '')   // dediac
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')                  // tatweel
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))  // digit fold
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
```

### NER (`ner/__init__.py`)
Fine-tuned **AraBERT** `BertForTokenClassification`; entities `LOC/ORG/PERS/MISC` (BIO). **Input
must be pre-tokenized** (`simple_word_tokenize` first); `predict_sentence(words) → BIO tags`. CPU
fine; `max_seq_length=256` with auto-chunking. **`ORG` = issuer**, **`PERS` = executives**.
Latin-script names slip past (Arabic model).

### Morphology / deployability
`MLEDisambiguator` + `MorphologicalTokenizer` (clitic splitting `والشركة → و/ال/شركة`) for a lexical
search index — but heavy (loads `calima-msa-r13`). For embeddings, feed dediac+alef-normalized text
to an Arabic encoder instead. **NER/morphology = a separate Python microservice (FastAPI, model
loaded once); never in a Vercel/serverless function.** Pure normalization functions can live
in-process.

### Top lessons
Dedup needs char-folding not just dediac; run normalization with no model dependency (TS port);
fold Arabic-Indic digits (don't delete); strip tatweel; NER input pre-tokenized; ORG→issuer-linking,
PERS→event-memory; normalize before entity matching; NER/morphology as a microservice; morphological
tokenization only for lexical search; Latin names slip past NER (Verifier cross-checks issuer
resolution).

Entity plan: FastAPI `/ner` service → after ingest, tokenize → predict → stitch ORG/PERS spans →
normalize → match against an `issuers` table (`normalized_name` + aliases + ticker), miss → human
review → persist `issuer_id` + a normalized event signature for the persisted event-memory.

### Do NOT use
`turjuman`/MT (Arabic-only, no translation); `dialectid` (MSA, not dialect); `sentiment` (LLM does
it better); `disambig.bert` (overkill vs MLE); the Buckwalter `*_bw` variants; loading torch in any
serverless function; the `arabic-text-normalizer` package's `stripHamza`/digit-deletion behavior.

---

## 14. Live markets widget — lightweight-charts + Supabase

`lightweight-charts` **v5.2.0** (v5 changed the series API; the React wrapper still uses v4).

### Core API
`createChart(container, opts) → IChartApi`. **v5: `chart.addSeries(AreaSeries, opts)`** (not v4's
`addAreaSeries`). Six series types. **Real-time = `series.update(point)`** (infers append-vs-mutate
from `time`); **never `setData()` for ticks** (replaces all data). `createSeriesMarkers` (v5 plugin),
`createPriceLine` for "previous close". `autoSize:true` installs an internal ResizeObserver.

### RTL & Western numerals (key for IKTISSAD)
No native RTL in the canvas — handle in DOM, move price axis to `'left'`. Western numerals come free:
```js
const arWestern = 'ar-SA-u-nu-latn';
localization: {
  locale: arWestern,
  priceFormatter: p => new Intl.NumberFormat(arWestern, {maximumFractionDigits:2}).format(p),
},
timeScale: { tickMarkFormatter: t => new Intl.DateTimeFormat(arWestern, {day:'numeric',month:'short'}).format(new Date(t*1000)) }
```
Per-series precision via `priceFormat:{type:'price',precision:2,minMove:0.01}`.

### React 19 / Next 16
Canvas is client-only → `'use client'` + `next/dynamic ssr:false`; create chart in `useEffect`, keep
`seriesRef`, call `.update()` on each Realtime event. **The React wrapper targets v4 and lacks an
`.update()` path (always `setData`) — hand-roll a ~40-line v5 component instead.**

### Real-time pipeline (finnhub repo lesson)
The reusable idea: **decouple raw stream from periodic rollups**. For a news widget you only need
the rollup half: **scheduled UPSERT → Supabase Realtime (`postgres_changes`) → `series.update()`**.
Skip Kafka/Spark/Cassandra.

### Recommended architecture
`Tadawul/Mubasher source → n8n/Edge Function (every 30-60s): normalize + compute rollups → UPSERT
into Supabase → Realtime channel → Next client → lightweight-charts`. Schema:
`market_summaries(symbol PK, name_ar, name_en, exchange, last_value, change_abs, change_pct,
prev_close, currency, updated_at)`, `market_sparklines(symbol, ts, value)`, `market_movers(exchange,
kind, rank, symbol, name_ar, change_pct, last_value)`. Public-read RLS; service-role writes; add the
summaries table to `supabase_realtime`. Mirror the server-wrapper + PageClient pattern.

### What NOT to over-build for v1
No Kafka/Spark/Cassandra/Avro; no sub-second refresh (30-60s rollups); no candlesticks initially
(AreaSeries sparkline + %-badge); no crosshair/drawing/indicators; lazy-mount off-screen sparklines.
**Caveat:** the unsolved dependency is reliable normalized GCC data — the same Akamai sourcing
problem (§11). Wire sourcing to populate `market_summaries` first.

---

## 15. Langfuse — observability, cost, prompts, evals

Open-source LLM engineering platform; OpenTelemetry-based.

### Data model
**Trace** (one operation; carries `user_id, session_id, tags, metadata`) → **Observation** (nestable;
types `span`, `generation` [carries token usage + cost], `event`) → **Session** (groups traces) →
**Scores** (numeric/categorical/boolean evals). Non-blocking ingestion — short-lived processes must
`flush()`.

**Map your pipeline:** one article = a **session** (`session_id=article_id`) containing a trace;
each agent = a nested **span**; each Vercel-AI-Gateway call = a **generation**. Free per-article,
per-agent, per-model cost rollups.

### Cost tracking (+ custom gateway)
Usage on `generation.usage_details` + `cost_details`. Ingested cost wins over inferred. **Custom
model definitions** (regex match on the gateway's `provider/model` strings + price-per-unit) make
inference work for the Vercel AI Gateway. OpenAI-style usage auto-maps. Reasoning models: must
ingest tokens (the gateway returns them).

### Prompt management
Versioned prompts (text/chat) + movable **labels** (`production`/`latest`/custom). Code references a
*label* → instant deploy/rollback, no code change. SDK client-side cached (no latency/availability
risk). **Link prompt version → traces** → the prompt's Metrics tab shows per-version median cost +
**median score** — exactly the GEPA promotion signal. Official n8n community node fetches prompts by
label.

### Evals
Scores from human/code/LLM-judge. `run_experiment(name, data, task, evaluators)` over a versioned
dataset → comparable runs; CI/CD experiments gate deploys on regression. Your keyword harness
becomes a registered code evaluator; add an LLM-judge for Arabic fluency/factuality.

### Integration for the Vercel AI Gateway
Gateway speaks OpenAI schema → use the **Langfuse OpenAI wrapper** (`from langfuse.openai import
openai`, `base_url="https://ai-gateway.vercel.sh/v1"`) → auto-logs generations with tokens+cost.
Or `@observe()` spans, OTel endpoint, or REST `POST /api/public/ingestion`. **n8n has no native
tracing** — push via HTTP Request node to the ingestion/OTLP endpoint, or use community
`n8n-langfuse-shipper`.

### Self-host vs cloud (the 1.9 GB box)
Self-host needs Web + Worker (2 Node apps, 1.7 GiB heap each) + Postgres + **ClickHouse** + Redis +
S3/MinIO — official min **4 GB / 4 cores**, recommends 16 GiB. **Not feasible on 1.9 GB.** **Cloud
Hobby = free**, 50k units/mo (~5,500 articles), full feature set (prompts, judge, experiments).

### Recommendation
**Langfuse Cloud Hobby (free).** Closes all four ops gaps in one tool, zero infra on your box.
Instrument the Gateway with the OpenAI wrapper, push the 6-agent pipeline as nested spans from n8n
HTTP nodes, move per-category drafting templates into versioned prompts linked to traces, drive the
GEPA loop with prompt-version metrics + dataset experiments. Alternatives if cloud is barred:
**Helicone** as a proxy (cost+logging only). Revisit self-host only on a ≥8 GB box.

---

## 16. Decisions resolved by the research

| Decision | Verdict | Evidence |
|---|---|---|
| **Origin egress (Akamai)** | **#1 managed browser w/ Saudi geo** (Browserbase `geolocation.country:"SA"`, ~$39-99/mo); **#2 self-host Patchright + SA residential proxy** (~$10-30/mo). Mint `_abck` by navigating, then `fetch()` JSON inside the browser context. | Only **3 of 23** engines beat Akamai (Patchright 100%, CloakBrowser 90%); enterprise bypass 20-40% → 70-85% with residential IP; datacenter ASN ban is unfixable by fingerprinting (§11) |
| **Tadawul reachability** | **Browser automation is the only proven path** (you already run Playwright/n8n). No public repo hits the announcements JSON API; site is a WebSphere portal. Yahoo `.SR` = price fallback; keep Mubasher as the always-on floor, tag provenance. | 4 Tadawul repos, zero hit the API (§12) |
| **Primary writing model** | `gpt-5.4-pro`-class on the Writer only; reason in one language, localize output (A/B); cheap model for research/synthesis. | STORM/gptr/TradingAgents multi-model split (§6, §8, §9) |
| **Images** | **Skip generative for v1.** A wrong generated chart is a credibility landmine. Deterministic branded card only, if any. | newsflow/openclaw spend zero on images, all on text trust (§3, §5) |
| **Observability** | **Langfuse Cloud free tier**, OpenAI-wrapper on the Gateway. | self-host needs 4 GB; box has 1.9 (§15) |
| **Live widget** | Feasible: lightweight-charts v5 + Supabase Realtime + scheduled UPSERT. **Gated on the same egress problem.** | §14 |
| **Enable schedule** | Not until idempotency (UNIQUE natural key) lands. | §4 |
| **2 GB swap** | Yes — but Langfuse-cloud avoids the biggest RAM consumer you'd otherwise add. | §15 |

### The keystone insight
Clean egress unlocks **two** pillars at once — disclosure sourcing **and** the live-markets widget
both sit behind the same Akamai/WebSphere wall, and the proven solution (a real browser through a
Saudi residential IP) is something you **already operate**. The highest-leverage single build is
**one hardened Tadawul browser-fetch adapter** (EDGAR hexagonal pattern) feeding both the newsroom
and the widget.

---

*Companion document: `gcc-markets-newsroom-plan-v4.md`. Predecessors: v3 (working source of truth
at time of research), v2 (legal/sourcing rationale), `_audit-appendix.md`.*
