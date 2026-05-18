/**
 * API Route: /api/admin/calendar
 *
 * Returns articles in a date range for the editorial calendar.
 * Supports month-based queries (?year=2026&month=3) or explicit
 * range queries (?start=ISO&end=ISO).
 *
 * Each CalendarArticle has: id, title, status, section, date (ISO string).
 * - published/scheduled/review articles use published_at as their date.
 * - drafts without published_at fall back to created_at.
 */

import { NextRequest, NextResponse } from "next/server";
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from "@/lib/api-auth"
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

export interface CalendarArticle {
  id: string;
  title: string;
  status: "draft" | "review" | "scheduled" | "published";
  section: string | null;
  author: string | null;
  date: string; // ISO date string — the effective calendar date
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(undefined, ["super_admin", "editor"]);
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const sp = request.nextUrl.searchParams;

  let startISO: string;
  let endISO: string;

  if (sp.has("start") && sp.has("end")) {
    startISO = sp.get("start")!;
    endISO = sp.get("end")!;
  } else {
    const year = parseInt(sp.get("year") ?? String(new Date().getFullYear()), 10);
    const month = parseInt(sp.get("month") ?? String(new Date().getMonth() + 1), 10);

    // Build UTC start/end for the requested month with one week of padding on
    // each side so the calendar can render leading/trailing cells correctly.
    const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const lastOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Expand by 6 days each side to cover leading/trailing calendar cells
    const rangeStart = new Date(firstOfMonth);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 6);

    const rangeEnd = new Date(lastOfMonth);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 6);

    startISO = rangeStart.toISOString();
    endISO = rangeEnd.toISOString();
  }

  const admin = createAdminClient();

  // Fetch articles whose published_at falls in range
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: publishedRows, error: publishedError } = await (admin.from("articles") as any)
    .select("id, title, status, sections:section_id ( name ), users:author_id ( name ), published_at, created_at")
    .gte("published_at", startISO)
    .lte("published_at", endISO)
    .order("published_at", { ascending: true })
    .limit(500);

  if (publishedError) {
    return NextResponse.json(
      { error: publishedError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Fetch drafts without a published_at whose created_at falls in range
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: draftRows, error: draftError } = await (admin.from("articles") as any)
    .select("id, title, status, sections:section_id ( name ), users:author_id ( name ), published_at, created_at")
    .is("published_at", null)
    .eq("status", "draft")
    .gte("created_at", startISO)
    .lte("created_at", endISO)
    .order("created_at", { ascending: true })
    .limit(200);

  if (draftError) {
    return NextResponse.json(
      { error: draftError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRow = (row: any): CalendarArticle => ({
    id: row.id,
    title: row.title ?? "",
    status: row.status as CalendarArticle["status"],
    section: row.sections?.name ?? null,
    author: row.users?.name ?? null,
    date: (row.published_at ?? row.created_at) as string,
  });

  const articles: CalendarArticle[] = [
    ...(publishedRows ?? []).map(mapRow),
    ...(draftRows ?? []).map(mapRow),
  ];

  // Deduplicate by id (published query could theoretically overlap with drafts
  // if a draft had a published_at set for some reason)
  const seen = new Set<string>();
  const unique = articles.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  const response: ApiResponse<CalendarArticle[]> = { data: unique };
  return NextResponse.json(response);
}
