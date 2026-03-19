import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse, Newsletter, NewsletterBlock } from "@/types";

// ─── Row → Frontend mapper ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNewsletterRow(row: any): Newsletter {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    previewText: row.preview_text ?? null,
    senderName: row.sender_name ?? "إكتساد",
    segment: row.segment,
    status: row.status,
    blocks: (row.blocks ?? []) as NewsletterBlock[],
    scheduledAt: row.scheduled_at ?? null,
    sentAt: row.sent_at ?? null,
    recipientCount: row.recipient_count ?? null,
    openCount: row.open_count ?? 0,
    clickCount: row.click_count ?? 0,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── POST /api/newsletters/[id]/send ─────────────────────────────
//
// Marks the newsletter as sent and records sent_at + recipient_count.
// Actual email delivery via Resend is a future step — this route only
// updates the DB record so the UI can reflect the "sent" state immediately.

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;
  const admin = createAdminClient();

  // Verify the newsletter exists and is not already sent/cancelled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchError } = await (admin as any)
    .from("newsletters")
    .select("id, status, segment")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Newsletter not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  if (existing.status === "sent") {
    return NextResponse.json(
      { error: "Newsletter has already been sent" } satisfies ApiResponse<never>,
      { status: 409 }
    );
  }

  if (existing.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot send a cancelled newsletter" } satisfies ApiResponse<never>,
      { status: 409 }
    );
  }

  // Count eligible recipients from newsletter_subscribers table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recipientQuery = (admin as any)
    .from("newsletter_subscribers")
    .select("id", { count: "exact", head: true });

  // Filter by segment if not "all"
  if (existing.segment === "premium") {
    recipientQuery = recipientQuery.eq("is_premium", true);
  } else if (existing.segment === "free") {
    recipientQuery = recipientQuery.eq("is_premium", false);
  }

  const { count: recipientCount } = await recipientQuery;

  // Update the newsletter to "sent"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: updateError } = await (admin as any)
    .from("newsletters")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      recipient_count: recipientCount ?? 0,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // TODO (Phase 4.4): trigger actual Resend email delivery here
  // e.g. await sendNewsletterViaResend(row, recipients);

  const response: ApiResponse<Newsletter> = { data: mapNewsletterRow(row) };
  return NextResponse.json(response);
}
