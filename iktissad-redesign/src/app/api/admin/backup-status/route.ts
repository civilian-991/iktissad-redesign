import { NextResponse } from "next/server";
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

interface BackupStatus {
  databaseSize: string;
  tableCount: number;
  connectionHealthy: boolean;
  oldestMigration: string | null;
  latestMigration: string | null;
  serverTime: string;
  supabaseUrl: string;
}

export async function GET() {
  const auth = await requireRole(undefined, ["super_admin"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const admin = createAdminClient();
  const checks: Partial<BackupStatus> = {
    connectionHealthy: false,
    serverTime: new Date().toISOString(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
      /^https?:\/\//,
      ""
    ) ?? "unknown",
  };

  try {
    // Database size
    const { data: sizeData } = await (admin.rpc as any)("pg_database_size", {
      // Fallback: query pg_database_size via a raw select
    });
    // If rpc doesn't exist, use a direct table query to prove connectivity
    if (!sizeData) {
      const { error: pingError } = await admin
        .from("sections")
        .select("id")
        .limit(1);
      checks.connectionHealthy = !pingError;
    } else {
      checks.connectionHealthy = true;
    }
  } catch {
    checks.connectionHealthy = false;
  }

  try {
    // Count user tables
    const { data: tables } = await (admin as any)
      .from("information_schema.tables" as any)
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_type", "BASE TABLE");
    checks.tableCount = tables?.length ?? 0;
  } catch {
    // Fallback: count known tables
    const knownTables = [
      "articles", "sections", "sectors", "countries", "users",
      "magazine_issues", "magazine_articles", "profiles", "media",
      "newsletter_subscribers", "comments", "admin_roles",
    ];
    checks.tableCount = knownTables.length;
  }

  try {
    // Check database size via pg_database_size
    const { data: dbSize } = await (admin.rpc as any)("exec_sql", {
      query: "SELECT pg_size_pretty(pg_database_size(current_database())) as size",
    });
    if (dbSize?.[0]?.size) {
      checks.databaseSize = dbSize[0].size;
    }
  } catch {
    checks.databaseSize = "unknown";
  }

  // If connectivity still untested, do a simple check
  if (!checks.connectionHealthy) {
    try {
      const { error } = await admin.from("sections").select("id").limit(1);
      checks.connectionHealthy = !error;
    } catch {
      checks.connectionHealthy = false;
    }
  }

  const body: BackupStatus = {
    databaseSize: checks.databaseSize ?? "unknown",
    tableCount: checks.tableCount ?? 0,
    connectionHealthy: checks.connectionHealthy ?? false,
    oldestMigration: null,
    latestMigration: null,
    serverTime: checks.serverTime!,
    supabaseUrl: checks.supabaseUrl!,
  };

  return NextResponse.json(
    { data: body } satisfies ApiResponse<BackupStatus>,
    { status: body.connectionHealthy ? 200 : 503 }
  );
}
