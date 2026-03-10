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

// GET /api/magazines/[id]/spreads — list all spreads for an issue, ordered by page_number
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("magazine_spreads")
    .select("*")
    .eq("issue_id", id)
    .order("page_number", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const spreads: MagazineSpread[] = (rows ?? []).map((row: Record<string, unknown>) =>
    mapSpreadRow(row)
  );

  return NextResponse.json({ data: spreads } satisfies ApiResponse<MagazineSpread[]>);
}

const createSpreadSchema = z.object({
  pageNumber: z.number().int().min(1),
  templateId: z.string().min(1),
  sectionId: z.string().uuid().optional().nullable(),
});

// POST /api/magazines/[id]/spreads — create a new spread
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const parsed = createSpreadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { pageNumber, templateId, sectionId } = parsed.data;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("magazine_spreads")
    .insert({
      issue_id: id,
      page_number: pageNumber,
      template_id: templateId,
      section_id: sectionId ?? null,
      zones: {},
      metadata: {},
      updated_at: new Date().toISOString(),
      updated_by: auth.userId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: error.code === "23505" ? 409 : 500 } // 23505 = unique violation (duplicate page number)
    );
  }

  return NextResponse.json(
    { data: mapSpreadRow(row) } satisfies ApiResponse<MagazineSpread>,
    { status: 201 }
  );
}
