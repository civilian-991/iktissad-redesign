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
import { mapCountryRow, mapArticleRow } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/slugify";
import { COUNTRY_REGIONS } from "@/lib/countries";
import type { ApiResponse, Country } from "@/types";

const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug, name ),
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

   
  const { data: row, error } = await supabase
    .from("countries")
    .select()
    .eq("slug", slug)
    .single() as { data: any; error: any };

  if (error || !row) {
    return NextResponse.json(
      { error: "Country not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Also fetch articles for this country
   
  const { data: articleRows } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("country_id", row.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(10) as { data: any[] | null };

  const country = mapCountryRow(row);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = (articleRows ?? []).map((r: any) => mapArticleRow(r));

  const response: ApiResponse<Country & { articles: typeof articles }> = {
    data: { ...country, articles },
  };
  return NextResponse.json(response);
}

// ─── PUT /api/countries/[slug] — partial update ──────────────────────────────

const keyIndicatorsSchema = z.record(z.string(), z.union([z.string(), z.number()]));

const updateCountrySchema = z.object({
  slug: z.string().optional(),
  name: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  flag: z.string().optional(),
  region: z.enum(COUNTRY_REGIONS).optional(),
  economicOverview: z.string().optional(),
  economicOverviewEn: z.string().optional(),
  keyIndicators: keyIndicatorsSchema.optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = updateCountrySchema.safeParse(body);
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
    .from("countries")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Country not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (d.slug !== undefined) {
    const newSlug = slugify(d.slug);
    if (!newSlug) {
      return NextResponse.json(
        { error: "Invalid slug" } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }
    updates.slug = newSlug;
  }
  if (d.name !== undefined) updates.name = d.name;
  if (d.nameEn !== undefined) updates.name_en = d.nameEn;
  if (d.flag !== undefined) updates.flag = d.flag;
  if (d.region !== undefined) updates.region = d.region;
  if (d.economicOverview !== undefined) updates.economic_overview = d.economicOverview;
  if (d.economicOverviewEn !== undefined) updates.economic_overview_en = d.economicOverviewEn;
  if (d.keyIndicators !== undefined) updates.key_indicators = d.keyIndicators;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("countries")
    .update(updates)
    .eq("id", existing.id)
    .select()
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: mapCountryRow({ ...row, article_count: 0 }) } satisfies ApiResponse<Country>
  );
}

// ─── DELETE /api/countries/[slug] ────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireRole(request, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse();
  if (auth.csrfFailed) return csrfForbiddenResponse();
  if (auth.forbidden) return forbiddenResponse();

  const { slug } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("countries")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Country not found" } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("countries")
    .delete()
    .eq("id", existing.id);

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
