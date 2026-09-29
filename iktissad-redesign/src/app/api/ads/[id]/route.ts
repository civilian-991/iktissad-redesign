import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adsGuard,
  badRequest,
  serverError,
  mapAdRow,
  adSchema,
  adToRow,
  type Ad,
} from "@/lib/ads/admin";
import type { ApiResponse } from "@/types";

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/ads/[id] ────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "read");
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin.from("ads") as any).select("*").eq("id", id).maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Ad not found" } satisfies ApiResponse<never>, { status: 404 });
  }
  return NextResponse.json({ data: mapAdRow(row) } satisfies ApiResponse<Ad>);
}

// ─── PUT /api/ads/[id] ────────────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = adSchema.partial().safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("ads") as any)
    .update(adToRow(parsed.data))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!row) {
    return NextResponse.json({ error: "Ad not found" } satisfies ApiResponse<never>, { status: 404 });
  }
  return NextResponse.json({ data: mapAdRow(row) } satisfies ApiResponse<Ad>);
}

// ─── DELETE /api/ads/[id] ─────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("ads") as any).delete().eq("id", id);
  if (error) return serverError(error.message);

  return NextResponse.json({ data: null });
}
