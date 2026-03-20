import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

interface NewsletterSubscription {
  email: string;
  subscribedAt: string;
}

const subscribeSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { email } = parsed.data;
  const admin = createAdminClient();

  // Check if already actively subscribed
  const { data: existing } = await admin
    .from("newsletter_subscribers")
    .select("email, status")
    .eq("email", email)
    .maybeSingle() as { data: { email: string; status: string } | null };

  if (existing && existing.status === "active") {
    return NextResponse.json(
      { error: "already_subscribed" } satisfies ApiResponse<never>,
      { status: 409 }
    );
  }

  // Insert or reactivate (upsert)
  const { data: row, error } = await admin
    .from("newsletter_subscribers")
    .upsert(
      { email, status: "active", subscribed_at: new Date().toISOString() },
      { onConflict: "email" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  const subscription: NewsletterSubscription = {
    email: r.email,
    subscribedAt: r.subscribed_at,
  };

  const response: ApiResponse<NewsletterSubscription> = {
    data: subscription,
  };

  return NextResponse.json(response, { status: 201 });
}
