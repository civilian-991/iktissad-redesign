-- Migration: db-health RPCs
-- Adds RPC functions used by /api/admin/db-health to surface active
-- connection counts and slow-query stats. Requires pg_stat_statements
-- to be enabled in the Supabase project for slow-query data.
--
-- NOTE: pg_stat_statements is not enabled by default on Supabase. The
-- project admin must enable it via the Supabase Dashboard:
--   Database -> Extensions -> search "pg_stat_statements" -> Enable
-- Until then, get_slow_queries() will raise an error and the API route
-- will degrade gracefully (returning null + pgStatStatementsEnabled: false).

create extension if not exists pg_stat_statements;

-- Active connection count from pg_stat_activity.
create or replace function get_connection_count()
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from pg_stat_activity
  where state = 'active';
$$;

-- Top slow queries from pg_stat_statements above a configurable threshold (ms).
create or replace function get_slow_queries(threshold_ms int default 1000)
returns table(query text, mean_ms double precision, calls bigint)
language sql
security definer
set search_path = public, extensions
as $$
  select query, mean_exec_time, calls
  from pg_stat_statements
  where mean_exec_time > threshold_ms
  order by mean_exec_time desc
  limit 50;
$$;

grant execute on function get_connection_count() to authenticated;
grant execute on function get_slow_queries(int) to authenticated;
