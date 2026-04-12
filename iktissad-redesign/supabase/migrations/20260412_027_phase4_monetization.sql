-- ============================================================
-- Phase 4: Monetization & Subscriptions
-- ============================================================

-- ── 4.1: Articles — add is_paywalled & article_price ────────
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS is_paywalled   BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS article_price  NUMERIC(10,2);          -- null = use global default

-- ── 4.1: Subscription plans — add tier ──────────────────────
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'premium', 'digital'));

-- ── 4.1: reading_sessions ───────────────────────────────────
-- Populated by the article page on every read. Used for:
--   • metered paywall counting (articles read this month per user/session)
--   • reading history API (/api/account/reading-history)
--   • engagement scoring for dynamic paywall (4.5)
CREATE TABLE IF NOT EXISTS reading_sessions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          REFERENCES users(id) ON DELETE SET NULL,
  article_id    UUID          REFERENCES articles(id) ON DELETE CASCADE,
  session_id    TEXT,                       -- anonymous browser session cookie
  time_on_page  INT           DEFAULT 0,    -- seconds
  scroll_depth  INT           DEFAULT 0,    -- 0–100 %
  read_through  BOOLEAN       DEFAULT false,-- reached the end
  referrer      TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user      ON reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_article   ON reading_sessions(article_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_session   ON reading_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_created   ON reading_sessions(created_at DESC);

ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own sessions
CREATE POLICY "rs_user_select" ON reading_sessions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
  );

-- Service role (admin client) has full access — no explicit policy needed
-- (RLS bypassed by service_role key)

-- ── 4.2: gift_links ─────────────────────────────────────────
-- Subscribers generate shareable tokens that grant one-time paywall bypass.
CREATE TABLE IF NOT EXISTS gift_links (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token                     TEXT        UNIQUE NOT NULL
                                          DEFAULT encode(gen_random_bytes(20), 'hex'),
  article_id                UUID        NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_by_subscriber_id  UUID        REFERENCES subscribers(id) ON DELETE SET NULL,
  created_by_user_id        UUID        REFERENCES users(id) ON DELETE SET NULL,
  max_uses                  INT         NOT NULL DEFAULT 1,
  uses_count                INT         NOT NULL DEFAULT 0,
  expires_at                TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  referral_code             TEXT,       -- optional analytics tag
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_links_token       ON gift_links(token);
CREATE INDEX IF NOT EXISTS idx_gift_links_subscriber  ON gift_links(created_by_subscriber_id);
CREATE INDEX IF NOT EXISTS idx_gift_links_created     ON gift_links(created_at DESC);

ALTER TABLE gift_links ENABLE ROW LEVEL SECURITY;
-- Public can read by token (needed for anonymous redemption — filtered in API layer)
-- Service role has full access

-- ── 4.3: article_purchases ──────────────────────────────────
-- Single-article micropayment records.
CREATE TABLE IF NOT EXISTS article_purchases (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id          UUID          NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  payment_id          UUID          REFERENCES payments(id) ON DELETE SET NULL,
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT          NOT NULL DEFAULT 'SAR',
  gateway_payment_id  TEXT,         -- MPGS transaction ID
  purchased_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)       -- prevent duplicate purchases
);

CREATE INDEX IF NOT EXISTS idx_article_purchases_user    ON article_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_article_purchases_article ON article_purchases(article_id);

ALTER TABLE article_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_user_select" ON article_purchases
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
  );

-- ── 4.1: Seed paywall settings ───────────────────────────────
INSERT INTO site_settings (key, value)
VALUES (
  'paywall',
  jsonb_build_object(
    'freeArticleLimit',           5,
    'giftLinksPerMonth',          5,
    'singleArticleDefaultPrice',  5.00,
    'dynamicPaywall',             false,
    'socialBonusArticle',         true,
    'highEngagementBonus',        2,
    'highEngagementThreshold',    70
  )
)
ON CONFLICT (key) DO NOTHING;
