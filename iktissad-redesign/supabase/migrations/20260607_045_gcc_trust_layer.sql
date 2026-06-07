-- Migration 045: GCC Newsroom — trust layer (plan v4 §2.2)
--
-- Promotes the high-value JSON blobs that migration 044 stuffed inside
-- gcc_generated_articles (fact_check / provenance / correction_history) into
-- first-class, queryable, auditable relational tables. This is the v4
-- "object-centric, claim-level provenance" lesson: emit claims-with-sources,
-- not an opaque article blob. See docs/gcc-markets-newsroom-research-appendix.md
-- (§3 newsflow-oss, §4 FinSight, §11 FIRE) and gcc-markets-newsroom-plan-v4.md §2.2.
--
-- Builds ON TOP of 044 — references gcc_disclosure_events, gcc_generated_articles,
-- gcc_companies, and the production `articles` table.
--
-- Conventions (match 044):
--  * gcc_ namespace. RLS enabled on every table; NO public policies (all internal/
--    editor-facing). Server jobs use the service-role key, which bypasses RLS.
--  * Money / figures are NUMERIC (never float) — deterministic verification must not
--    hit float rounding.
--  * UNIQUE constraints double as idempotency keys for at-least-once retries.
--  * update_updated_at_column() trigger function exists (migration 019).

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- digest() for the audit hash chain

-- =============================================================================
-- 1. Verified figures — deterministic ground truth for the Verifier
--    Extracted from the disclosure by CODE (regex/rules), never by the LLM.
--    The Verifier diffs every number in a draft against these rows.
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_verified_figures (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_event_id  UUID NOT NULL REFERENCES gcc_disclosure_events(id) ON DELETE CASCADE,
  label                TEXT NOT NULL,            -- e.g. "صافي الربح", "EPS", "dividend per share"
  label_normalized     TEXT NOT NULL,            -- normalizeArabic(label) for matching
  value                NUMERIC NOT NULL,
  unit                 TEXT,                     -- 'SAR' | 'AED' | '%' | 'share' | ...
  scale                TEXT,                     -- 'absolute' | 'thousands' | 'millions' | 'billions'
  period               TEXT,                     -- 'Q1-2026' | 'FY2025' | NULL
  source_span          TEXT,                     -- the exact substring the number came from
  extraction_method    TEXT NOT NULL DEFAULT 'rule',  -- 'rule' | 'xbrl' | 'table' | 'manual'
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (disclosure_event_id, label_normalized, period)
);

CREATE INDEX IF NOT EXISTS idx_gcc_verified_figures_event
  ON gcc_verified_figures(disclosure_event_id);

-- =============================================================================
-- 2. Claim cards — atomic claim + four-bucket evidence (newsflow ClaimCard)
--    One row per checkable claim in a generated draft.
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_claim_cards (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_article_id  UUID NOT NULL REFERENCES gcc_generated_articles(id) ON DELETE CASCADE,
  disclosure_event_id   UUID REFERENCES gcc_disclosure_events(id) ON DELETE SET NULL,
  claim_text            TEXT NOT NULL,
  claim_type            TEXT NOT NULL DEFAULT 'semantic'
                          CHECK (claim_type IN ('number','name','date','quote','semantic')),
  status                TEXT NOT NULL DEFAULT 'unverified'
                          CHECK (status IN ('unverified','supported','contradicted','missing')),
  supporting_evidence   JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{source_ref, span, tier}]
  contradicting_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_evidence      JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score      NUMERIC,                 -- 0..1, mechanical (source-tier weighted)
  source_tier           NUMERIC,                 -- best supporting source's authority weight
  risk_level            TEXT DEFAULT 'L0' CHECK (risk_level IN ('L0','L1','L2','L3')),
  draft_anchor_ref      TEXT,                    -- locates the claim's span in the draft body
  verified_figure_id    UUID REFERENCES gcc_verified_figures(id) ON DELETE SET NULL,
  reasoning             TEXT,
  verified_by           TEXT,                    -- 'verifier' | 'human:<editor>' | model id
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcc_claim_cards_article
  ON gcc_claim_cards(generated_article_id);
CREATE INDEX IF NOT EXISTS idx_gcc_claim_cards_status
  ON gcc_claim_cards(status);

CREATE TRIGGER gcc_claim_cards_updated_at
  BEFORE UPDATE ON gcc_claim_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. Review bundles — immutable submit-time snapshot + staleness guard
--    Freeze draft+claims+evidence at the moment the editor sees it; if the draft
--    changes after submit, mark the bundle 'superseded' and reject the stale tap.
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_review_bundles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_article_id  UUID NOT NULL REFERENCES gcc_generated_articles(id) ON DELETE CASCADE,
  draft_version         INT NOT NULL DEFAULT 1,
  draft_snapshot        JSONB NOT NULL DEFAULT '{}'::jsonb,
  claim_snapshot        JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_snapshot     JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_snapshot         JSONB NOT NULL DEFAULT '{}'::jsonb,
  bundle_hash           TEXT NOT NULL,           -- sha256 of canonical snapshot JSON
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','superseded','approved','rejected')),
  submitted_by          TEXT,
  submit_note           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one ACTIVE bundle per article at a time (the staleness guard).
CREATE UNIQUE INDEX IF NOT EXISTS uq_gcc_review_bundles_active
  ON gcc_review_bundles(generated_article_id) WHERE status = 'active';

