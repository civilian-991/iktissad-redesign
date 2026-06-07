-- Migration 044: GCC Markets Autonomous Newsroom — foundations
--
-- Adds the data layer for the GCC newsroom (plan v2 §4): officially-sourced
-- market data + disclosures from the 7 GCC exchanges, an entity graph, a macro
-- feed, and the newsroom staging tables. All tables are namespaced `gcc_` to
-- avoid collisions with the existing 42-table schema (e.g. the existing
-- `sectors` taxonomy table is distinct from `gcc_sectors`).
--
-- Conventions followed:
--  * RLS enabled on every table. Service-role writes bypass RLS (no policy
--    needed). Public SELECT policies added ONLY for the reference + market-data
--    tables the public widget reads (mirrors migration 041's secure pattern,
--    not 031's permissive FOR ALL).
--  * Money / index figures are NUMERIC (never float) so deterministic
--    reconciliation in the validation engine doesn't hit float-rounding.
--  * UNIQUE constraints double as idempotency keys for Inngest at-least-once
--    retries (market summaries, disclosure dedup, generated articles).
--  * update_updated_at_column() trigger function already exists (migration 019).

CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- fuzzy alias matching for entity resolution

-- =============================================================================
-- 1. Reference / entity graph
-- =============================================================================

-- 1.1 Exchanges
CREATE TABLE IF NOT EXISTS gcc_exchanges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL UNIQUE,              -- TADAWUL/ADX/DFM/QSE/BK/BHB/MSX
  name              TEXT NOT NULL,                     -- Arabic
  name_en           TEXT NOT NULL DEFAULT '',
  country           TEXT NOT NULL,
  currency          TEXT NOT NULL,                     -- SAR/AED/QAR/KWD/BHD/OMR
  timezone          TEXT NOT NULL,                     -- IANA tz, e.g. Asia/Riyadh
  close_time_local  TIME,                              -- local market close (approx; verify)
  data_tier         TEXT NOT NULL DEFAULT 'licensed'
                      CHECK (data_tier IN ('open','official','licensed')),
  source_config     JSONB NOT NULL DEFAULT '{}'::jsonb, -- adapter manifest (endpoints/patterns)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER gcc_exchanges_updated_at
  BEFORE UPDATE ON gcc_exchanges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 1.2 Trading calendars
CREATE TABLE IF NOT EXISTS gcc_trading_calendars (
  exchange_id     UUID NOT NULL REFERENCES gcc_exchanges(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  is_trading_day  BOOLEAN NOT NULL DEFAULT true,
  holiday_name    TEXT,
  PRIMARY KEY (exchange_id, date)
);

-- 1.3 Sectors (exchange-specific market sectors; distinct from taxonomy `sectors`)
CREATE TABLE IF NOT EXISTS gcc_sectors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id       UUID NOT NULL REFERENCES gcc_exchanges(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  name_en           TEXT NOT NULL DEFAULT '',
  canonical_sector  TEXT,                              -- cross-exchange mapping key
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exchange_id, name)
);

-- 1.4 Companies — the entity-resolution anchor
CREATE TABLE IF NOT EXISTS gcc_companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id  UUID NOT NULL REFERENCES gcc_exchanges(id) ON DELETE CASCADE,
  ticker       TEXT NOT NULL,
  isin         TEXT,
  name         TEXT NOT NULL,                          -- Arabic
  name_en      TEXT NOT NULL DEFAULT '',
  sector_id    UUID REFERENCES gcc_sectors(id) ON DELETE SET NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exchange_id, ticker)
);

-- ISIN unique only when present
CREATE UNIQUE INDEX IF NOT EXISTS uq_gcc_companies_isin
  ON gcc_companies (isin) WHERE isin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gcc_companies_sector ON gcc_companies(sector_id);

CREATE TRIGGER gcc_companies_updated_at
  BEFORE UPDATE ON gcc_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 1.5 Company aliases (bilingual fuzzy resolution)
CREATE TABLE IF NOT EXISTS gcc_company_aliases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES gcc_companies(id) ON DELETE CASCADE,
  exchange_id       UUID NOT NULL REFERENCES gcc_exchanges(id) ON DELETE CASCADE,
  alias_normalized  TEXT NOT NULL,                     -- diacritics stripped, alef/hamza/yaa unified
  lang              TEXT,                              -- 'ar' | 'en'
  source            TEXT,                              -- where the alias came from
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exchange_id, alias_normalized)
);

CREATE INDEX IF NOT EXISTS idx_gcc_company_aliases_trgm
  ON gcc_company_aliases USING gin (alias_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_gcc_company_aliases_company
  ON gcc_company_aliases(company_id);

-- 1.6 Themes (cross-market narrative tags)
CREATE TABLE IF NOT EXISTS gcc_themes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  name_en    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. Stream A — market data
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_market_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id      UUID NOT NULL REFERENCES gcc_exchanges(id) ON DELETE CASCADE,
  trading_date     DATE NOT NULL,
  index_name       TEXT NOT NULL,
  index_close      NUMERIC,
  change_points    NUMERIC,
  change_percent   NUMERIC,
  volume           NUMERIC,
  value            NUMERIC,
  num_trades       BIGINT,
  market_cap       NUMERIC,
  market_cap_unit  TEXT,                               -- 'absolute' | 'millions' | 'billions'
  advancers        INT,
  decliners        INT,
  unchanged        INT,
  currency         TEXT,
  source_url       TEXT,
  extraction_ts    TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw              JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence       NUMERIC,                            -- 0..1
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exchange_id, trading_date, index_name)       -- natural idempotency key
);

