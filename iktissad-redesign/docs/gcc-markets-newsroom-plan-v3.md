---
title: "GCC Markets Autonomous Newsroom — Build Plan v3"
subtitle: "IKTISSAD · Arabic-only · n8n-orchestrated · origin-sourced · complete-CMS output via a deep agent pipeline"
date: "June 2026"
supersedes: "gcc-markets-newsroom-plan-v2.md"
---

# GCC Markets Autonomous Newsroom — Build Plan **v3**

> An agentic editorial system that ingests **officially-sourced** disclosures from the 7
> GCC exchanges, screens them with a human via Telegram (tokens spent only on chosen
> items), drafts **complete, SEO- and EEAT-ready Arabic articles** with a deep multi-agent
> pipeline, and publishes them into the existing IKTISSAD CMS — filling **every** article
> field (headline, deck, body, images, summary/TL;DR, tags, SEO meta, structured data).

Status: **PARTIALLY LIVE.** A working vertical slice runs in production on n8n today; this
doc records that state and the next-generation expansion. Start here.

---

## 0. Status at a glance — what is LIVE today (June 2026)

The project moved from "planned custom code (v2)" to a **working n8n implementation** on the
user's self-hosted box. The current end-to-end loop:

**disclosures (7 GCC, via Mubasher) → Telegram screening cards → tap ✍️ → category-aware
Arabic draft → ✅نشر / ✏️تعديل / ❌رفض → publish into `articles`.** Dedup is live.

This is a real MVP slice. The rest of this doc is the plan to make it the full product.

### Live infrastructure
- **n8n:** `https://automation.iktissad.net` (AWS Lightsail, ubuntu@63.178.141.24; SSH key
  `~/Downloads/LightsailDefaultKey-eu-central-1 (2).pem`, chmod 600). ⚠️ 1.9 GB RAM, **no
  swap** — add 2 GB swap (pending).
- **n8n-mcp** wired into this Claude Code project (manage workflows via MCP). API key valid.
  Credential *listing* via API is blocked (GET not allowed); create works.
- **Vercel AI Gateway** — one key, 283 models (OpenAI gpt-5.x, Anthropic, Gemini, image
  models). n8n cred `Vercel AI Gateway` (httpHeaderAuth, id `X481PUJl6rh0AKU9`). Endpoint
  `https://ai-gateway.vercel.sh/v1/chat/completions`, OpenAI-compatible.
- **Telegram** bot @Iktissad_bot. n8n cred `Iktissad Telegram Bot` (telegramApi, id
  `HdnrRkQus7s5btkX`). Editor chat id `8441765055`.
- **Supabase** (existing CMS DB, project `vqdxinosmzezjveliemb`). n8n cred `Iktissad Supabase`
  (supabaseApi, id `Y59XOCnYKY22pbuc`).

### Live workflows
- **Selector** `i1PdqFuqOhhR1mbS` (ACTIVE): triggers → Seen IDs (Supabase getAll, dedup
  source) → Markets(6 GCC) → Fetch List (Mubasher) → Parse+Classify (rule-based by title;
  per-item exchange label via 400-char pre-window; categories: halt/leadership/earnings/
  dividend/legal/deal/capital; auto-skips AGM/board-meeting/admin noise) → Filter New (drop
  already-seen) → Send Screening (Telegram inline `d~cat~id`/`s~id` buttons) + Mark Seen
  (insert into gcc_pending_drafts). Schedule node present but DISABLED. VERIFIED: run1 sent 9
  across 5 markets, run2 sent 0 (dedup).
