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

// ─── HTML renderer for newsletter blocks ─────────────────────────

function renderBlocksToHtml(blocks: import("@/types").NewsletterBlock[], subject: string): string {
  const blocksHtml = blocks.map((block) => {
    const d = block.data;
    switch (block.type) {
      case "headline": {
        const text = String(d.text ?? "");
        const level = Number(d.level ?? 2);
        const tag = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
        return `<${tag} style="font-family:Arial,sans-serif;color:#183b4e;margin:24px 0 12px;direction:rtl;text-align:right">${text}</${tag}>`;
      }
      case "article_card": {
        const title = String(d.title ?? "");
        const excerpt = String(d.excerpt ?? "");
        const img = d.image
          ? `<img src="${d.image}" alt="${title}" style="width:100%;height:180px;object-fit:cover;border-radius:8px;display:block;margin-bottom:12px">`
          : "";
        const link = d.url
          ? `<a href="${d.url}" style="color:#dda853;text-decoration:none;font-weight:bold">اقرأ المزيد →</a>`
          : "";
        return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;direction:rtl;text-align:right">${img}<h3 style="font-family:Arial,sans-serif;color:#183b4e;margin:0 0 8px">${title}</h3><p style="font-family:Arial,sans-serif;color:#6b7280;margin:0 0 12px;line-height:1.6">${excerpt}</p>${link}</div>`;
      }
      case "text":
        return `<p style="font-family:Arial,sans-serif;color:#374151;line-height:1.7;margin:16px 0;direction:rtl;text-align:right">${String(d.content ?? "")}</p>`;
      case "cta": {
        const text = String(d.text ?? "اقرأ المزيد");
        const url = String(d.url ?? "#");
        return `<div style="text-align:center;margin:24px 0"><a href="${url}" style="background:#dda853;color:#0a1628;padding:12px 32px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;display:inline-block">${text}</a></div>`;
      }
      case "divider":
        return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">`;
      case "image": {
        const url = String(d.url ?? "");
        const alt = String(d.alt ?? "");
        const caption = d.caption
          ? `<p style="font-family:Arial,sans-serif;color:#9ca3af;font-size:12px;text-align:center;margin:4px 0">${d.caption}</p>`
          : "";
        return url
          ? `<div style="margin:16px 0"><img src="${url}" alt="${alt}" style="width:100%;max-width:600px;display:block;margin:0 auto;border-radius:8px">${caption}</div>`
          : "";
      }
      default:
        return "";
    }
  }).join("\n");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="background:#f3f4f6;padding:24px;margin:0;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:#0a1628;padding:24px;text-align:center">
      <h1 style="color:#dda853;font-family:Arial,sans-serif;margin:0;font-size:24px">إكتساد</h1>
    </div>
    <div style="padding:24px">${blocksHtml}</div>
    <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">لإلغاء الاشتراك <a href="{{{unsubscribeUrl}}}" style="color:#dda853">انقر هنا</a></p>
    </div>
  </div>
</body>
</html>`;
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

  // Phase 4.4: SendGrid email delivery
  const sgApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? "newsletter@iktissad.com";
  const fromName = (row.sender_name as string) ?? "إكتساد";

  if (sgApiKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sgMail = require("@sendgrid/mail");
      sgMail.setApiKey(sgApiKey);

      // Fetch confirmed subscriber emails
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let subQuery = (admin as any)
        .from("newsletter_subscribers")
        .select("email");
      if (existing.segment === "premium") subQuery = subQuery.eq("is_premium", true);
      else if (existing.segment === "free") subQuery = subQuery.eq("is_premium", false);

      const { data: subscribers } = await subQuery;
      const emails: string[] = (subscribers ?? [])
        .map((s: { email: string }) => s.email)
        .filter(Boolean);

      if (emails.length > 0) {
        const html = renderBlocksToHtml(row.blocks ?? [], row.subject as string);
        const BATCH = 1000;
        for (let i = 0; i < emails.length; i += BATCH) {
          await sgMail.sendMultiple({
            to: emails.slice(i, i + BATCH),
            from: { email: fromEmail, name: fromName },
            subject: row.subject as string,
            html,
          });
        }
      }
    } catch (emailErr) {
      // Log but don't fail — DB is already updated to "sent"
      console.error("[newsletter/send] SendGrid error:", emailErr);
    }
  } else {
    console.warn("[newsletter/send] SENDGRID_API_KEY not set — skipping email delivery");
  }

  const response: ApiResponse<Newsletter> = { data: mapNewsletterRow(row) };
  return NextResponse.json(response);
}
