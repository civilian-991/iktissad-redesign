/**
 * Database Health Endpoint
 * GET /api/admin/db-health
 *
 * Returns a snapshot of database health metrics:
 *   - connectionCount         : active server-side connections (from pg_stat_activity)
 *   - slowQueryCount          : count of queries above the 1s threshold (pg_stat_statements)
 *   - slowQueries             : top 5 slow queries (query/mean_ms/calls) for admin UI
 *   - pgStatStatementsEnabled : whether pg_stat_statements RPC is callable
 *   - tableRowCounts          : estimated live row counts for all core tables
 *
 * Requires admin authentication (Supabase Auth session).
 *
 * Backing RPCs (see supabase/migrations/20260518_039_db_health_rpc.sql):
 *   - get_connection_count() -> int
 *   - get_slow_queries(threshold_ms int) -> table(query text, mean_ms double precision, calls bigint)
 *
 * If pg_stat_statements is not enabled in the Supabase project, the
 * slow-query RPC will throw; we catch and return null for the slow-query
 * fields rather than failing the whole endpoint.
 */

import { NextResponse } from "next/server";
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from "@/lib/api-auth"
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

export interface SlowQuery {
  query: string;
  meanMs: number;
  calls: number;
}

export interface DbHealthPayload {
  connectionCount: number | null;
  slowQueryCount: number | null;
  slowQueries: SlowQuery[] | null;
  pgStatStatementsEnabled: boolean;
  tableRowCounts: Record<string, number>;
}

// Core tables to report row counts for
const TRACKED_TABLES = [
  "articles",
  "sections",
  "sectors",
  "countries",
  "users",
  "profiles",
  "magazine_issues",
  "magazine_articles",
  "media",
  "newsletter_subscribers",
  "article_reads",
  "magazine_spread_reads",
] as const;

const SLOW_QUERY_THRESHOLD_MS = 1000;

export async function GET() {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const admin = createAdminClient();

  // ── Connection count ────────────────────────────────────────────────────────
  // Calls the get_connection_count() RPC which wraps pg_stat_activity.
  let connectionCount: number | null = null;
  try {
    const { data, error } = (await admin.rpc(
      "get_connection_count" as never
    )) as { data: number | null; error: unknown };

    if (!error && typeof data === "number") {
      connectionCount = data;
    }
  } catch {
    // RPC missing or DB unreachable — leave as null
    connectionCount = null;
  }

  // ── Slow queries (pg_stat_statements) ───────────────────────────────────────
  // The get_slow_queries() RPC requires pg_stat_statements. If the extension
  // is not enabled the RPC will error — we degrade gracefully.
  let slowQueryCount: number | null = null;
  let slowQueries: SlowQuery[] | null = null;
  let pgStatStatementsEnabled = false;

  try {
    const { data, error } = (await admin.rpc(
      "get_slow_queries" as never,
      { threshold_ms: SLOW_QUERY_THRESHOLD_MS } as never
    )) as {
      data: Array<{ query: string; mean_ms: number; calls: number }> | null;
      error: unknown;
    };

    if (!error && Array.isArray(data)) {
      pgStatStatementsEnabled = true;
      slowQueryCount = data.length;
      slowQueries = data.slice(0, 5).map((row) => ({
        query: row.query,
        meanMs: row.mean_ms,
        calls: row.calls,
      }));
    }
  } catch {
    // pg_stat_statements not enabled or RPC missing — keep nulls
    pgStatStatementsEnabled = false;
    slowQueryCount = null;
    slowQueries = null;
  }

  // ── Table row counts ─────────────────────────────────────────────────────────
  // pg_stat_user_tables.n_live_tup gives cheap estimated counts without a
  // full sequential scan. We prefer this over COUNT(*) for health checks.
  // The Supabase admin client bypasses RLS, so we can safely query this view.
  const tableRowCounts: Record<string, number> = {};

  // Fetch all row count estimates in a single query via rpc / raw postgres.
  // Supabase exposes the information_schema but not pg_stat_user_tables via
  // the standard PostgREST API. We fall back to individual COUNT(*) queries
  // for each table using HEAD requests (which are cheap for small tables and
  // acceptable for periodic health checks).
  await Promise.all(
    TRACKED_TABLES.map(async (table) => {
      try {
        const { count } = await admin
          .from(table as Parameters<typeof admin.from>[0])
          .select("id", { count: "exact", head: true });
        tableRowCounts[table] = count ?? 0;
      } catch {
        tableRowCounts[table] = -1; // -1 signals "unavailable"
      }
    })
  );

  const payload: DbHealthPayload = {
    connectionCount,
    slowQueryCount,
    slowQueries,
    pgStatStatementsEnabled,
    tableRowCounts,
  };

  return NextResponse.json<ApiResponse<DbHealthPayload>>({ data: payload });
}
