-- ============================================================
-- Migration 025: Comprehensive RLS + Performance Fixes
-- ============================================================
-- Fixes:
--   1. Enable RLS on 21 tables that have it disabled (ERROR)
--   2. Add correct policies for each table
--   3. Fix subscribers/payments (RLS on, zero policies = locked out)
--   4. Drop overly-permissive USING(true) admin policies (any role)
--   5. Fix auth_rls_initplan: wrap auth.uid() in (SELECT ...)
--   6. Fix 12 functions with mutable search_path (WARN)
--   7. Add missing indexes on 20 unindexed foreign keys (PERF)
-- ============================================================


-- ============================================================
-- 1. ENABLE RLS ON ALL UNPROTECTED TABLES
-- ============================================================

ALTER TABLE public.ad_campaigns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_reads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_sections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_spread_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_spreads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spread_revisions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spread_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks              ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. POLICIES FOR NEWLY PROTECTED TABLES
-- Note: service_role bypasses RLS entirely — all admin API
--       operations go through createAdminClient() which uses
--       the service role key, so no admin policies are needed.
-- ============================================================

-- ── admin_roles ──────────────────────────────────────────────
-- Critical: users can read only their own role entry.
-- All writes are service_role only (admin provisioning).
CREATE POLICY "Users can read own admin role"
  ON public.admin_roles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ── admin_notifications ──────────────────────────────────────
-- Each notification has a recipient_id. Users see only theirs.
CREATE POLICY "Users can read own notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY "Users can mark own notifications read"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

-- ── site_settings ────────────────────────────────────────────
-- Public read (theme, logo, social links etc.). No client writes.
CREATE POLICY "Public can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- ── magazine_sections ────────────────────────────────────────
CREATE POLICY "Public can read magazine sections"
  ON public.magazine_sections FOR SELECT
  USING (true);

-- ── magazine_spreads ─────────────────────────────────────────
CREATE POLICY "Public can read magazine spreads"
  ON public.magazine_spreads FOR SELECT
  USING (true);

-- ── spread_templates ─────────────────────────────────────────
CREATE POLICY "Public can read spread templates"
  ON public.spread_templates FOR SELECT
  USING (true);

-- ── ads ──────────────────────────────────────────────────────
-- Public can see active ads. Impression/click updates via service_role.
CREATE POLICY "Public can read active ads"
  ON public.ads FOR SELECT
  USING (active = true);

-- ── article_reads ────────────────────────────────────────────
-- Authenticated users can log their own reads (subscriber_id may be null for free).
-- anon reads are allowed for INSERT (anonymous reading sessions).
CREATE POLICY "Anyone can insert article reads"
  ON public.article_reads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own article reads"
  ON public.article_reads FOR SELECT
  TO authenticated
  USING (subscriber_id = (SELECT auth.uid()));

-- ── magazine_spread_reads ────────────────────────────────────
CREATE POLICY "Anyone can insert spread reads"
  ON public.magazine_spread_reads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own spread reads"
  ON public.magazine_spread_reads FOR SELECT
  TO authenticated
  USING (subscriber_id = (SELECT auth.uid()));

-- ── comments ─────────────────────────────────────────────────
CREATE POLICY "Public can read approved comments"
  ON public.comments FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Authenticated can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ── Fully service_role-only tables (no client policies needed) ──
-- ad_campaigns, advertisers, article_assignments,
-- article_status_history, audit_log, automation_rules,
-- editorial_notes, promo_codes, spread_revisions,
-- webhook_deliveries, webhooks
-- Enabling RLS with no policies blocks anon/authenticated.
-- service_role continues to have full access.


-- ============================================================
-- 3. FIX SUBSCRIBERS + PAYMENTS (RLS on, zero policies)
-- ============================================================

-- subscribers: authenticated users can read their own record
CREATE POLICY "Users can read own subscription"
  ON public.subscribers FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- payments: authenticated users can read their own payments
-- (payments.subscriber_id references subscribers.id, not auth.uid directly;
--  join through subscribers to verify ownership)
CREATE POLICY "Users can read own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    subscriber_id IN (
      SELECT id FROM public.subscribers
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- ============================================================
-- 4. DROP OVERLY-PERMISSIVE "Admin full access" POLICIES
-- These use USING(true) WITH CHECK(true) with no role restriction,
-- meaning ANY role (including anon) can mutate these tables.
-- service_role handles all admin mutations, so these are not needed.
-- ============================================================

