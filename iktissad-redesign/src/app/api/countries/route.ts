import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapCountryRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Country } from "@/types";

export async function GET() {
  const supabase = await createClient();

  // Use RPC to COUNT in SQL — avoids the 1000-row PostgREST cap
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any).rpc("get_countries_with_counts");

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countries: Country[] = (rows ?? []).map((r: any) => mapCountryRow(r));

  const response: ApiResponse<Country[]> = {
    data: countries,
    pagination: {
      page: 1,
      pageSize: 50,
      total: countries.length,
      totalPages: 1,
    },
  };

  return NextResponse.json(response);
}
