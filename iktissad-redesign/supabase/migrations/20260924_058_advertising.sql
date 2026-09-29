-- ---------------------------------------------------------------------------
-- Advertising & content partnerships (2026 rate card).
--
-- The rate card sells five web display placements, two kinds of partner
-- article, section sponsorships and newsletter sponsorships, and promises an
-- end-of-campaign report for each. The ads/ad_campaigns/advertisers tables
-- (006) only modelled print-magazine spreads, so this adds:
--
--   advertisers   logo + website (section header logo, "in partnership with")
--   ad_campaigns  how the campaign is billed: CPM or flat fee, the rate, the
--                 booked impressions; plus the created_at the API already
--                 orders by but that never existed
--   ads           which web placement a creative runs in, a mobile creative,
--                 image vs HTML5, optional section targeting, rotation weight
--   articles      sponsorship label + the advertiser behind it
--   section_sponsorships  one sponsor per section per period
--   ad_events_daily       per-day impressions/clicks — the source for every
--                         report. Written only through record_ad_event().
-- ---------------------------------------------------------------------------

ALTER TABLE advertisers
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

ALTER TABLE ad_campaigns
  ADD COLUMN IF NOT EXISTS pricing_model TEXT NOT NULL DEFAULT 'cpm'
    CHECK (pricing_model IN ('cpm', 'flat')),
  ADD COLUMN IF NOT EXISTS rate_cents INTEGER CHECK (rate_cents >= 0),
  ADD COLUMN IF NOT EXISTS impression_goal BIGINT CHECK (impression_goal >= 0),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS placement TEXT CHECK (placement IN (
    'homepage_billboard', 'article_leaderboard', 'in_article_mpu',
    'sticky_mobile', 'run_of_site'
  )),
  ADD COLUMN IF NOT EXISTS mobile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS creative_format TEXT NOT NULL DEFAULT 'image'
    CHECK (creative_format IN ('image', 'html5')),
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS weight INTEGER NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 100),
  -- Desktop creative size. Run-of-Site creatives come in several sizes and are
  -- only served into slots that take that size.
  ADD COLUMN IF NOT EXISTS size TEXT CHECK (size IN (
    '970x250', '728x90', '300x250', '300x600', '320x50', '320x100'
  ));

-- Serving looks up active web ads by placement on every page view.
CREATE INDEX IF NOT EXISTS ads_placement_active_idx
  ON ads (placement) WHERE active AND placement IS NOT NULL;

-- 'sponsored' = written by the client, 'partner' = written by our newsroom
-- for the client. NULL = ordinary editorial.
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS sponsorship TEXT CHECK (sponsorship IN ('sponsored', 'partner')),
  ADD COLUMN IF NOT EXISTS sponsor_advertiser_id UUID REFERENCES advertisers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS articles_sponsored_published_idx
  ON articles (published_at DESC) WHERE sponsorship IS NOT NULL;

CREATE TABLE IF NOT EXISTS section_sponsorships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id    UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  -- Creatives for the reserved first in-article MPU come from this campaign.
  campaign_id   UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  logo_url      TEXT,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  price_cents   INTEGER CHECK (price_cents >= 0),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS section_sponsorships_lookup_idx
  ON section_sponsorships (section_id, start_date, end_date) WHERE active;

ALTER TABLE section_sponsorships ENABLE ROW LEVEL SECURITY;
-- No policies: read and written only through the service role (API routes).

CREATE TABLE IF NOT EXISTS ad_events_daily (
  day          DATE NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('ad', 'newsletter_sponsor')),
  subject_id   UUID NOT NULL,
  placement    TEXT NOT NULL DEFAULT '',
  impressions  BIGINT NOT NULL DEFAULT 0,
  clicks       BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (subject_type, subject_id, day, placement)
);

ALTER TABLE ad_events_daily ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

