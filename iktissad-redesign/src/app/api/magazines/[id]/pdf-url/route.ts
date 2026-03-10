import { NextRequest, NextResponse } from "next/server";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

/**
 * GET /api/magazines/[id]/pdf-url
 *
 * Returns a signed Supabase Storage URL for the magazine PDF (1-hour TTL).
 *
 * Requirements:
 * 1. User must be authenticated
 * 2. User must have an active or trialing subscription
 *
 * The PDF path is derived from the magazine_issues.pdf_url column.
 * We expect pdf_url to be stored as either:
 *   - A full Supabase Storage URL (we extract the path)
 *   - A relative path within the "magazines" bucket (e.g., "issues/123/magazine.pdf")
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const MAGAZINE_BUCKET = "magazines";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Require authentication
  const auth = await requireAuthFromRequest(request);
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json(
      { error: "Authentication required" } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }

  const supabase = await createClient();

  // 2. Check active or trialing subscription
  // We look up the subscriber by user_id (linked during signup)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscriberRows } = await (supabase as any)
    .from("subscribers")
    .select("id, status")
    .eq("user_id", auth.userId)
    .in("status", ["active", "trialing"])
    .limit(1);

  if (!subscriberRows || subscriberRows.length === 0) {
    return NextResponse.json(
      { error: "Active subscription required to access magazine PDFs" } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  // 3. Fetch the magazine issue to get the PDF path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issue, error: issueError } = await (supabase as any)
    .from("magazine_issues")
    .select("id, pdf_url, title, status")
    .eq("id", id)
    .single();

  if (issueError || !issue) {
    return NextResponse.json(
      { error: "Magazine issue not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  if (!issue.pdf_url) {
    return NextResponse.json(
      { error: "No PDF available for this issue" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // 4. Extract the storage path from the pdf_url
  // The pdf_url may be stored as a full URL or as a bucket-relative path.
  // Pattern: extract everything after "/magazines/" if it's a full Supabase URL.
  let storagePath: string = issue.pdf_url;

  // If it looks like a full URL, extract the path within the bucket
  if (storagePath.startsWith("http")) {
    // Supabase Storage URLs follow the pattern:
    // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const bucketMarker = `/object/public/${MAGAZINE_BUCKET}/`;
    const markerIdx = storagePath.indexOf(bucketMarker);
    if (markerIdx !== -1) {
      storagePath = storagePath.slice(markerIdx + bucketMarker.length);
    } else {
      // Could not parse path — return error
      return NextResponse.json(
        { error: "Could not determine PDF storage path" } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }
  }

  // 5. Generate a signed URL via Supabase Storage
  const { data: signedData, error: signedError } = await supabase.storage
    .from(MAGAZINE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (signedError || !signedData?.signedUrl) {
    console.error("[pdf-url] Failed to create signed URL:", signedError?.message);
    return NextResponse.json(
      { error: "Failed to generate PDF access URL" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();

  const response: ApiResponse<{ url: string; expiresAt: string }> = {
    data: {
      url: signedData.signedUrl,
      expiresAt,
    },
  };

  return NextResponse.json(response);
}
