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
import { mapCountryRow } from "@/lib/supabase/mappers";
import { slugify } from "@/lib/slugify";
import { COUNTRY_REGIONS } from "@/lib/countries";
import type { ApiResponse, Country } from "@/types";

export async function GET() {
  const supabase = await createClient();

  const [countriesRes, articlesRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("countries").select("*").order("name", { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("articles")
      .select("country_id")
      .eq("status", "published")
      .eq("archived", false),
  ]);

  if (countriesRes.error) {
    return NextResponse.json(
      { error: countriesRes.error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Tally published-article counts per country_id in JS
  const counts = new Map<string, number>();
  if (!articlesRes.error) {
    for (const row of (articlesRes.data ?? []) as Array<{ country_id: string | null }>) {
      if (!row.country_id) continue;
      counts.set(row.country_id, (counts.get(row.country_id) ?? 0) + 1);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countries: Country[] = ((countriesRes.data ?? []) as any[]).map((r) =>
    mapCountryRow({ ...r, article_count: counts.get(r.id) ?? 0 })
  );

  const response: ApiResponse<Country[]> = {
    data: countries,
    pagination: {
      page: 1,
      pageSize: countries.length,
      total: countries.length,
      totalPages: 1,
    },
  };

  return NextResponse.json(response);
}

// ─── POST /api/countries ─────────────────────────────────────────────────────

const keyIndicatorsSchema = z.record(z.string(), z.union([z.string(), z.number()]));

const createCountrySchema = z.object({
  slug: z.string().optional(),
  name: z.string().min(1, "name is required"),
  nameEn: z.string().optional(),
  flag: z.string().optional(),
  region: z.enum(COUNTRY_REGIONS).optional(),
  economicOverview: z.string().optional(),
  economicOverviewEn: z.string().optional(),
  keyIndicators: keyIndicatorsSchema.optional(),
});

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

  const parsed = createCountrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const d = parsed.data;
  const slug = d.slug && d.slug.trim() ? slugify(d.slug) : slugify(d.name);
  if (!slug) {
    return NextResponse.json(
      { error: "Could not derive slug from name" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("countries")
    .insert({
      slug,
      name: d.name,
      name_en: d.nameEn ?? "",
      flag: d.flag ?? "",
      region: d.region ?? "world",
      economic_overview: d.economicOverview ?? "",
      economic_overview_en: d.economicOverviewEn ?? "",
      key_indicators: d.keyIndicators ?? {},
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
    { data: mapCountryRow({ ...row, article_count: 0 }) } satisfies ApiResponse<Country>,
    { status: 201 }
  );
}
