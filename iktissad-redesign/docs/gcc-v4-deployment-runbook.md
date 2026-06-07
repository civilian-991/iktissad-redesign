---
title: "GCC Markets Newsroom v4 — Deployment Runbook"
subtitle: "Exact, ordered steps to take the v4 build live"
date: "June 2026"
companion: "gcc-markets-newsroom-plan-v4.md"
audience: "operator (you)"
---

# GCC Markets Newsroom v4 — Deployment Runbook

Follow these in order. Each step has a **Do**, a **Verify**, and (where relevant)
a **Rollback**. The code is already in the repo and typecheck-clean; this runbook
is the deploy + accounts + wiring that only you can do.

**Conventions**
- `App` = the Next.js app (Vercel). `DB` = Supabase project `vqdxinosmzezjveliemb`.
- `n8n` = `https://automation.iktissad.net`. Selector wf `i1PdqFuqOhhR1mbS`,
  Responder wf `IONLS3z9tlgNmH4A`.
- Anything marked **⚠️ irreversible-ish** changes production — read the Verify first.

---

## Phase A — Prerequisites & accounts (do these first; some have lead time)

### A1. Box swap (prevents OOM under multi-agent load)
- **Do (SSH to Lightsail `ubuntu@63.178.141.24`):**
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
- **Verify:** `free -h` shows 2.0Gi swap.

### A2. Browserbase account (the keystone egress)
- **Do:** sign up at browserbase.com → create a project → copy the **API key** and
  **Project ID**. Confirm the plan allows **residential proxies with country
  geolocation** (needed for `geolocation.country:"SA"`).
- **Verify:** keys saved to your secrets manager (used in B2).
- **Cheaper alt:** skip and run on the **Mubasher fallback** indefinitely — the
  system works without this; you only lose origin-sourced Tadawul + the markets
  widget data. (Self-host Patchright is the other alt; see plan v4 §4.)

### A3. Langfuse Cloud (observability — optional but recommended)
- **Do:** create a free **Hobby** account at cloud.langfuse.com → new project →
  copy **public** + **secret** keys. (Do NOT self-host — needs 4 GB; the box has 1.9.)
- **Verify:** keys saved.

### A4. Confirm base env already set (from earlier CMS work)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` must already exist on the App. If not, set them from
  the Supabase dashboard → Project Settings → API.

---

## Phase B — Database & environment

