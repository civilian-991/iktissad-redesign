/**
 * PATCH /api/account/preferences
 *
 * Persists the authenticated subscriber's onboarding preferences
 * (sector interests + onboarded flag) into Supabase Auth user_metadata.
 * Does NOT require admin privileges — the user must only be authenticated.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

const VALID_SECTORS = [
  "energy",
  "banking",
  "realEstate",
  "technology",
  "industry",
  "trade",
] as const;

const preferencesSchema = z.object({
  sectors: z.array(z.enum(VALID_SECTORS)).optional(),
  onboarded: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ updated: boolean }>>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" } satisfies ApiResponse<never>,
      { status: 401 }
    );
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

  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((i) => i.message).join(", "),
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.sectors !== undefined) {
    updates.preferred_sectors = parsed.data.sectors;
  }
  if (parsed.data.onboarded !== undefined) {
    updates.onboarded = parsed.data.onboarded;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { data: { updated: false } } satisfies ApiResponse<{ updated: boolean }>
    );
  }

  const { error } = await supabase.auth.updateUser({
    data: updates,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { updated: true } } satisfies ApiResponse<{ updated: boolean }>
  );
}
