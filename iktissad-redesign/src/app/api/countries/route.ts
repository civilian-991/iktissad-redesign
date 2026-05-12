import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapCountryRow } from "@/lib/supabase/mappers";
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