### B1. Apply the migrations ⚠️ irreversible-ish
Apply **in order**: 044 → 045 → 046. They are additive (all `gcc_*` tables; no
changes to existing tables).
- **Do (Supabase dashboard → SQL Editor, paste each file's contents and run):**
  1. `supabase/migrations/20260604_044_gcc_newsroom.sql`
  2. `supabase/migrations/20260607_045_gcc_trust_layer.sql`
  3. `supabase/migrations/20260607_046_gcc_pipeline_tasks.sql`
  (Or via CLI: `supabase db push` if the project is linked.)
- **Verify:**
  ```sql
  select count(*) from gcc_exchanges;          -- expect 7 (seeded by 044)
  select tablename from pg_tables where tablename like 'gcc_%' order by 1;  -- ~20 tables
  -- audit chain immutability is enforced:
  insert into gcc_audit_log(actor_type,action) values ('system','test');
  update gcc_audit_log set action='x' where action='test';  -- MUST error: append-only
  delete from gcc_audit_log where action='test';            -- MUST error
  ```
- **Rollback:** `drop table gcc_<name> cascade;` per table (all data namespaced
  `gcc_`, so nothing else is touched). Drop functions `gcc_audit_log_chain`,
  `gcc_audit_log_immutable`, `gcc_recover_stuck_tasks`.

### B2. Set the App env vars
- **Do (Vercel → Project → Settings → Environment Variables, Production):**
  | Var | Value | Required? |
  |---|---|---|
  | `AI_GATEWAY_API_KEY` | Vercel AI Gateway key | **yes** (pipeline) |
  | `GCC_WEBHOOK_SECRET` | a long random string | **yes** (API auth) |
  | `BROWSERBASE_API_KEY` | from A2 | for Tadawul origin |
  | `BROWSERBASE_PROJECT_ID` | from A2 | for Tadawul origin |
  | `GCC_NER_URL` | `http://<ner-host>:8088` | for entity linking (Phase E) |
  | `GCC_MODEL_WRITER` … | model overrides | optional (defaults in `gateway.ts`) |
  | `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | from A3 | optional |
- **Verify:** redeploy the App; `GCC_WEBHOOK_SECRET` and `AI_GATEWAY_API_KEY`
  present in the build.

### B3. Storage bucket for disclosure PDFs
- **Do:** Supabase → Storage → confirm a **`media`** bucket exists (the repository
  uploads PDFs under `gcc-disclosures/`). If you prefer isolation, create a
  `disclosures` bucket and change `STORAGE_BUCKET` in
  `src/lib/gcc/sourcing/repository.ts`.
- **Verify:** bucket listed.

---

## Phase C — Deploy the App & smoke-test the API (on Mubasher fallback)

This proves the whole slice end-to-end **without** Browserbase.

### C1. Deploy
- **Do:** deploy the App to Vercel (the new `/api/gcc/*` routes + `/markets` ship
  with it).
- **Verify:** `https://<app>/markets` renders the empty-state ("لا تتوفر بيانات
  سوقية بعد").

### C2. Smoke-test ingest (Mubasher)
- **Do:**
  ```bash
  curl -sX POST https://<app>/api/gcc/ingest \
    -H "content-type: application/json" -H "x-gcc-secret: $GCC_WEBHOOK_SECRET" \
    -d '{"exchange":"TADAWUL","limit":5}'
  ```
- **Verify:** JSON with `"source":"mirror"` and a `newlyIngested` array; rows
  appear in `gcc_disclosure_events`. Re-run → `skippedDuplicates` increases,
  `newlyIngested` empty (idempotency works).

### C3. Smoke-test the pipeline (draft)
- **Do:** take a `disclosureEventId` from C2:
  ```bash
  curl -sX POST https://<app>/api/gcc/draft \
    -H "content-type: application/json" -H "x-gcc-secret: $GCC_WEBHOOK_SECRET" \
    -d '{"disclosureEventId":"<uuid>"}'
  ```
- **Verify:** returns `article` + `verdicts` + `publishable` + `blockers`; a row in
  `gcc_generated_articles` (status `pending_review` or `needs_changes`), claim
  rows in `gcc_claim_cards`, an active `gcc_review_bundles` row, cost rows in
  `gcc_agent_runs`.
- **If it errors** `AI_GATEWAY_API_KEY is not set` → fix B2.

### C4. Run the regression gate locally before trusting drafts
- **Do:** `npx vitest run src/lib/gcc` (deterministic, no network).
- **Verify:** all green. Optionally `AI_GATEWAY_API_KEY=… npx tsx
  scripts/gcc-eval/run-live.ts` for the full-pipeline eval.

---

## Phase D — Wire the live n8n workflows

Replace the in-workflow drafting/publish logic with calls to the App API, so all
the trust-layer + verification runs server-side.

### D1. Selector → call ingest + log screening
- **Do (n8n Selector `i1PdqFuqOhhR1mbS`):**
  - Replace the Mubasher fetch/parse nodes with one **HTTP Request** node →
    `POST /api/gcc/ingest` (header `x-gcc-secret`). Iterate `newlyIngested`.
  - For each, send the Telegram screening card as today (buttons
    `d~<cat>~<disclosureEventId>` / `s~<disclosureEventId>`).
  - On send, **HTTP Request** → `POST /api/gcc/decision`
    `{action:"screened_in", disclosureEventId, category}` (and `screened_out` on
    skip).
- **Verify:** a manual Selector run posts cards; `gcc_editorial_decisions` gets
  `screened_*` rows.

### D2. Responder → call draft + decision
- **Do (n8n Responder `IONLS3z9tlgNmH4A`):**
  - On `d~…` (✍️ tap): **HTTP Request** → `POST /api/gcc/draft`
    `{disclosureEventId}`. Render the returned `article` in the review card with
    `✅نشر/✏️تعديل/❌رفض`. **If `publishable=false`, show `blockers` and disable
    ✅** (hard gate).
  - On `✅نشر`: insert into the production `articles` table from the
    `generatedArticleId`'s draft, then **HTTP Request** → `POST /api/gcc/decision`
    `{action:"approved", generatedArticleId, category}`.
  - On `❌رفض`: `POST /api/gcc/decision {action:"rejected", …}`.
  - On `✏️تعديل`: capture the edited text (force-reply), then
    `POST /api/gcc/decision {action:"edited", generatedArticleId, editDiff:{before,after,distance}, reason}`.
    **The edit_diff is the GEPA training signal — always send it.**
- **Verify:** full loop on one item: tap ✍️ → draft card → tap ✅ → article
  published → `gcc_editorial_decisions` has `approved`; the active
  `gcc_review_bundles` row flips to `approved`.

### D3. Staleness guard (optional hardening)
- Before publishing, have the Responder re-read the active bundle's `bundle_hash`;
  if the draft was regenerated since, the active bundle will differ — reject the
  stale tap and re-send. (The unique active-bundle index enforces one active
  bundle per article.)

---

## Phase E — Origin sourcing (Tadawul) — once Browserbase is ready

### E1. Install deps for the origin fetcher
- **Do:** `npm i @browserbasehq/sdk playwright-core` and redeploy. With
  `BROWSERBASE_*` set, `getFetcher('TADAWUL')` auto-switches to the origin fetcher.
- **Verify:**
  ```bash
  curl -sX POST https://<app>/api/gcc/ingest -H "x-gcc-secret: $GCC_WEBHOOK_SECRET" \
    -H "content-type: application/json" -d '{"exchange":"TADAWUL","limit":3}'
  ```
  returns `"source":"origin"`; disclosures have `pdf_url` and `gcc_verified_figures`
  rows. **If you get an Akamai/_abck error**, re-check the proxy is Saudi-geo and
  `advancedStealth` is on (see `browserbase-fetcher.ts` + research appendix §11).
- **Rollback:** unset `BROWSERBASE_*` → falls back to Mubasher automatically.

### E2. Tune the endpoints if needed
- The Tadawul JSON URLs in `browserbase-fetcher.ts` are best-effort
  (`TADAWUL_ANNOUNCEMENTS_URL` / `TADAWUL_DETAIL_URL` env overrides). Capture the
  real XHR the portal fires (DevTools) and set the env overrides.

---

## Phase F — Entity layer (NER) — optional, improves issuer linking

### F1. Deploy the NER service
- **Do:** `docker build -t gcc-ner services/gcc-ner && docker run -d -p 8088:8088
  gcc-ner` on any box with ~2 GB free (NOT the 1.9 GB n8n box — use a separate
  small instance or a container host).
- **Verify:** `curl localhost:8088/health` → `{"status":"ok"}`;
  `curl -s localhost:8088/ner -d '{"text":"عيّنت أرامكو خالد العتيبي"}' -H
  'content-type: application/json'` returns ORG/PERS spans.

### F2. Seed companies + wire linking
- **Do:** populate `gcc_companies` + `gcc_company_aliases` (ticker, Arabic name,
  normalized aliases) for the issuers you cover. Set `GCC_NER_URL` (B2). Call
  `linkDisclosureIssuer(id)` from the draft flow (or add a node) so disclosures
  get a `company_id` → enables event-memory + issuer pages.
- **Verify:** a new disclosure gets `company_id` set; `gcc_event_memory`
  accumulates after a few drafts.

---

## Phase G — Schedule, feedback, markets

### G1. Enable the Selector schedule (only after D + idempotency proven)
- **Do:** enable the (currently disabled) schedule node in the Selector. Gate it
  with `isTradingDay()` (or a Code node using the GCC weekend heuristic).
- **Verify:** runs on a trading day, dedup keeps `newlyIngested` sane, no double
  cards. **Recovery:** confirm `select gcc_recover_stuck_tasks();` returns 0 on a
  healthy system (pg_cron runs it every 5 min if the extension is enabled).

### G2. Weekly feedback profile
- **Do:** add an n8n Schedule (weekly) → `POST /api/gcc/feedback/profile`.
- **Verify:** `site_settings` key `gcc_editorial_profile` populated; blind-spots
  listed. After ~10+ decisions per category, run the offline optimizer:
  `cd scripts/gcc-gepa && pip install -r requirements.txt && python optimize.py
  --category earnings` → review `output/earnings_candidate.md`, promote manually.

### G3. Markets widget data
- **Do:** once origin egress works, add a Selector branch (or separate workflow)
  that fetches market summaries and **UPSERTs** `gcc_market_summaries` /
  `gcc_sector_indices`. Enable Realtime: Supabase → Database → Replication → add
  `gcc_market_summaries` to the `supabase_realtime` publication.
- **Verify:** `/markets` shows live index cards; values update without refresh.

---

## Phase H — Observability (optional)

- **Do:** wrap the pipeline's gateway calls with the Langfuse OpenAI wrapper, or
  push spans from n8n via `POST https://cloud.langfuse.com/api/public/ingestion`.
  Register custom model definitions for each `provider/model` string so cost
  inference works. (The `gcc_agent_runs` table already gives a basic cost ledger
  without this.)
- **Verify:** traces appear in Langfuse with per-article cost.

---

## Go-live order (the short list)

1. A1 swap · A2 Browserbase · A3 Langfuse · A4 base env
2. B1 migrations (044→045→046) · B2 env · B3 bucket
3. C1 deploy · C2–C4 smoke-test on Mubasher
4. D1–D2 wire n8n (Selector + Responder) — **system is live on fallback here**
5. E origin (Tadawul) when Browserbase ready
6. F NER · G schedule + feedback + markets · H observability

**Minimum viable go-live = steps 1–4** (runs on Mubasher, full pipeline +
verification + trust layer + human approval). Everything after is enhancement.

---

## Rollback (whole feature)
- Disable the Selector schedule; revert the n8n Selector/Responder to their
  pre-v4 versions (n8n keeps version history).
- Unset `BROWSERBASE_*` to drop to Mubasher; unset `GCC_NER_URL` to drop entity
  linking. Both degrade gracefully.
- The `gcc_*` tables are isolated — dropping them affects nothing else.

*See `gcc-markets-newsroom-plan-v4.md` for the design and
`gcc-markets-newsroom-research-appendix.md` for the evidence behind each choice.*
