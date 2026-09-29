import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adsGuard,
  badRequest,
  serverError,
  mapSponsorshipRow,
  sponsorshipSchema,
  sponsorshipToRow,
  SPONSORSHIP_SELECT,
  type SectionSponsorship,
} from "@/lib/ads/admin";
import { findOverlappingSponsorship } from "./overlap";
import type { ApiResponse } from "@/types";

export type { SectionSponsorship };

// ─── GET /api/admin/section-sponsorships ─────────────────────────────────────

export async function GET(request: NextRequest) {
  const denied = await adsGuard(request, "read");
  if (denied) return denied;

  const advertiserId = request.nextUrl.searchParams.get("advertiser_id");
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from("section_sponsorships") as any).select(SPONSORSHIP_SELECT);
  if (advertiserId) query = query.eq("advertiser_id", advertiserId);

  const { data: rows, error } = await query.order("start_date", { ascending: false }).limit(200);
  if (error) return serverError(error.message);

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (rows ?? []).map((r: any) => mapSponsorshipRow(r)),
  } satisfies ApiResponse<SectionSponsorship[]>);
}

// ─── POST /api/admin/section-sponsorships ────────────────────────────────────

export async function POST(request: NextRequest) {
  const denied = await adsGuard(request, "write");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = sponsorshipSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(", "));

  const d = parsed.data;
  // The rate card sells a section to one sponsor at a time.
  if (d.active !== false) {
    const clash = await findOverlappingSponsorship(d.sectionId, d.startDate, d.endDate);
    if (clash) return NextResponse.json({ error: clash }, { status: 409 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("section_sponsorships") as any)
    .insert(sponsorshipToRow(d))
    .select(SPONSORSHIP_SELECT)
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json(
    { data: mapSponsorshipRow(row) } satisfies ApiResponse<SectionSponsorship>,
    { status: 201 }
  );
}
