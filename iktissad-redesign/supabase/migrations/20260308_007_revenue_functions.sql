-- ═══════════════════════════════════════════════════════════════
-- Revenue Analytics SQL Functions
-- Phase 3B: Revenue & Reading Analytics Dashboards
-- ═══════════════════════════════════════════════════════════════

-- Current MRR: sum of monthly prices for active/trialing subscribers
CREATE OR REPLACE FUNCTION get_current_mrr()
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN s.interval = 'annual' THEN sp.price_annual / 12
      ELSE sp.price_monthly
    END
  ), 0)
  FROM subscribers sub
  JOIN subscription_plans sp ON sub.plan_id = sp.id
  LEFT JOIN (SELECT DISTINCT ON (plan_id) plan_id, interval FROM subscribers WHERE status IN ('active', 'trialing') LIMIT 1) s ON s.plan_id = sub.plan_id
  WHERE sub.status IN ('active', 'trialing');
$$ LANGUAGE sql STABLE;

-- MRR by month (last 12 months)
CREATE OR REPLACE FUNCTION get_mrr_by_month()
RETURNS TABLE(month TEXT, mrr NUMERIC) AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', generate_series), 'YYYY-MM') as month,
    COALESCE((
      SELECT SUM(CASE WHEN interval = 'annual' THEN price_annual/12 ELSE price_monthly END)
      FROM subscribers sub2
      JOIN subscription_plans sp2 ON sub2.plan_id = sp2.id
      WHERE sub2.created_at <= DATE_TRUNC('month', generate_series) + INTERVAL '1 month'
        AND (sub2.canceled_at IS NULL OR sub2.canceled_at > DATE_TRUNC('month', generate_series))
        AND sub2.status IN ('active', 'trialing')
    ), 0) as mrr
  FROM generate_series(
    DATE_TRUNC('month', NOW()) - INTERVAL '11 months',
    DATE_TRUNC('month', NOW()),
    '1 month'
  )
  ORDER BY month;
$$ LANGUAGE sql STABLE;

-- ARPU: Average Revenue Per User
CREATE OR REPLACE FUNCTION get_arpu()
RETURNS NUMERIC AS $$
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE get_current_mrr() / COUNT(*)
  END
  FROM subscribers
  WHERE status IN ('active', 'trialing');
$$ LANGUAGE sql STABLE;

-- Monthly Churn Rate
CREATE OR REPLACE FUNCTION get_monthly_churn_rate()
RETURNS NUMERIC AS $$
  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE status IN ('active', 'trialing', 'canceled')
      AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
      AND created_at < DATE_TRUNC('month', NOW())) = 0 THEN 0
    ELSE (
      COUNT(*) FILTER (WHERE status = 'canceled'
        AND canceled_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        AND canceled_at < DATE_TRUNC('month', NOW()))::NUMERIC /
      COUNT(*) FILTER (WHERE status IN ('active', 'trialing', 'canceled')
        AND created_at < DATE_TRUNC('month', NOW()))::NUMERIC * 100
    )
  END
  FROM subscribers;
$$ LANGUAGE sql STABLE;
