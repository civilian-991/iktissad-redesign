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
    sentCount: row.sent_count ?? 0,
    failedCount: row.failed_count ?? 0,
    openCount: row.open_count ?? 0,
    clickCount: row.click_count ?? 0,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── HTML renderer for newsletter blocks ─────────────────────────

// Arabic-safe font stack for email clients
const EMAIL_FONT = "'Segoe UI', Tahoma, 'Noto Sans Arabic', Arial, sans-serif";

function renderBlocksToHtml(blocks: import("@/types").NewsletterBlock[], subject: string): string {
  const blocksHtml = blocks.map((block) => {
    const d = block.data;
    switch (block.type) {
      case "headline": {
        const text = String(d.text ?? "");
        const level = Number(d.level ?? 2);
        const tag = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
        const size = level === 1 ? "28px" : level === 3 ? "18px" : "22px";
        return `<${tag} style="font-family:${EMAIL_FONT};color:#183b4e;margin:24px 0 12px;font-size:${size};line-height:1.5;direction:rtl;text-align:right">${text}</${tag}>`;
      }
      case "article_card": {
        const title = String(d.title ?? "");
        const excerpt = String(d.excerpt ?? "");
        const img = d.image
          ? `<img src="${d.image}" alt="${title}" width="600" style="width:100%;height:180px;object-fit:cover;display:block;margin-bottom:12px">`
          : "";
        const link = d.url
          ? `<a href="${d.url}" style="color:#dda853;text-decoration:none;font-weight:bold;font-family:${EMAIL_FONT}">اقرأ المزيد ←</a>`
          : "";
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e5e7eb"><tr><td style="padding:16px;direction:rtl;text-align:right">${img}<h3 style="font-family:${EMAIL_FONT};color:#183b4e;margin:0 0 8px;font-size:18px;line-height:1.5">${title}</h3><p style="font-family:${EMAIL_FONT};color:#6b7280;margin:0 0 12px;line-height:1.8;font-size:16px">${excerpt}</p>${link}</td></tr></table>`;
      }
      case "text":
        return `<p style="font-family:${EMAIL_FONT};color:#374151;line-height:1.85;margin:16px 0;font-size:16px;direction:rtl;text-align:right">${String(d.content ?? "")}</p>`;
      case "cta": {
        const text = String(d.text ?? "اقرأ المزيد");
        const url = String(d.url ?? "#");
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td align="center"><a href="${url}" style="background:#dda853;color:#0a1628;padding:14px 36px;text-decoration:none;font-family:${EMAIL_FONT};font-weight:bold;font-size:16px;display:inline-block">${text}</a></td></tr></table>`;
      }
      case "divider":
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-top:1px solid #e5e7eb;font-size:0;line-height:0">&nbsp;</td></tr></table>`;
      case "image": {
        const url = String(d.url ?? "");
        const alt = String(d.alt ?? "");
        const caption = d.caption
          ? `<p style="font-family:${EMAIL_FONT};color:#9ca3af;font-size:12px;text-align:center;margin:4px 0">${d.caption}</p>`
          : "";
        return url
          ? `<div style="margin:16px 0"><img src="${url}" alt="${alt}" width="600" style="width:100%;max-width:600px;display:block;margin:0 auto">${caption}</div>`
          : "";
      }
      case "upgrade_cta": {
        const headline  = String(d.headline   ?? "احصل على وصول غير محدود");
        const body      = String(d.body       ?? "اشترك في النسخة المميزة.");
        const btnLabel  = String(d.buttonLabel ?? "اشترك الآن");
        const btnUrl    = String(d.buttonUrl   ?? "/subscribe");
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:#183B4E;border:1px solid rgba(221,168,83,0.4);padding:24px;text-align:center;direction:rtl">
  <h3 style="font-family:${EMAIL_FONT};color:#DDA853;margin:0 0 8px;font-size:18px;line-height:1.5">${headline}</h3>
  <p style="font-family:${EMAIL_FONT};color:rgba(245,238,220,0.75);margin:0 0 16px;font-size:14px;line-height:1.8">${body}</p>
  <a href="${btnUrl}" style="background:#DDA853;color:#0a1628;padding:12px 28px;text-decoration:none;font-family:${EMAIL_FONT};font-weight:bold;font-size:14px;display:inline-block">${btnLabel}</a>
</td></tr></table>`;
      }
      default:
        return "";
    }
  }).join("\n");

  // Table-based email layout for maximum client compatibility (Outlook, Gmail, Apple Mail)
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Language" content="ar">
<title>${subject}</title>
<!--[if mso]>
<style>body,table,td{font-family:Tahoma,Arial,sans-serif!important}</style>
<![endif]-->
</head>
<body dir="rtl" style="background:#f3f4f6;padding:0;margin:0;font-family:${EMAIL_FONT};direction:rtl;text-align:right;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6">
    <tr><td align="center" style="padding:24px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-collapse:collapse">
        <!-- Header -->
        <tr><td style="background:#0a1628;padding:24px;text-align:center">
          <h1 style="color:#dda853;font-family:${EMAIL_FONT};margin:0;font-size:24px;line-height:1.4;direction:rtl">الإقتصاد والأعمال</h1>
          <p style="color:rgba(221,168,83,0.6);font-family:${EMAIL_FONT};margin:4px 0 0;font-size:12px">AL-IKTISSAD WAL-AAMAL</p>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:24px;direction:rtl;text-align:right">${blocksHtml}</td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="color:#9ca3af;font-size:12px;font-family:${EMAIL_FONT};margin:0;direction:rtl">لإلغاء الاشتراك <a href="{{{unsubscribeUrl}}}" style="color:#dda853">انقر هنا</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── POST /api/newsletters/[id]/send ─────────────────────────────
//
// Sends a newsletter via SendGrid in batches, then writes the final
// status to the DB based on per-batch outcomes:
//   - all batches succeed  → status="sent"
//   - some succeed         → status="partial"
//   - none succeed (and we had recipients) → status="failed"
//
// The DB row is only marked terminal AFTER SendGrid runs so a SendGrid
// crash can never leave us showing "sent" with zero recipients.

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

  // Fetch the full row up front so we have blocks/subject/sender_name for SendGrid.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fullRow, error: fullRowError } = await (admin as any)
    .from("newsletters")
    .select("*")
    .eq("id", id)
    .single();

  if (fullRowError || !fullRow) {
    return NextResponse.json(
      { error: fullRowError?.message ?? "Newsletter not found" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Resolve recipient emails based on segment:
  //   "all" / "free" → active newsletter_subscribers
  //   "premium"      → active paid subscribers (subscribers table)
  let emailRows: { email: string }[] = [];

  if (existing.segment === "premium") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from("subscribers")
      .select("email")
      .eq("status", "active");
    emailRows = data ?? [];
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from("newsletter_subscribers")
      .select("email")
      .eq("status", "active");
    emailRows = data ?? [];
  }

  const emails: string[] = (emailRows ?? [])
    .map((s) => s.email)
    .filter(Boolean);
  const recipientCount = emails.length;

  // Phase 4.4: SendGrid email delivery
  const sgApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? "newsletter@iktissad.com";
  const fromName = (fullRow.sender_name as string) ?? "إكتساد";

  let sentCount = 0;
  let failedCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastError: any = null;
  let sendGridSkipped = false;

  if (!sgApiKey) {
    console.warn("[newsletter/send] SENDGRID_API_KEY not set — skipping email delivery");
    sendGridSkipped = true;
  } else if (recipientCount > 0) {
    try {
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(sgApiKey);

      const html = renderBlocksToHtml(fullRow.blocks ?? [], fullRow.subject as string);
      const BATCH = 1000;

      for (let i = 0; i < emails.length; i += BATCH) {
        const slice = emails.slice(i, i + BATCH);
        try {
          await sgMail.sendMultiple({
            to: slice,
            from: { email: fromEmail, name: fromName },
            subject: fullRow.subject as string,
            html,
          });
          sentCount += slice.length;
        } catch (batchErr) {
          failedCount += slice.length;
          lastError = batchErr;
          console.error(
            `[newsletter/send] SendGrid batch ${i / BATCH} failed (${slice.length} recipients):`,
            batchErr
          );
        }
      }
    } catch (importErr) {
      // Failed before any batch could run — treat all recipients as failed.
      failedCount = recipientCount;
      lastError = importErr;
      console.error("[newsletter/send] SendGrid init error:", importErr);
    }
  }

  // Determine final status based on per-batch outcomes.
  // - No SendGrid key configured or no recipients → "sent" (legacy behaviour;
  //   the route is still considered a successful "send" with 0 recipients).
  // - At least one batch failed AND at least one batch succeeded → "partial".
  // - All batches failed (and we had recipients) → "failed".
  // - All batches succeeded → "sent".
  let finalStatus: Newsletter["status"];
  if (sendGridSkipped || recipientCount === 0) {
    finalStatus = "sent";
  } else if (sentCount === 0) {
    finalStatus = "failed";
  } else if (failedCount > 0) {
    finalStatus = "partial";
  } else {
    finalStatus = "sent";
  }

  // Persist the result.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: updateError } = await (admin as any)
    .from("newsletters")
    .update({
      status: finalStatus,
      sent_at: new Date().toISOString(),
      recipient_count: recipientCount,
      sent_count: sentCount,
      failed_count: failedCount,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !row) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to persist newsletter status" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // If the whole send failed, surface a 500 with the SendGrid error — but the
  // DB row is now consistent (status=failed, sent_count=0, failed_count=N).
  if (finalStatus === "failed") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (lastError && (lastError.code ?? lastError.statusCode)) ?? "SENDGRID_ERROR";
    return NextResponse.json(
      {
        error: `Newsletter send failed: ${code}`,
        data: mapNewsletterRow(row),
      } as ApiResponse<Newsletter> & { error: string },
      { status: 500 }
    );
  }

  const response: ApiResponse<Newsletter> = { data: mapNewsletterRow(row) };
  return NextResponse.json(response);
}
