import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireRole,
  unauthorizedResponse,
  csrfForbiddenResponse,
  forbiddenResponse,
} from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapTagRow } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/slugify";
import type { ApiResponse, Tag } from "@/types";

const updateTagSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
});

// PUT /api/tags/[id] — update a tag.
// Renaming propagates to every article (the tag name is the value stored in
// articles.tags). Renaming onto a name that already exists merges the two tags.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

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

  const parsed = updateTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const d = parsed.data;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("tags")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "Tag not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  if (d.nameEn !== undefined) updates.name_en = d.nameEn;
  if (d.slug !== undefined) updates.slug = slugify(d.slug);
  if (d.description !== undefined) updates.description = d.description;

  const newName = d.name?.trim();
  const renaming = !!newName && newName !== existing.name;

  if (renaming) {
    // Is there already a different tag with the target name? → merge.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: collision } = await (admin as any)
      .from("tags")
      .select("*")
      .eq("name", newName)
      .neq("id", id)
      .maybeSingle();

    // Rewrite the tag inside every article (de-dupes on merge).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (admin as any).rpc("rename_tag_in_articles", {
      old_name: existing.name,
      new_name: newName,
    });
    if (rpcError) {
      return NextResponse.json(
        { error: rpcError.message } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    if (collision) {
      // Merge: drop this row, keep the surviving target row.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("tags").delete().eq("id", id);
      return NextResponse.json(
        { data: mapTagRow(collision) } satisfies ApiResponse<Tag>
      );
    }

    updates.name = newName;
    // Keep the convenience slug aligned with the new name unless one was given.
    if (d.slug === undefined) updates.slug = slugify(newName);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ data: mapTagRow(existing) } satisfies ApiResponse<Tag>);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("tags")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: mapTagRow(row) } satisfies ApiResponse<Tag>);
}

// DELETE /api/tags/[id] — delete a tag and remove it from every article.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { id } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("tags")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "Tag not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (admin as any).rpc("remove_tag_from_articles", {
    target_name: existing.name,
  });
  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("tags").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { deleted: true } } satisfies ApiResponse<{ deleted: boolean }>
  );
}
