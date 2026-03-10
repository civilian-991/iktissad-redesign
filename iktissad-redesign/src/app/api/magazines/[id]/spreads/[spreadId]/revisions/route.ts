import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse, SpreadRevision } from "@/types";

function mapRevisionRow(row: Record<string, unknown>): SpreadRevision {
  return {
    id: row.id as string,
    spreadId: row.spread_id as string,
    snapshot: (row.snapshot as Record<string, unknown>) ?? {},
    savedAt: row.saved_at as string,
    savedBy: (row.saved_by as string) ?? null,
    label: (row.label as string) ?? null,
  };
}

// GET /api/magazines/[id]/spreads/[spreadId]/revisions
// Returns list of revisions (newest first)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; spreadId: string }> }
) {
  const { spreadId } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("spread_revisions")
    .select("id, spread_id, snapshot, saved_at, saved_by, label")
    .eq("spread_id", spreadId)
    .order("saved_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const revisions: SpreadRevision[] = (rows ?? []).map((row: Record<string, unknown>) =>
    mapRevisionRow(row)
  );

  return NextResponse.json({ data: revisions } satisfies ApiResponse<SpreadRevision[]>);
}

const saveRevisionSchema = z.object({
  label: z.string().min(1).max(200),
});

// POST /api/magazines/[id]/spreads/[spreadId]/revisions
// Save a named revision (snapshot of current zones)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; spreadId: string }> }
) {
  const { spreadId } = await params;

  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = saveRevisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Fetch current spread zones to snapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: spread, error: spreadError } = await (admin as any)
    .from("magazine_spreads")
    .select("zones")
    .eq("id", spreadId)
    .single();

  if (spreadError || !spread) {
    return NextResponse.json(
      { error: "Spread not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("spread_revisions")
    .insert({
      spread_id: spreadId,
      snapshot: spread.zones ?? {},
      saved_at: new Date().toISOString(),
      saved_by: auth.userId ?? null,
      label: parsed.data.label,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: mapRevisionRow(row) } satisfies ApiResponse<SpreadRevision>,
    { status: 201 }
  );
}
