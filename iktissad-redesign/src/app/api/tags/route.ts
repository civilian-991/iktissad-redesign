import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireRole,
  unauthorizedResponse,
  csrfForbiddenResponse,
  forbiddenResponse,
} from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapTagRow } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/slugify";
import type { ApiResponse, Tag } from "@/types";

// GET /api/tags?search=&limit=&offset=
// Returns tags (with live article usage counts) for the editor autocomplete and
// the admin management screen. Counts are computed in SQL for only the returned
// page, so this stays fast even with thousands of tags.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim();
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 50) || 50, 1),
    200
  );
  const offset = Math.max(Number(searchParams.get("offset") ?? 0) || 0, 0);

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any).rpc("search_tags", {
    search,
    lim: limit,
    off: offset,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags: Tag[] = (rows ?? []).map((row: any) => mapTagRow(row));

  return NextResponse.json({
    data: tags,
    pagination: {
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      total: tags.length,
      totalPages: 1,
    },
  } satisfies ApiResponse<Tag[]>);
}

const createTagSchema = z.object({
  name: z.string().min(1, "name is required"),
  nameEn: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
});

// POST /api/tags — create a tag. Idempotent on name: if the tag already exists
// (which is common when an editor "creates" a tag inline), the existing row is
// returned instead of erroring, so the editor can simply add it.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const d = parsed.data;
  const name = d.name.trim();
  if (!name) {
    return NextResponse.json(
      { error: "name is required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }
  const slug = (d.slug && d.slug.trim()) ? slugify(d.slug) : slugify(name);

  const admin = createAdminClient();

  // Return the existing tag if the name is already taken (case-sensitive match
  // on the canonical token stored in articles.tags).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("tags")
    .select("*")
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { data: mapTagRow(existing) } satisfies ApiResponse<Tag>,
      { status: 200 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("tags")
    .insert({
      name,
      name_en: d.nameEn ?? "",
      slug,
      description: d.description ?? "",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: mapTagRow(row) } satisfies ApiResponse<Tag>,
    { status: 201 }
  );
}
