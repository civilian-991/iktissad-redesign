-- =============================================================================
-- Phase 6 — Audience Engagement
-- Adds push subscriptions, live blogs, polls, and article templates
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 6.1: Push Notifications — Web Push subscriptions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_select_own"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_insert_own"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "push_subscriptions_delete_own"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6.4: Live Blogs — real-time breaking updates
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE live_blog_status AS ENUM ('active', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS live_blogs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  status      live_blog_status NOT NULL DEFAULT 'active',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_blogs_article_idx ON live_blogs (article_id);
CREATE INDEX IF NOT EXISTS live_blogs_status_idx ON live_blogs (status) WHERE status = 'active';

ALTER TABLE live_blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_blogs_select" ON live_blogs FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS live_blog_updates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_blog_id  UUID NOT NULL REFERENCES live_blogs(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_blog_updates_blog_idx ON live_blog_updates (live_blog_id, created_at DESC);

ALTER TABLE live_blog_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_blog_updates_select" ON live_blog_updates FOR SELECT USING (true);

-- Enable Realtime for live blog updates
ALTER TABLE live_blog_updates REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------------
-- 6.6: Reader Polls
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE poll_status AS ENUM ('active', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS polls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID REFERENCES articles(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL DEFAULT '[]',
  status      poll_status NOT NULL DEFAULT 'active',
  closes_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS polls_article_idx ON polls (article_id);
CREATE INDEX IF NOT EXISTS polls_status_idx ON polls (status);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polls_select" ON polls FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS poll_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_index  SMALLINT NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  voter_hash    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_unique_voter ON poll_votes (poll_id, voter_hash);
CREATE INDEX IF NOT EXISTS poll_votes_poll_idx ON poll_votes (poll_id);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_votes_select" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "poll_votes_insert" ON poll_votes FOR INSERT WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6.7: Article Templates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS article_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  name_en        TEXT NOT NULL DEFAULT '',
  description    TEXT NOT NULL DEFAULT '',
  template_body  JSONB NOT NULL DEFAULT '[]',
  category       TEXT NOT NULL DEFAULT 'general',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE article_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "article_templates_select" ON article_templates FOR SELECT USING (true);

-- Pre-seed templates
INSERT INTO article_templates (name, name_en, description, template_body, category) VALUES
(
  'خبر عاجل',
  'News Brief',
  'قالب للأخبار القصيرة والعاجلة',
  '[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"عنوان الخبر"}]},{"type":"paragraph","content":[{"type":"text","text":"ملخص الخبر في فقرة واحدة تتضمن: ماذا حدث، ومن المعني، ومتى وأين."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"التفاصيل"}]},{"type":"paragraph","content":[{"type":"text","text":"الفقرة الثانية تتضمن مزيداً من التفاصيل والسياق."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"التداعيات"}]},{"type":"paragraph","content":[{"type":"text","text":"تحليل مختصر لتأثير الخبر على السوق أو القطاع."}]}]',
  'news'
),
(
  'تقرير سوقي',
  'Market Report',
  'قالب لتقارير الأسواق المالية',
  '[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"نظرة عامة على السوق"}]},{"type":"paragraph","content":[{"type":"text","text":"ملخص أداء السوق في الفترة الحالية."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"المؤشرات الرئيسية"}]},{"type":"paragraph","content":[{"type":"text","text":"جدول أو قائمة بأهم المؤشرات وأدائها."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"تحليل القطاعات"}]},{"type":"paragraph","content":[{"type":"text","text":"تفصيل أداء القطاعات الرئيسية."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"التوقعات"}]},{"type":"paragraph","content":[{"type":"text","text":"النظرة المستقبلية وتوقعات المحللين."}]}]',
  'report'
),
(
  'مقابلة',
  'Interview Q&A',
  'قالب للمقابلات الحوارية',
  '[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"مقدمة عن الضيف"}]},{"type":"paragraph","content":[{"type":"text","text":"تعريف مختصر بالشخصية ومنصبها وأهمية المقابلة."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"السؤال الأول"}]},{"type":"paragraph","content":[{"type":"text","text":"إجابة الضيف..."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"السؤال الثاني"}]},{"type":"paragraph","content":[{"type":"text","text":"إجابة الضيف..."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"السؤال الثالث"}]},{"type":"paragraph","content":[{"type":"text","text":"إجابة الضيف..."}]}]',
  'interview'
),
(
  'رأي / افتتاحية',
  'Opinion/Editorial',
  'قالب لمقالات الرأي والتحليل',
  '[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"الأطروحة الرئيسية"}]},{"type":"paragraph","content":[{"type":"text","text":"عرض الفكرة المركزية للمقال بوضوح."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"الحجج المؤيدة"}]},{"type":"paragraph","content":[{"type":"text","text":"الأدلة والبراهين التي تدعم وجهة النظر."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"الحجج المعارضة"}]},{"type":"paragraph","content":[{"type":"text","text":"استعراض وجهات النظر المخالفة والرد عليها."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"الخلاصة"}]},{"type":"paragraph","content":[{"type":"text","text":"تلخيص الموقف والتوصيات."}]}]',
  'opinion'
),
(
  'قصة بيانات',
  'Data Story',
  'قالب للمقالات المعتمدة على البيانات والإحصاءات',
  '[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"الرقم الرئيسي"}]},{"type":"paragraph","content":[{"type":"text","text":"ابدأ بالإحصائية الأكثر تأثيراً وأهمية."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"السياق"}]},{"type":"paragraph","content":[{"type":"text","text":"وضع الرقم في سياقه التاريخي والمقارن."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"التحليل"}]},{"type":"paragraph","content":[{"type":"text","text":"تفسير البيانات وربطها بالاتجاهات العامة."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"المنهجية"}]},{"type":"paragraph","content":[{"type":"text","text":"مصادر البيانات ومنهجية التحليل."}]}]',
  'data'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Auto-update triggers for tables that need them
-- ---------------------------------------------------------------------------

-- Reuse existing update_updated_at_column() function (from earlier migrations)
