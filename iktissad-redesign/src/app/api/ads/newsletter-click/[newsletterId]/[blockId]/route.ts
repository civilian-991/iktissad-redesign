import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLikelyBot } from "@/lib/ads/bots";
import type { NewsletterBlock } from "@/types";

/**
 * GET /api/ads/newsletter-click/[newsletterId]/[blockId]
 *
 * The sponsor link in a sent newsletter points here. Counts the click against
 * the newsletter's sponsorship, then redirects to the URL stored in that
 * sponsor block (never a URL taken from the request).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ newsletterId: string; blockId: string }> }
) {
  const { newsletterId, blockId } = await params;
  const home = new URL("/", request.url);
  if (!/^[0-9a-f-]{36}$/i.test(newsletterId)) return NextResponse.redirect(home);

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin.from("newsletters") as any)
    .select("blocks")
    .eq("id", newsletterId)
    .maybeSingle();

  const block = ((row?.blocks ?? []) as NewsletterBlock[]).find(
    (b) => b.id === blockId && b.type === "sponsor"
  );
  const url = typeof block?.data.url === "string" ? block.data.url : "";
  if (!/^https?:\/\//i.test(url)) return NextResponse.redirect(home);

  // Mail scanners (link-safety checkers) prefetch every link; skip them.
  if (!isLikelyBot(request.headers.get("user-agent"))) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).rpc("record_ad_event", {
      p_subject_type: "newsletter_sponsor",
      p_subject_id: newsletterId,
      p_placement: "newsletter",
      p_kind: "click",
    });
    if (error) console.error("[ads/newsletter-click]", error.message);
  }

  return NextResponse.redirect(url, { status: 302 });
}
