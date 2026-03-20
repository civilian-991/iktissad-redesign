/**
 * GET /api/account/subscription
 *
 * Returns the authenticated user's subscriber record with plan info.
 * Used by the account dashboard to show subscription status.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

export async function GET() {
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

  const { data: subscriber, error } = await (supabase as any)
    .from("subscribers")
    .select(
      `
      id,
      status,
      current_period_start,
      current_period_end,
      trial_ends_at,
      canceled_at,
      plan_id,
      subscription_plans (
        id,
        name,
        name_ar,
        price_monthly,
        price_annual
      )
    `
    )
    .eq("email", user.email!)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: subscriber ?? null } satisfies ApiResponse<typeof subscriber>);
}