CREATE INDEX IF NOT EXISTS idx_gcc_market_summaries_date
  ON gcc_market_summaries USING brin (trading_date);
CREATE INDEX IF NOT EXISTS idx_gcc_market_summaries_exchange_date
  ON gcc_market_summaries(exchange_id, trading_date DESC);

CREATE TRIGGER gcc_market_summaries_updated_at
  BEFORE UPDATE ON gcc_market_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS gcc_sector_indices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_summary_id  UUID NOT NULL REFERENCES gcc_market_summaries(id) ON DELETE CASCADE,
  sector_id          UUID REFERENCES gcc_sectors(id) ON DELETE SET NULL,
  sector_name        TEXT,                             -- denormalized fallback
  close              NUMERIC,
  change_points      NUMERIC,
  change_percent     NUMERIC,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcc_sector_indices_summary
  ON gcc_sector_indices(market_summary_id);

-- =============================================================================
-- 3. Stream B — disclosures / announcements
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_disclosure_events (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id               UUID NOT NULL REFERENCES gcc_exchanges(id) ON DELETE CASCADE,
  company_id                UUID REFERENCES gcc_companies(id) ON DELETE SET NULL,
  type                      TEXT NOT NULL DEFAULT 'other'
                              CHECK (type IN ('market_summary','earnings','dividend','agm_egm',
                                              'board','halt','ipo_listing','ownership',
                                              'capital_change','regulatory','debt_fund','other')),
  title                     TEXT,                       -- Arabic
  title_en                  TEXT,
  body                      TEXT,
  body_en                   TEXT,
  filed_at                  TIMESTAMPTZ,
  source_url                TEXT,
  native_id                 TEXT,                       -- exchange filing id (QSE InfoID, ADX id…)
  pdf_url                   TEXT,
  pdf_text                  TEXT,                       -- narrative text-layer extraction
  structured                JSONB NOT NULL DEFAULT '{}'::jsonb,
  extraction_schema_version INT NOT NULL DEFAULT 1,
  theme_ids                 UUID[] NOT NULL DEFAULT '{}',
  newsworthiness            NUMERIC,
  dedup_key                 TEXT NOT NULL,              -- prefer exchange-native id
  raw                       JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence                NUMERIC,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dedup_key)                                    -- DB-enforced dedup (race-safe)
);

