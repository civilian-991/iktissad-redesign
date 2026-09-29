import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adsGuard,
  badRequest,
  serverError,
  mapSponsorshipRow,
  sponsorshipFields,
  sponsorshipToRow,
  SPONSORSHIP_SELECT,
  type SectionSponsorship,
} from "@/lib/ads/admin";
import { findOverlappingSponsorship } from "../overlap";
import type { ApiResponse } from "@/types";

type Params = { params: Promise<{ id: string }> };

// ─── PUT /api/admin/section-sponsorships/[id] ────────────────────────────────

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

  const parsed = sponsorshipFields.partial().safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (admin.from("section_sponsorships") as any)
    .select("section_id, start_date, end_date, active")
    .eq("id", id)
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "Sponsorship not found" } satisfies ApiResponse<never>, { status: 404 });
  }

  // Validate the merged result, not just the fields sent.
  const merged = {
    sectionId: parsed.data.sectionId ?? current.section_id,
    startDate: parsed.data.startDate ?? current.start_date,
    endDate: parsed.data.endDate ?? current.end_date,
    active: parsed.data.active ?? current.active,
  };
  if (merged.endDate < merged.startDate) return badRequest("تاريخ النهاية قبل تاريخ البداية");
  if (merged.active) {
    const clash = await findOverlappingSponsorship(merged.sectionId, merged.startDate, merged.endDate, id);
    if (clash) return NextResponse.json({ error: clash }, { status: 409 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("section_sponsorships") as any)
    .update(sponsorshipToRow(parsed.data))
    .eq("id", id)
    .select(SPONSORSHIP_SELECT)
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data: mapSponsorshipRow(row) } satisfies ApiResponse<SectionSponsorship>);
}

// ─── DELETE /api/admin/section-sponsorships/[id] ─────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("section_sponsorships") as any).delete().eq("id", id);
  if (error) return serverError(error.message);

  return NextResponse.json({ data: null });
}
