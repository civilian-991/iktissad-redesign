import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapCountryRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Country } from "@/types";

export async function GET() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("countries")
    .select()
    .order("name", { ascending: true });

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