CREATE OR REPLACE FUNCTION record_ad_event(
  p_subject_type TEXT,
  p_subject_id   UUID,
  p_placement    TEXT,
  p_kind         TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  imp INTEGER := CASE WHEN p_kind = 'impression' THEN 1 ELSE 0 END;
  clk INTEGER := CASE WHEN p_kind = 'click' THEN 1 ELSE 0 END;
BEGIN
  IF imp + clk = 0 THEN
    RAISE EXCEPTION 'unknown ad event kind: %', p_kind;
  END IF;

  INSERT INTO ad_events_daily (day, subject_type, subject_id, placement, impressions, clicks)
  VALUES (current_date, p_subject_type, p_subject_id, COALESCE(p_placement, ''), imp, clk)
  ON CONFLICT (subject_type, subject_id, day, placement) DO UPDATE
    SET impressions = ad_events_daily.impressions + EXCLUDED.impressions,
        clicks      = ad_events_daily.clicks + EXCLUDED.clicks;

  -- Keep the running totals the admin list shows in step.
  IF p_subject_type = 'ad' THEN
    UPDATE ads
       SET impressions = impressions + imp,
           clicks      = clicks + clk
     WHERE id = p_subject_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION record_ad_event(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public display of sponsors.
--
-- Article pages render with the anon key and embed the sponsor's name and logo
-- ("In partnership with …"). advertisers also holds contact names, emails and
-- phone numbers, so anon/authenticated get only the display columns, and only
-- for advertisers that are publicly on show: a published sponsored article or
-- a running section sponsorship. Admin routes use the service role.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS articles_sponsor_advertiser_idx
  ON articles (sponsor_advertiser_id) WHERE sponsor_advertiser_id IS NOT NULL;

CREATE OR REPLACE FUNCTION advertiser_is_public(p_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
           SELECT 1 FROM articles
            WHERE sponsor_advertiser_id = p_id AND status = 'published'
         )
      OR EXISTS (
           SELECT 1 FROM section_sponsorships
            WHERE advertiser_id = p_id AND active
              AND current_date BETWEEN start_date AND end_date
         );
$$;

REVOKE SELECT ON advertisers FROM anon, authenticated;
GRANT SELECT (id, name, name_en, logo_url, website_url) ON advertisers TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read sponsors on display" ON advertisers;
CREATE POLICY "Public can read sponsors on display" ON advertisers
  FOR SELECT USING (advertiser_is_public(id));

-- ---------------------------------------------------------------------------
-- Audience figures for the rate card ("monthly page views, unique users,
-- audience by country, mobile share"). One row per visitor per day; the
-- visitor id is the random first-party ikt_sid cookie. Written only through
-- record_page_view(), read through audience_summary().
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audience_visits (
  day         DATE NOT NULL,
  visitor_id  TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT '',
  device      TEXT NOT NULL DEFAULT 'desktop' CHECK (device IN ('mobile', 'tablet', 'desktop')),
  views       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, visitor_id)
);
CREATE INDEX IF NOT EXISTS audience_visits_day_idx ON audience_visits (day);
ALTER TABLE audience_visits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION record_page_view(p_visitor TEXT, p_country TEXT, p_device TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO audience_visits (day, visitor_id, country, device, views)
  VALUES (current_date, p_visitor, COALESCE(p_country, ''), p_device, 1)
  ON CONFLICT (day, visitor_id) DO UPDATE SET views = audience_visits.views + 1;
$$;
REVOKE EXECUTE ON FUNCTION record_page_view(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION audience_summary(p_from DATE, p_to DATE)
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH v AS (SELECT * FROM audience_visits WHERE day BETWEEN p_from AND p_to)
  SELECT json_build_object(
    'pageViews',     (SELECT COALESCE(SUM(views), 0) FROM v),
    'visitors',      (SELECT COUNT(DISTINCT visitor_id) FROM v),
    'daysWithData',  (SELECT COUNT(DISTINCT day) FROM v),
    'countries',     (SELECT COALESCE(json_agg(c ORDER BY c.visitors DESC), '[]'::json) FROM (
                        SELECT country, COUNT(DISTINCT visitor_id) AS visitors FROM v GROUP BY country
                      ) c),
    'devices',       (SELECT COALESCE(json_agg(d), '[]'::json) FROM (
                        SELECT device, SUM(views) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM v GROUP BY device
                      ) d)
  );
$$;
REVOKE EXECUTE ON FUNCTION audience_summary(DATE, DATE) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Social reach for partner-content reports. Auto-posting records posts it
-- makes; posts made by hand are logged as manual. Reach/engagements are
-- entered from the platform's own dashboard (the free APIs don't expose them).
-- ---------------------------------------------------------------------------

ALTER TABLE social_post_log
  ADD COLUMN IF NOT EXISTS reach BIGINT CHECK (reach >= 0),
  ADD COLUMN IF NOT EXISTS engagements BIGINT CHECK (engagements >= 0),
  ADD COLUMN IF NOT EXISTS metrics_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual BOOLEAN NOT NULL DEFAULT false;

-- Posts logged by hand also go out on platforms auto-posting doesn't cover.
ALTER TABLE social_post_log DROP CONSTRAINT IF EXISTS social_post_log_platform_check;
ALTER TABLE social_post_log ADD CONSTRAINT social_post_log_platform_check
  CHECK (platform IN ('twitter', 'linkedin', 'telegram', 'facebook', 'instagram', 'youtube', 'whatsapp', 'tiktok'));
