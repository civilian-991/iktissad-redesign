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

// ─── GET /api/newsletters ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const status = searchParams.get("status");

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("newsletters")
    .select("*", { count: "exact" });

  if (status) {
    query = query.eq("status", status);
  }

  const start = (page - 1) * pageSize;
  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const total = count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newsletters: Newsletter[] = (rows ?? []).map((r: any) => mapNewsletterRow(r));

  const response: ApiResponse<Newsletter[]> = {
    data: newsletters,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/newsletters ───────────────────────────────────────

const newsletterBlockSchema = z.object({
  id: z.string(),
  type: z.enum(["headline", "article_card", "text", "quote", "cta", "divider", "image"]),
  data: z.record(z.string(), z.unknown()),
});

const createNewsletterSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  subject: z.string().min(1, "سطر الموضوع مطلوب"),
  previewText: z.string().optional().nullable(),
  senderName: z.string().optional().default("إكتساد"),
  segment: z.enum(["all", "premium", "free"]).default("all"),
  status: z.enum(["draft", "scheduled", "sent", "cancelled"]).default("draft"),
  blocks: z.array(newsletterBlockSchema).default([]),
  scheduledAt: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createNewsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("newsletters")
    .insert({
      title: data.title,
      subject: data.subject,
      preview_text: data.previewText ?? null,
      sender_name: data.senderName,
      segment: data.segment,
      status: data.status,
      blocks: data.blocks,
      scheduled_at: data.scheduledAt ?? null,
      created_by: auth.userId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const newsletter = mapNewsletterRow(row);
  const response: ApiResponse<Newsletter> = { data: newsletter };
  return NextResponse.json(response, { status: 201 });
}
