/**
 * POST /api/headline-test-track
 *
 * Public endpoint — tracks impressions and clicks for headline A/B tests.
 * Cookie-based consistent variant assignment (ikt_ab_<testId> = variantIndex).
 *
 * GET  /api/headline-test-track?articleId=... — Get assigned variant for article
 * POST /api/headline-test-track — Record impression or click
 *
 * Body: { testId, action: 'impression' | 'click' }
 * Tables: headline_tests (SELECT + UPDATE variants JSONB)
 * Auth: None (public tracking)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

// ─── GET: Resolve which variant to show ──────────────────────────

export async function GET(request: NextRequest) {
  const articleId = request.nextUrl.searchParams.get("articleId");
  if (!articleId) {
    return NextResponse.json({ error: "articleId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find active test for this article
  const { data: test } = await (admin as any)
    .from("headline_tests")
    .select("id, variants, status")
    .eq("article_id", articleId)
    .eq("status", "running")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!test) {
    return NextResponse.json({ data: { active: false } });
  }

  const variants = test.variants as Array<{ title: string; impressions: number; clicks: number }>;

  // Check cookie for consistent assignment
  const cookieStore = await cookies();
  const cookieKey = `ikt_ab_${test.id}`;
  const existing = cookieStore.get(cookieKey);

  let variantIndex: number;
  if (existing) {
    variantIndex = parseInt(existing.value, 10);
    if (isNaN(variantIndex) || variantIndex < 0 || variantIndex >= variants.length) {
      variantIndex = Math.floor(Math.random() * variants.length);
    }
  } else {
    // Random assignment
    variantIndex = Math.floor(Math.random() * variants.length);
  }

  const response = NextResponse.json({
    data: {
      active: true,
      testId: test.id,
      variantIndex,
      title: variants[variantIndex]?.title ?? "",
    },
  });

  // Set cookie for consistent assignment (30 day expiry)
  response.cookies.set(cookieKey, String(variantIndex), {
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    sameSite: "lax",
  });

  return response;
}

// ─── POST: Track impression or click ─────────────────────────────

export async function POST(request: NextRequest) {
  let body: { testId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { testId, action } = body;
  if (!testId || !action || !["impression", "click"].includes(action)) {
    return NextResponse.json(
      { error: "testId and action (impression|click) required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Get current test
  const { data: test, error: fetchErr } = await (admin as any)
    .from("headline_tests")
    .select("id, variants, status, min_sample, winner_index")
    .eq("id", testId)
    .single();

  if (fetchErr || !test || test.status !== "running") {
    return NextResponse.json({ data: { ok: true, skipped: true } });
  }

  // Get variant index from cookie
  const cookieStore = await cookies();
  const cookieKey = `ikt_ab_${testId}`;
  const variantCookie = cookieStore.get(cookieKey);

  if (!variantCookie) {
    return NextResponse.json({ data: { ok: true, skipped: true } });
  }

  const variantIndex = parseInt(variantCookie.value, 10);
  const variants = [...(test.variants as Array<{ title: string; impressions: number; clicks: number }>)];

  if (variantIndex < 0 || variantIndex >= variants.length) {
    return NextResponse.json({ data: { ok: true, skipped: true } });
  }

  // Increment counter
  if (action === "impression") {
    variants[variantIndex].impressions += 1;
  } else {
    variants[variantIndex].clicks += 1;
  }

  // Check for auto-completion (all variants have >= minSample impressions)
  const minSample = test.min_sample ?? 1000;
  const allAboveMin = variants.every((v) => v.impressions >= minSample);

  const updateData: Record<string, unknown> = { variants };

  if (allAboveMin && test.winner_index === null) {
    // Pick winner by highest CTR
    let bestIdx = 0;
    let bestCtr = 0;
    for (let i = 0; i < variants.length; i++) {
      const ctr = variants[i].impressions > 0
        ? variants[i].clicks / variants[i].impressions
        : 0;
      if (ctr > bestCtr) {
        bestCtr = ctr;
        bestIdx = i;
      }
    }
    updateData.status = "completed";
    updateData.winner_index = bestIdx;
    updateData.completed_at = new Date().toISOString();
  }

  // Update test
  void (admin as any)
    .from("headline_tests")
    .update(updateData)
    .eq("id", testId)
    .then(() => {});

  return NextResponse.json({ data: { ok: true } });
}