CREATE INDEX IF NOT EXISTS idx_gcc_disclosure_exchange_filed
  ON gcc_disclosure_events(exchange_id, filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_gcc_disclosure_company_filed
  ON gcc_disclosure_events(company_id, filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_gcc_disclosure_type
  ON gcc_disclosure_events(type);

CREATE TRIGGER gcc_disclosure_events_updated_at
  BEFORE UPDATE ON gcc_disclosure_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. Macro feed
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_macro_signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts          TIMESTAMPTZ NOT NULL,
  kind        TEXT NOT NULL,                            -- brent/wti/usd_index/us_10y/fed_rate/gold/regional_headline
  value       NUMERIC,
  unit        TEXT,
  source_url  TEXT,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcc_macro_signals_ts
  ON gcc_macro_signals USING brin (ts);
CREATE INDEX IF NOT EXISTS idx_gcc_macro_signals_kind_ts
  ON gcc_macro_signals(kind, ts DESC);

-- =============================================================================
-- 5. Newsroom (staging — decoupled from the production `articles` table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_story_budget (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          TEXT NOT NULL,
  assignment      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {angle, entity_ids, event_ids, why_now}
  story_type      TEXT,
  newsworthiness  NUMERIC,
  status          TEXT NOT NULL DEFAULT 'assigned'
                    CHECK (status IN ('assigned','drafting','drafted','spiked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcc_story_budget_run ON gcc_story_budget(run_id);
CREATE INDEX IF NOT EXISTS idx_gcc_story_budget_status ON gcc_story_budget(status);

CREATE TRIGGER gcc_story_budget_updated_at
  BEFORE UPDATE ON gcc_story_budget
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS gcc_generated_articles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_budget_id     UUID NOT NULL REFERENCES gcc_story_budget(id) ON DELETE CASCADE,
  edition             TEXT NOT NULL CHECK (edition IN ('ar','en')),
  draft               JSONB NOT NULL DEFAULT '{}'::jsonb, -- TipTap body + headline/dek (lives here pre-approval)
  confidence          NUMERIC,
  fact_check          JSONB NOT NULL DEFAULT '{}'::jsonb,
  provenance          JSONB NOT NULL DEFAULT '{}'::jsonb, -- claim -> source_ref map
  compliance          JSONB NOT NULL DEFAULT '{}'::jsonb,
  edit_distance       INT,
  review_log          JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_article_id   UUID REFERENCES articles(id) ON DELETE SET NULL, -- follow-up thread
  supersedes_id       UUID REFERENCES gcc_generated_articles(id) ON DELETE SET NULL,
  surfaces            JSONB NOT NULL DEFAULT '{}'::jsonb, -- {newsletter_sent, social_posted}
  correction_history  JSONB NOT NULL DEFAULT '[]'::jsonb,
  status              TEXT NOT NULL DEFAULT 'generated'
                        CHECK (status IN ('generated','pending_review','needs_changes','approved',
                                          'scheduled','published','spiked','superseded','archived')),
  article_id          UUID REFERENCES articles(id) ON DELETE SET NULL, -- NULL until promoted
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_budget_id, edition)                    -- idempotency for retried newsroom runs
);

CREATE INDEX IF NOT EXISTS idx_gcc_generated_articles_status
  ON gcc_generated_articles(status);
CREATE INDEX IF NOT EXISTS idx_gcc_generated_articles_article
  ON gcc_generated_articles(article_id);

CREATE TRIGGER gcc_generated_articles_updated_at
  BEFORE UPDATE ON gcc_generated_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. Ops ledgers
-- =============================================================================

CREATE TABLE IF NOT EXISTS gcc_scrape_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id   UUID REFERENCES gcc_exchanges(id) ON DELETE SET NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running','success','failed','partial')),
  items         INT NOT NULL DEFAULT 0,
  source        TEXT,
  http_status   INT,
  error         TEXT,
  snapshot_url  TEXT
);

CREATE INDEX IF NOT EXISTS idx_gcc_scrape_runs_exchange
  ON gcc_scrape_runs(exchange_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_gcc_scrape_runs_status
  ON gcc_scrape_runs(status);

CREATE TABLE IF NOT EXISTS gcc_agent_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       TEXT,
  agent        TEXT NOT NULL,
  model        TEXT,
  input_hash   TEXT,                                   -- doubles as LLM-step memoization key
  tokens_in    INT,
  tokens_out   INT,
  cost         NUMERIC,
  duration_ms  INT,
  status       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcc_agent_runs_run ON gcc_agent_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_gcc_agent_runs_input_hash ON gcc_agent_runs(input_hash);

-- =============================================================================
-- 7. RLS — enable on all; public SELECT only for reference + market data
-- =============================================================================

ALTER TABLE gcc_exchanges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_trading_calendars  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_sectors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_companies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_company_aliases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_themes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_market_summaries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_sector_indices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_disclosure_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_macro_signals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_story_budget       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_generated_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_scrape_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_agent_runs         ENABLE ROW LEVEL SECURITY;

-- Public-readable (feed the live markets widget). Reads scoped to anon+authenticated.
CREATE POLICY "Public read gcc_exchanges"        ON gcc_exchanges        FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read gcc_sectors"          ON gcc_sectors          FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read gcc_companies"        ON gcc_companies        FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read gcc_market_summaries" ON gcc_market_summaries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read gcc_sector_indices"   ON gcc_sector_indices   FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read gcc_macro_signals"    ON gcc_macro_signals    FOR SELECT TO anon, authenticated USING (true);

-- All other tables: RLS on, NO policy => no anon/authenticated access.
-- Server jobs (Inngest steps, ingestion) use the service-role key, which bypasses RLS.

-- =============================================================================
-- 8. Seed: the 7 GCC exchanges
--    (close_time_local is approximate local close — verify per exchange calendar)
-- =============================================================================

INSERT INTO gcc_exchanges (code, name, name_en, country, currency, timezone, close_time_local, data_tier)
VALUES
  ('TADAWUL', 'السوق المالية السعودية (تداول)', 'Saudi Exchange (Tadawul)',        'Saudi Arabia', 'SAR', 'Asia/Riyadh', '15:00', 'licensed'),
  ('ADX',     'سوق أبوظبي للأوراق المالية',        'Abu Dhabi Securities Exchange',  'United Arab Emirates', 'AED', 'Asia/Dubai', '15:00', 'licensed'),
  ('DFM',     'سوق دبي المالي',                     'Dubai Financial Market',         'United Arab Emirates', 'AED', 'Asia/Dubai', '15:00', 'official'),
  ('QSE',     'بورصة قطر',                          'Qatar Stock Exchange',           'Qatar', 'QAR', 'Asia/Qatar', '13:15', 'licensed'),
  ('BK',      'بورصة الكويت',                       'Boursa Kuwait',                  'Kuwait', 'KWD', 'Asia/Kuwait', '12:45', 'open'),
  ('BHB',     'بورصة البحرين',                      'Bahrain Bourse',                 'Bahrain', 'BHD', 'Asia/Bahrain', '14:00', 'licensed'),
  ('MSX',     'بورصة مسقط',                         'Muscat Stock Exchange',          'Oman', 'OMR', 'Asia/Muscat', '13:00', 'open')
ON CONFLICT (code) DO NOTHING;
