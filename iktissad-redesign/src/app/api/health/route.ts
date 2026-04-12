import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import packageJson from "../../../../package.json";

interface HealthCheck {
  status: "healthy" | "degraded";
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: { ok: boolean; latencyMs: number; error?: string };
  };
}

export async function GET() {
  const start = performance.now();
  let dbOk = false;
  let dbLatency = 0;
  let dbError: string | undefined;

  try {
    const admin = createAdminClient();
    const dbStart = performance.now();
    const { error } = await admin.from("sections").select("id").limit(1);
    dbLatency = Math.round(performance.now() - dbStart);
    if (error) {
      dbError = error.message;
    } else {
      dbOk = true;
    }
  } catch (e) {
    dbLatency = Math.round(performance.now() - start);
    dbError = e instanceof Error ? e.message : "Unknown database error";
  }

  const healthy = dbOk;

  const body: HealthCheck = {
    status: healthy ? "healthy" : "degraded",
    version: packageJson.version,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        ok: dbOk,
        latencyMs: dbLatency,
        ...(dbError && { error: dbError }),
      },
    },
  };

  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
