import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
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

// ─── GET /api/newsletters/[id] ───────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("newsletters")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Newsletter not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  const response: ApiResponse<Newsletter> = { data: mapNewsletterRow(row) };
  return NextResponse.json(response);
}

// ─── PUT /api/newsletters/[id] ───────────────────────────────────

const newsletterBlockSchema = z.object({
  id: z.string(),
  type: z.enum(["headline", "article_card", "text", "quote", "cta", "divider", "image"]),
  data: z.record(z.string(), z.unknown()),
});

const updateNewsletterSchema = z.object({
  title: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  previewText: z.string().nullable().optional(),
  senderName: z.string().optional(),
  segment: z.enum(["all", "premium", "free"]).optional(),
  status: z.enum(["draft", "scheduled", "sent", "cancelled"]).optional(),
  blocks: z.array(newsletterBlockSchema).optional(),
  scheduledAt: z.string().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = updateNewsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // Build update object — only include keys that were provided
  const updatePayload: Record<string, unknown> = {};
  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.subject !== undefined) updatePayload.subject = data.subject;
  if (data.previewText !== undefined) updatePayload.preview_text = data.previewText;
  if (data.senderName !== undefined) updatePayload.sender_name = data.senderName;
  if (data.segment !== undefined) updatePayload.segment = data.segment;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.blocks !== undefined) updatePayload.blocks = data.blocks;
  if (data.scheduledAt !== undefined) updatePayload.scheduled_at = data.scheduledAt;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("newsletters")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: error.code === "PGRST116" ? 404 : 500 }
    );
  }

  const response: ApiResponse<Newsletter> = { data: mapNewsletterRow(row) };
  return NextResponse.json(response);
}

// ─── DELETE /api/newsletters/[id] ────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("newsletters")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const response: ApiResponse<{ deleted: boolean }> = { data: { deleted: true } };
  return NextResponse.json(response);
}
