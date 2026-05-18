/**
 * Database Health Endpoint
 * GET /api/admin/db-health
 *
 * Returns a snapshot of database health metrics:
 *   - connectionCount     : active server-side connections (from pg_stat_activity)
 *   - slowQueryCount      : queries > 1 s in the last hour via pg_stat_statements
 *                           (stubbed to 0 when the extension is not enabled)
 *   - tableRowCounts      : estimated live row counts for all core tables
 *
 * Requires admin authentication (Supabase Auth session).
 */

import { NextResponse } from "next/server";
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from "@/lib/api-auth"
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

export interface DbHealthPayload {
  connectionCount: number;
  slowQueryCount: number;
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

export async function GET() {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const admin = createAdminClient();

  // ── Connection count ────────────────────────────────────────────────────────
  // pg_stat_activity is accessible via Supabase's pg_meta / rpc. We use a raw
  // RPC call that wraps a simple SQL query. If the RPC function does not exist
  // yet we fall back gracefully.
  let connectionCount = 0;
  try {
    const { data: connData, error: connErr } = await admin.rpc(
      "get_connection_count" as never
    ) as { data: number | null; error: unknown };

    if (!connErr && typeof connData === "number") {
      connectionCount = connData;
    } else {
      // Fallback: count via pg_stat_activity through a SQL query routed as RPC
      // If the RPC isn't defined this will silently stay 0, which is acceptable.
      connectionCount = 0;
    }
  } catch {
    // Extension not available or RPC not defined — non-fatal
    connectionCount = 0;
  }

  // ── Slow query count ─────────────────────────────────────────────────────────
  // Requires pg_stat_statements extension. Stubbed to 0 until it is enabled.
  // To enable: run `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;` in the
  // Supabase SQL editor, then replace this stub with:
  //
  //   const { data } = await admin.rpc("get_slow_query_count_last_hour");
  //
  // where the RPC wraps:
  //   SELECT count(*) FROM pg_stat_statements
  //   WHERE mean_exec_time > 1000 AND ...
  //
  // See: https://supabase.com/docs/guides/platform/performance#query-performance
  const slowQueryCount = 0;

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
    tableRowCounts,
  };

  return NextResponse.json<ApiResponse<DbHealthPayload>>({ data: payload });
}
