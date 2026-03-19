import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapMediaRow } from "@/lib/supabase/mappers";
import type { ApiResponse, MediaItem } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await admin
    .from("media")
    .select("*")
    .eq("id", id)
    .single() as { data: any; error: any };

  if (error || !row) {
    return NextResponse.json(
      { error: "Media item not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<MediaItem> = { data: mapMediaRow(row) };
  return NextResponse.json(response);
}

const updateMediaSchema = z.object({
  alt: z.string().optional(),
  altEn: z.string().optional(),
  folder: z.string().optional(),
  filename: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export async function PUT(
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

  const parsed = updateMediaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (data.alt !== undefined) updateData.alt = data.alt;
  if (data.altEn !== undefined) updateData.alt_en = data.altEn;
  if (data.folder !== undefined) updateData.folder = data.folder;
  if (data.filename !== undefined) updateData.filename = data.filename;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.description !== undefined) updateData.description = data.description;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("media") as any)
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Media item not found" } satisfies ApiResponse<never>,
      { status: error ? 500 : 404 }
    );
  }

  const response: ApiResponse<MediaItem> = { data: mapMediaRow(row) };
  return NextResponse.json(response);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const admin = createAdminClient();
  const { error } = await admin.from("media").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { success: true } });
}
