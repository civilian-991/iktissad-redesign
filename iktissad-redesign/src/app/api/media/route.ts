import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapMediaRow } from "@/lib/supabase/mappers";
import type { ApiResponse, MediaItem } from "@/types";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const folder = searchParams.get("folder");
  const mimeType = searchParams.get("type");
  const search = searchParams.get("search");
  const tag = searchParams.get("tag");

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = admin.from("media").select("*", { count: "exact" }) as any;

  if (folder) query = query.eq("folder", folder);
  if (mimeType) query = query.ilike("mime_type", `${mimeType}%`);
  if (search) query = query.ilike("description", `%${search}%`);
  if (tag) query = query.contains("tags", JSON.stringify([tag]));

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
  const media: MediaItem[] = (rows ?? []).map((r: any) => mapMediaRow(r));

  const response: ApiResponse<MediaItem[]> = {
    data: media,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return NextResponse.json(response);
}

const createMediaSchema = z.object({
  url: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().optional().default(""),
  size: z.number().int().optional().default(0),
  alt: z.string().optional().default(""),
  altEn: z.string().optional().default(""),
  folder: z.string().optional().default(""),
  uploadedBy: z.string().uuid().optional(),
  tags: z.array(z.string()).optional().default([]),
  description: z.string().optional().default(""),
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

  const parsed = createMediaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("media")
    .insert({
      url: data.url,
      filename: data.filename,
      mime_type: data.mimeType,
      size: data.size,
      alt: data.alt,
      alt_en: data.altEn,
      folder: data.folder,
      uploaded_by: data.uploadedBy ?? null,
      tags: data.tags,
      description: data.description,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response: ApiResponse<MediaItem> = { data: mapMediaRow(row as any) };
  return NextResponse.json(response, { status: 201 });
}
