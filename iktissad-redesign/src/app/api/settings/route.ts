import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const supabase = await createClient();

  const { data: rows, error } = await (supabase as any)
    .from("site_settings")
    .select("key, value");

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { error: error.message },
      { status: 500 }
    );
  }

  // Merge all rows into a single object keyed by setting group
  const settings: Record<string, unknown> = {};
  for (const row of rows ?? []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json<ApiResponse<Record<string, unknown>>>({ data: settings });
}

const putSchema = z.object({
  key: z.string().min(1),
  value: z.record(z.string(), z.unknown()),
});

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<never>>(
      { error: parsed.error.message },
      { status: 400 }
    );
  }

  const { key, value } = parsed.data;
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("site_settings")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<{ key: string }>>({ data: { key } });
}
