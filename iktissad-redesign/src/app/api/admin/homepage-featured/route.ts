/**
 * Homepage Featured Lineup Admin API
 *
 * GET /api/admin/homepage-featured
 *   → { order: string[], articles: Article[] } — pinned articles in slot order.
 *     Ids whose article no longer exists are dropped from `articles`.
 *
 * PUT /api/admin/homepage-featured
 *   Body: { order: string[] } — up to HOMEPAGE_FEATURED_SLOTS article ids.
 *   An empty array clears all pins (homepage goes back to newest-first).
 *
 * Role-gated: super_admin or editor.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  requireRole,
  unauthorizedResponse,
  csrfForbiddenResponse,
  forbiddenResponse,
} from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapArticleRow } from "@/lib/supabase/mappers";
import { logAuditAction } from "@/lib/audit";
import {
  HOMEPAGE_FEATURED_KEY,
  HOMEPAGE_FEATURED_SLOTS,
  getHomepageFeaturedOrder,
} from "@/lib/homepage-featured";
import type { ApiResponse, Article } from "@/types";

const PINNED_SELECT = `
  *,
  users:author_id ( name, avatar, slug ),
  sections:section_id ( slug, name )
`;

export interface HomepageFeaturedData {
  order: string[];
  articles: Article[];
}

const putSchema = z.object({
  order: z
    .array(z.string().uuid({ message: "Each id must be a valid UUID" }))
    .max(HOMEPAGE_FEATURED_SLOTS, {
      message: `At most ${HOMEPAGE_FEATURED_SLOTS} articles can be pinned`,
    }),
});

async function loadPinned(order: string[]): Promise<Article[]> {
  if (order.length === 0) return [];
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from("articles") as any)
    .select(PINNED_SELECT)
    .in("id", order);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId = new Map<string, any>((data ?? []).map((r: any) => [r.id, r]));
  return order.filter((id) => byId.has(id)).map((id) => mapArticleRow(byId.get(id)));
}

export async function GET(request: NextRequest) {
  const gate = await requireRole(request, ["super_admin", "editor"]);
  if (!gate.authenticated) return unauthorizedResponse();
  if (gate.forbidden) return forbiddenResponse();

  const order = await getHomepageFeaturedOrder();
  const articles = await loadPinned(order);

  return NextResponse.json({
    data: { order: articles.map((a) => a.id), articles },
  } satisfies ApiResponse<HomepageFeaturedData>);
}

export async function PUT(request: NextRequest) {
  const gate = await requireRole(request, ["super_admin", "editor"]);
  if (!gate.authenticated) return unauthorizedResponse();
  if (gate.csrfFailed) return csrfForbiddenResponse();
  if (gate.forbidden) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const order = Array.from(new Set(parsed.data.order));
  const previous = await getHomepageFeaturedOrder();

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("site_settings") as any).upsert(
    { key: HOMEPAGE_FEATURED_KEY, value: { order }, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  revalidatePath("/");

  await logAuditAction({
    actorId: gate.userId!,
    actorEmail: "",
    action: "update_homepage_featured",
    resourceType: "site_settings",
    resourceId: HOMEPAGE_FEATURED_KEY,
    oldValues: { order: previous },
    newValues: { order },
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      undefined,
  });

  const articles = await loadPinned(order);
  return NextResponse.json({
    data: { order: articles.map((a) => a.id), articles },
  } satisfies ApiResponse<HomepageFeaturedData>);
}