CREATE TRIGGER gcc_review_bundles_updated_at
  BEFORE UPDATE ON gcc_review_bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. Editorial decisions — the feedback corpus (openclaw + Hermes/GEPA)
--    Every editor action. The edit_diff is the highest-signal training data.
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_editorial_decisions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_article_id  UUID REFERENCES gcc_generated_articles(id) ON DELETE SET NULL,
  disclosure_event_id   UUID REFERENCES gcc_disclosure_events(id) ON DELETE SET NULL,
  category              TEXT,                    -- disclosure category (earnings/board/...)
  action                TEXT NOT NULL
                          CHECK (action IN ('screened_in','screened_out','approved',
                                            'rejected','edited','manual_draft')),
  edit_diff             JSONB,                   -- before/after for 'edited'
  reason                TEXT,
  decided_by            TEXT,                    -- editor chat id / name
  decided_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcc_editorial_decisions_category
  ON gcc_editorial_decisions(category, action);
CREATE INDEX IF NOT EXISTS idx_gcc_editorial_decisions_decided_at
  ON gcc_editorial_decisions(decided_at DESC);

-- =============================================================================
-- 5. Correction tickets — post-publish reopen (newsflow CorrectionTicket)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_correction_tickets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_article_id  UUID REFERENCES gcc_generated_articles(id) ON DELETE SET NULL,
  article_id            UUID REFERENCES articles(id) ON DELETE SET NULL,
  trigger_reason        TEXT NOT NULL,
  impact_scope          TEXT,                    -- 'factual_error' | 'missing_context' | 'retraction'
  proposed_fix          TEXT,
  status                TEXT NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open','corrected','not_corrected','rejected','closed')),
  opened_by             TEXT,
  closed_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcc_correction_tickets_status
  ON gcc_correction_tickets(status);

CREATE TRIGGER gcc_correction_tickets_updated_at
  BEFORE UPDATE ON gcc_correction_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. Event memory — persisted knowledge keyed by issuer (newsflow NewsroomMemory,
--    but in Postgres, not RAM). Before drafting, pull confirmed + debunked facts
--    for the issuer so the pipeline never re-asserts a known-false claim.
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_event_memory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID REFERENCES gcc_companies(id) ON DELETE CASCADE,
  event_type       TEXT,
  title_hash       TEXT,                         -- normalizeArabic(title) hash, dedup across sources
  confirmed_facts  JSONB NOT NULL DEFAULT '[]'::jsonb,
  debunked_claims  JSONB NOT NULL DEFAULT '[]'::jsonb,
  persons          JSONB NOT NULL DEFAULT '[]'::jsonb,   -- NER PERS spans (execs/board)
  occurred_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcc_event_memory_company
  ON gcc_event_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_gcc_event_memory_title_hash
  ON gcc_event_memory(title_hash);

CREATE TRIGGER gcc_event_memory_updated_at
  BEFORE UPDATE ON gcc_event_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. Audit log — append-only hash chain, DB-ENFORCED immutability
--    newsflow has the hash chain but enforces append-only in app code only; we
--    add the REVOKE + triggers it forgot, so the chain is tamper-evident at the DB.
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_audit_log (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- sequential = chain order
  actor_type     TEXT NOT NULL CHECK (actor_type IN ('human','agent','system')),
  actor_id       TEXT,
  action         TEXT NOT NULL,
  object_type    TEXT,
  object_id      TEXT,
  details        JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_model       TEXT,
  ai_prompt_hash TEXT,
  ai_token_usage JSONB,
  override_flag  BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  previous_hash  TEXT,
  entry_hash     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcc_audit_log_object
  ON gcc_audit_log(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_gcc_audit_log_created
  ON gcc_audit_log(created_at DESC);

-- 7a. Chain maintenance: on INSERT, link to the prior row and compute this row's hash.
CREATE OR REPLACE FUNCTION gcc_audit_log_chain() RETURNS trigger AS $$
DECLARE prev TEXT;
BEGIN
  SELECT entry_hash INTO prev FROM gcc_audit_log ORDER BY id DESC LIMIT 1;
  NEW.previous_hash := prev;
  NEW.entry_hash := encode(
    digest(
      coalesce(prev, '')
        || NEW.actor_type || coalesce(NEW.actor_id, '')
        || NEW.action || coalesce(NEW.object_type, '') || coalesce(NEW.object_id, '')
        || coalesce(NEW.details::text, '')
        || coalesce(NEW.ai_model, '') || coalesce(NEW.ai_prompt_hash, '')
        || NEW.created_at::text,
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gcc_audit_log_chain_ins
  BEFORE INSERT ON gcc_audit_log
  FOR EACH ROW EXECUTE FUNCTION gcc_audit_log_chain();

-- 7b. Immutability: block any UPDATE/DELETE (the backstop newsflow lacked).
CREATE OR REPLACE FUNCTION gcc_audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'gcc_audit_log is append-only — % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gcc_audit_log_no_mutate
  BEFORE UPDATE OR DELETE ON gcc_audit_log
  FOR EACH ROW EXECUTE FUNCTION gcc_audit_log_immutable();

REVOKE UPDATE, DELETE ON gcc_audit_log FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 8. RLS — enable on all; no public policies (internal/editor only).
--    Service-role bypasses RLS for server jobs.
-- =============================================================================

ALTER TABLE gcc_verified_figures    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_claim_cards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_review_bundles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_editorial_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_correction_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_event_memory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_audit_log           ENABLE ROW LEVEL SECURITY;
