import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Advertiser {
  id: string;
  name: string;
  nameEn: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Advertiser {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? null,
    contactName: row.contact_name ?? null,
    contactEmail: row.contact_email ?? null,
    contactPhone: row.contact_phone ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
  };
}

// ─── GET /api/advertisers ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const search = searchParams.get("search") ?? "";

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("advertisers") as any).select("*", { count: "exact" });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const start = (page - 1) * pageSize;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, count, error } = await (query as any)
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
  const advertisers: Advertiser[] = (rows ?? []).map((r: any) => mapRow(r));

  const response: ApiResponse<Advertiser[]> = {
    data: advertisers,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/advertisers ────────────────────────────────────────────────────

const createAdvertiserSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  nameEn: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createAdvertiserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from("advertisers") as any)
    .insert({
      name: data.name,
      name_en: data.nameEn ?? null,
      contact_name: data.contactName ?? null,
      contact_email: data.contactEmail || null,
      contact_phone: data.contactPhone ?? null,
      notes: data.notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  const response: ApiResponse<Advertiser> = { data: mapRow(row) };
  return NextResponse.json(response, { status: 201 });
}