DROP POLICY IF EXISTS "Admin full access articles"           ON public.articles;
DROP POLICY IF EXISTS "Admin full access countries"          ON public.countries;
DROP POLICY IF EXISTS "Admin full access mag_articles"       ON public.magazine_articles;
DROP POLICY IF EXISTS "Admin full access magazines"          ON public.magazine_issues;
DROP POLICY IF EXISTS "Admin full access media"              ON public.media;
DROP POLICY IF EXISTS "Admin full access newsletter"         ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admin full access profiles"           ON public.profiles;
DROP POLICY IF EXISTS "Admin full access sections"           ON public.sections;
DROP POLICY IF EXISTS "Admin full access sectors"            ON public.sectors;
DROP POLICY IF EXISTS "Admin full access users"              ON public.users;

-- newsletters: any authenticated user could mutate any newsletter — restrict to service_role
DROP POLICY IF EXISTS "Authenticated users can delete newsletters" ON public.newsletters;
DROP POLICY IF EXISTS "Authenticated users can insert newsletters" ON public.newsletters;
DROP POLICY IF EXISTS "Authenticated users can update newsletters" ON public.newsletters;

-- article_versions: any authenticated could create versions for any article
DROP POLICY IF EXISTS "Authenticated users can create article versions" ON public.article_versions;

-- Replace with tighter version (only for own article context — service_role handles admin)
CREATE POLICY "Authenticated can create article versions"
  ON public.article_versions FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = (SELECT auth.uid()));


-- ============================================================
-- 5. FIX auth_rls_initplan — wrap auth.uid() in (SELECT ...)
-- This makes auth.uid() evaluate once per query instead of per row.
-- ============================================================

-- bookmarks
DROP POLICY IF EXISTS "Users can view their own bookmarks"   ON public.bookmarks;
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;

CREATE POLICY "Users can view their own bookmarks"
  ON public.bookmarks FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own bookmarks"
  ON public.bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own bookmarks"
  ON public.bookmarks FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- article_versions
DROP POLICY IF EXISTS "Version creator can update their version" ON public.article_versions;

CREATE POLICY "Version creator can update their version"
  ON public.article_versions FOR UPDATE
  TO authenticated
  USING (changed_by = (SELECT auth.uid()));

-- preview_tokens
DROP POLICY IF EXISTS "Creators can delete their own tokens" ON public.preview_tokens;

CREATE POLICY "Creators can delete their own tokens"
  ON public.preview_tokens FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));


-- ============================================================
-- 6. FIX FUNCTION SEARCH PATHS
-- Prevents search_path injection attacks.
-- ============================================================

ALTER FUNCTION public.find_similar_articles(uuid, integer)   SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_sections_with_counts()             SET search_path = public, pg_catalog;
ALTER FUNCTION public.search_articles_hybrid(text, integer, integer) SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_article_search_vector()         SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_countries_with_counts()            SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_current_mrr()                      SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_monthly_churn_rate()               SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_article_series_updated_at()     SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_arpu()                             SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_updated_at_column()             SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_mrr_by_month()                     SET search_path = public, pg_catalog;
ALTER FUNCTION public.trigger_set_updated_at()               SET search_path = public, pg_catalog;


-- ============================================================
-- 7. ADD MISSING INDEXES ON UNINDEXED FOREIGN KEYS
-- 30 FK columns with no index — causes seq scans on joins.
-- ============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ads_campaign_id             ON public.ads (campaign_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ads_issue_id                ON public.ads (issue_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_article_assignments_article ON public.article_assignments (article_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_article_assignments_assignee ON public.article_assignments (assignee_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_article_assignments_by      ON public.article_assignments (assigned_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_article_reads_subscriber    ON public.article_reads (subscriber_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_article_series_created_by   ON public.article_series (created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_article_status_article      ON public.article_status_history (article_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_article_status_changed_by   ON public.article_status_history (changed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_article_versions_changed_by ON public.article_versions (changed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_id            ON public.comments (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_parent_id          ON public.comments (parent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_moderated_by       ON public.comments (moderated_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_editorial_notes_author      ON public.editorial_notes (author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_editorial_notes_resolved_by ON public.editorial_notes (resolved_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magazine_sections_issue     ON public.magazine_sections (issue_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spread_reads_subscriber     ON public.magazine_spread_reads (subscriber_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magazine_spreads_section    ON public.magazine_spreads (section_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magazine_spreads_updated_by ON public.magazine_spreads (updated_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_uploaded_by           ON public.media (uploaded_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_newsletters_created_by      ON public.newsletters (created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_plan_id            ON public.payments (plan_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preview_tokens_created_by   ON public.preview_tokens (created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promo_codes_created_by      ON public.promo_codes (created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spread_revisions_spread     ON public.spread_revisions (spread_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spread_revisions_saved_by   ON public.spread_revisions (saved_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscribers_user_id         ON public.subscribers (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscribers_promo_code      ON public.subscribers (promo_code_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ad_campaigns_advertiser     ON public.ad_campaigns (advertiser_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_roles_invited_by      ON public.admin_roles (invited_by);
