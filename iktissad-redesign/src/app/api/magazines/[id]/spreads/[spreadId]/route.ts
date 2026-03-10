import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse, MagazineSpread } from "@/types";

function mapSpreadRow(row: Record<string, unknown>): MagazineSpread {
  return {
    id: row.id as string,
    issueId: row.issue_id as string,
    sectionId: (row.section_id as string) ?? null,
    pageNumber: row.page_number as number,
    templateId: row.template_id as string,
    zones: (row.zones as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    updatedAt: row.updated_at as string,
    updatedBy: (row.updated_by as string) ?? null,
  };
}

// GET /api/magazines/[id]/spreads/[spreadId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; spreadId: string }> }
) {
  const { spreadId } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("magazine_spreads")
    .select("*")
    .eq("id", spreadId)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Spread not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  return NextResponse.json({ data: mapSpreadRow(row) } satisfies ApiResponse<MagazineSpread>);
}

const updateSpreadSchema = z.object({
  zones: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  templateId: z.string().optional(),
  sectionId: z.string().uuid().nullable().optional(),
  pageNumber: z.number().int().min(1).optional(),
});

// PUT /api/magazines/[id]/spreads/[spreadId]
// Upserts a spread_revisions entry (snapshot of old zones) on every save
export async function PUT(
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

  const parsed = updateSpreadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Fetch current state for revision snapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (admin as any)
    .from("magazine_spreads")
    .select("zones, updated_by")
    .eq("id", spreadId)
    .single();

  // If we have existing zones data, create an auto-revision snapshot
  if (current?.zones && Object.keys(current.zones as Record<string, unknown>).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("spread_revisions").insert({
      spread_id: spreadId,
      snapshot: current.zones,
      saved_at: new Date().toISOString(),
      saved_by: auth.userId ?? null,
      label: null, // auto-save revision has no label
    });
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: auth.userId ?? null,
  };

  if (parsed.data.zones !== undefined) updatePayload.zones = parsed.data.zones;
  if (parsed.data.metadata !== undefined) updatePayload.metadata = parsed.data.metadata;
  if (parsed.data.templateId !== undefined) updatePayload.template_id = parsed.data.templateId;
  if (parsed.data.sectionId !== undefined) updatePayload.section_id = parsed.data.sectionId;
  if (parsed.data.pageNumber !== undefined) updatePayload.page_number = parsed.data.pageNumber;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("magazine_spreads")
    .update(updatePayload)
    .eq("id", spreadId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: mapSpreadRow(row) } satisfies ApiResponse<MagazineSpread>);
}

// DELETE /api/magazines/[id]/spreads/[spreadId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; spreadId: string }> }
) {
  const { spreadId } = await params;

  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const admin = createAdminClient();

  // Cascade delete revisions first (in case FK constraint isn't ON DELETE CASCADE in DB)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("spread_revisions").delete().eq("spread_id", spreadId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("magazine_spreads")
    .delete()
    .eq("id", spreadId);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deleted: true } } satisfies ApiResponse<{ deleted: boolean }>);
}