- **Responder** `IONLS3z9tlgNmH4A` (ACTIVE, owns bot callback webhook): Telegram Trigger
  (callback_query+message) → Route → Switch(6): d=draft (fetch /news/<id> → extract → compose
  category-aware prompt → AI draft → send with نشر/تعديل/رفض), s=skip, p=publish (parse the
  article from the message → insert into `articles` status=published, no social since DB-direct),
  x=reject, e=edit (force-reply prompt #edit:<id>), editcap=re-send edited. STATELESS.
- Retired: `OrmstOjpGvFlVY9W` (old single-source pipeline, inactive).

### Live tables
- `gcc_pending_drafts` (mubasher_id PK, source_title, headline, body, url, source, status,
  market, category, article_id, created_at…) — dedup + draft store.
- Migration `20260604_044_gcc_newsroom.sql` (full v2 data model) WRITTEN but **NOT applied**.

---

## 1. What changed from v2 → v3 (decisions locked)

| Area | v2 | **v3** | Why |
|---|---|---|---|
| Orchestration | Inngest + custom code | **n8n** (self-hosted) | Visual, HITL-native, already live |
| Editorial review | in-CMS review queue | **Telegram screen-first** | Lighter; **tokens spent only on items the editor picks** |
| Language | Arabic + English | **Arabic only** | Product decision — no EN edition, no Translator agent, `*_en` fields stay empty |
| Drafting | single Writer pass | **deep 6-agent pipeline** producing a COMPLETE article | "complete draft, not a paragraph" |
| Output | article body | **every CMS field** (headline, deck, body, summary/TL;DR, tags, SEO meta, images, structured data, EEAT byline) | publish-ready |
| Models | Claude-default | **model-agnostic, OpenAI-first** via Vercel Gateway; benchmark per task | use what tests best |
| Data source | license the 4 / scrape | **ORIGIN exchange APIs first** (via clean egress), Mubasher = fallback | authority + EEAT + full structured data + numbers + PDF |

Unchanged v2 principles still hold: **human-in-the-loop, no auto-publish of financial claims,
deterministic where it concerns facts, grounded/attributable/correctable, quality over volume.**

---

## 2. Data sourcing v3 — ORIGIN first

**Decision:** fetch from each exchange's **official source**, not a mirror. Origin gives the
authoritative, citable primary source (critical for EEAT), the full structured disclosure
(`بند/توضيح`), exact numbers, the official PDF, and the native announcement ID (best dedup key).

**The blocker & the fix:** the n8n server's datacenter IP is **Akamai-banned domain-wide by
`saudiexchange.sa`** (proven 403). Tadawul's *own* JSON API is far richer than Mubasher
(`getAnnouncementListData` + structured detail by `anId`, category `1_23`=board/exec). To reach
it from the server we need a **clean egress**: a residential/Saudi proxy, or a managed browser
(Browserbase/Scrapfly). One small paid dependency (~low-tens $/mo). → **OPEN DECISION #1.**

| Exchange | Origin source | Notes |
|---|---|---|
| Tadawul (SA) | official JSON API (`getAnnouncementListData`, detail by `anId`, `1_23`) | Akamai → needs clean egress |
| ADX / DFM (UAE) | exchange disclosure feeds / Dubai Pulse (DFM market data) | per-exchange adapters |
| QSE, Boursa Kuwait, Bahrain Bourse, MSX | official disclosure feeds / APIs | per-exchange adapters |
| **Fallback (all 7)** | **Mubasher** `/news/{sa,ae,qa,bh,kw,om}/now/announcements` | currently primary; demote to fallback. Per-item exchange tag available in HTML. |

Posture: official/primary source, summarize + attribute + link to the origin disclosure, add
analysis. No circumvention beyond reaching a public page via a clean IP.

---

## 3. Output contract — the COMPLETE CMS article (Arabic only)

The `articles` table requires only `slug`+`title`; the pipeline fills the full set:

- **Headline & framing:** `title`, `deck` (standfirst/عنوان فرعي)
- **Body:** `content` (rich HTML, multi-section) + `body` (TipTap jsonb), including:
  - inverted-pyramid lede
  - **TL;DR box** (ملخص سريع)
  - **key takeaways / giveaways** (أبرز النقاط — bulleted)
  - context section + **"ماذا بعد / ما يجب مراقبته"**
  - inline **attribution + link to the origin disclosure**
  - optional **FAQ block** (AEO)
- **Summaries:** `excerpt`, `summary` (the TL;DR text)
- **SEO:** `meta_title`, `meta_description`, `slug`, `tags[]`, `canonical_url`, `og_image`,
  + **NewsArticle JSON-LD** (author, publisher, datePublished/Modified)
- **Images:** `featured_image` (+ focal x/y), `og_image` — **generated** branded card or a
  data chart (imagen-4 / gemini-image) → uploaded to Supabase Storage
- **Routing:** `section_id`, `sector_id`, `country_id` (resolved from taxonomy), `article_type`
  (news/analysis), `is_breaking`, optional `accent_color`
- **EEAT:** named **markets-desk author byline** + visible **«مُعدّ بمساعدة الذكاء الاصطناعي،
  راجعه [المحرر]»** disclosure; clear dates; publisher org; citation to primary source
- `*_en` fields: left empty (Arabic only)

---

## 4. The deep agent pipeline (6 agents, Arabic-native)

Runs inside the Responder's draft branch when the editor taps **✍️** on a screened item:

```
1. Desk/Editor   → angle, depth, breaking?, routing (section/sector/country),
                   what context to gather                        [reasoning model]
2. Researcher    → pull ORIGIN disclosure + PDF; company history (our CMS);
                   prior coverage; sector/macro context; peer comparison
                   (tool-using)                                  [strong model + tools]
3. Writer        → full article: lede, sections, key takeaways, TL;DR,
                   what-to-watch, attribution                    [top writing model]
4. SEO/Metadata  → title/deck/meta/slug/tags/og/JSON-LD/EEAT byline
                                                                 [strong model]
5. Verifier      → numbers/names/dates vs source; deterministic diff where
                   possible; flag unsupported claims/causation   [reasoning model + code]
6. Visuals       → branded featured card or data chart → upload  [image model]
   Assembler     → assemble complete CMS object → present for review → on نشر, insert
                   ALL fields into `articles`
```

(No Translator — Arabic only.) The editor still taps once; the pipeline does the depth.

---

## 5. Models (via Vercel AI Gateway — one key, 283 models)

Model-agnostic, **OpenAI-first**, benchmarked per role. Starting assignments:

| Role | Default | Alternatives to benchmark |
|---|---|---|
| Desk / Verifier (reasoning) | `openai/gpt-5.1-thinking` | `gpt-5.4-pro`, `claude-opus-4.8`, `gemini-3.1-pro` |
| Researcher (tools) | `openai/gpt-5.4` | `claude-opus-4.8` |
| Writer (Arabic prose) | `openai/gpt-5.4-pro` | `claude-opus-4.8`, `gemini-3.1-pro` |
| SEO/Metadata | `openai/gpt-5.4` | `gpt-5.4-mini` |
| Classify (cheap, selector) | `openai/gpt-5.4-nano` / rule-based | `gemini-flash` |
| Images | `google/imagen-4.0` | `gemini-3-pro-image`, `grok-imagine-image` |

→ **OPEN DECISIONS #2 (primary writing model)** and **#3 (image model / charts / skip)**.

---

## 6. Classifier & routing (selector)

Rule-based on title (cheap), per-item exchange label. Categories and routing policy:

| Category (Arabic cue) | Route |
|---|---|
| halt تعليق التداول ⚡ | auto-draft (breaking) [future] |
| leadership استقالة/تعيين/الرئيس التنفيذي/مجلس | **screen** |
| earnings النتائج المالية | **screen** |
| dividend توزيع أرباح | **screen** |
| legal قضية/تعويض/غرامة | **screen** |
| deal استحواذ/اتفاقية/ترسية | **screen** |
| capital رأس المال/حقوق أولوية | **screen** |
| AGM/EGM دعوة الجمعية, board meeting اجتماع مجلس, admin (name change/fractions/إلحاقي) | **auto-skip (noise)** |

Tune from editor screen/skip feedback. (Future: an LLM classifier for ambiguous titles.)

---

## 7. Gap analysis — built vs v2 plan

✅ done · ⚠️ partial · ❌ missing · ➖ intentionally changed

**A Foundations:** A1 data model ⚠️ (migration written, not applied; only `gcc_pending_drafts`
live) · A2 entity graph/company seed ❌ · A3 Gateway ✅, dedup ✅, cost ledger ❌, Inngest ➖→n8n
**B Sources:** Kuwait/MSX/DFM ✅ via Mubasher (origin ❌ pending) · PDF/OCR ➖ n/a · entity
resolution ❌ · classification ✅ · dedup ✅ · validation engine ❌
**C Newsroom:** macro feed ❌ · News Desk ➖ (human screening) · Reporter/dossier ❌ ·
Writer ✅ (shallow) · Verifier ❌ · Translator ➖ (Arabic-only) · specialized desks ⚠️ ·
promotion to articles ✅
**D Surfaces:** review queue ➖ (Telegram) · source-health/story-board/entity-admin ❌ ·
**live markets widget ❌ (flagship!)** · charts ❌ · newsletter block ❌ · social ❌
**E Licensed exchanges:** ➖ sidestepped (Mubasher); origin egress pending
**F Resilience/quality:** DLQ/backpressure/token-breaker ❌ · trading-calendar scheduling ❌
(simple schedule disabled) · corrections subsystem ❌ · compliance lint ❌ · observability/
alerting ❌ · testing harness (golden articles/verifier red-team/calibration) ❌ · scraper-doctor ❌
**§9 editorial ops:** byline+AI-disclosure ❌ · provenance panel ❌ · quote/compliance guardrails ❌
· feedback/edit-distance loop ❌

**Biggest missing pillars:** (1) **Market-DATA stream + live markets widget** (Stream A — zero
built); (2) **deep pipeline** (Researcher + Verifier + complete-CMS output + images); (3) **origin
sourcing**; (4) corrections/compliance/EEAT trust layer; (5) observability + resilience;
(6) testing harness.

---

## 8. Build roadmap (from a clean start)

**Phase 1 — Origin + complete-article pipeline (highest value)**
1. Origin egress (proxy/browser) → Tadawul authoritative API adapter; Mubasher → fallback.
2. Rebuild the draft branch as the **6-agent pipeline** (Desk→Researcher→Writer→SEO→Verifier→
   Assembler) producing the **complete CMS object** (all fields, TL;DR, takeaways, EEAT byline).
3. Publish fills every field; NewsArticle JSON-LD.

**Phase 2 — Visuals + taxonomy routing**
4. Image agent (imagen-4 branded card / chart) → Supabase Storage → `featured_image`/`og_image`.
5. Resolve `section_id`/`sector_id`/`country_id` from taxonomy; tags.

**Phase 3 — Market-DATA stream + live widget (flagship)**
6. Apply migration 044; ingest market_summaries/sector_indices (Dubai Pulse + licensed/origin).
7. Validation engine (deterministic numeric checks). 8. Live `/markets` Arabic widget + charts.

**Phase 4 — Trust, resilience, ops**
9. Corrections subsystem + compliance lint + provenance. 10. Observability (cost ledger,
alerts) + DLQ/backpressure + trading-calendar scheduling (enable schedule). 11. Testing
harness (golden articles, verifier red-team, confidence calibration).

**Phase 5 — Distribution**
12. Newsletter block · social (with correction kill-switch). 13. Entity resolution + company
universe seed (better dedup/linking). 14. Add other GCC origins (ADX/DFM/QSE/Kuwait/Bahrain/MSX).

Cross-cutting now: **add 2 GB swap** to the box.

---

## 9. Open decisions (confirm to start Phase 1)
1. **Origin egress** — residential/Saudi proxy vs managed browser (Browserbase/Scrapfly) vs
   research-cheapest-first. (Mubasher stays as fallback either way.)
2. **Primary writing model** — `openai/gpt-5.4-pro`? (Desk/Verifier `gpt-5.1-thinking`.)
3. **Images** — generate branded card (imagen-4) vs data chart vs skip for v1.
4. Enable the selector **schedule** (auto-screening) now that dedup works?
5. Add **2 GB swap** to the box?

---

## 10. Reference — IDs & endpoints
- Selector wf `i1PdqFuqOhhR1mbS` · Responder wf `IONLS3z9tlgNmH4A` · old `OrmstOjpGvFlVY9W` (off)
- Creds: Gateway `X481PUJl6rh0AKU9` · Telegram `HdnrRkQus7s5btkX` · Supabase `Y59XOCnYKY22pbuc`
- Telegram editor chat `8441765055` · bot @Iktissad_bot
- Mubasher list `https://www.mubasher.info/news/{cc}/now/announcements`; detail `/news/<id>`
- Gateway `https://ai-gateway.vercel.sh/v1/chat/completions` (+ `/v1/models`)
- CMS `articles` requires `slug`+`title`; status enum article_status; `body` jsonb TipTap
- Telegram gotchas: callback_data (not Send&Wait/URL buttons); trigger node space-free + set
  webhookId; editMessageText hardcode chatId + `.first()` refs; guard non-callback updates.
- Predecessors: `gcc-markets-newsroom-plan-v2.md` (full rationale, legal audit), `_audit-appendix.md`.

---

*v3 is the working source of truth. v2 retains the deeper legal/sourcing rationale. Regenerate
the .docx from this file if a Word copy is needed.*
