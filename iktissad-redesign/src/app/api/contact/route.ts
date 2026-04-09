import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import type { ApiResponse } from "@/types";

/**
 * NOTE: The `contact_submissions` table must be created in Supabase before
 * this route will function. Run the following SQL in the Supabase SQL editor:
 *
 * create table if not exists contact_submissions (
 *   id uuid primary key default gen_random_uuid(),
 *   name text not null,
 *   email text not null,
 *   subject text not null,
 *   message text not null,
 *   ip text,
 *   created_at timestamptz not null default now()
 * );
 *
 * -- Enable RLS and allow only service role to read
 * alter table contact_submissions enable row level security;
 * create policy "service_role_only" on contact_submissions
 *   using (false);
 */

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  turnstileToken: z.string().min(1, "Bot verification required"),
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

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { name, email, subject, message, turnstileToken } = parsed.data;

  // Verify Cloudflare Turnstile token before any DB work
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const isHuman = await verifyTurnstile(turnstileToken, ip);
  if (!isHuman) {
    return NextResponse.json(
      { error: "Bot verification failed" } satisfies ApiResponse<never>,
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  // Simple rate limiting: reject if same email submitted within the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data: recent } = await db
    .from("contact_submissions")
    .select("id")
    .eq("email", email)
    .gte("created_at", oneHourAgo)
    .limit(1)
    .maybeSingle() as { data: { id: string } | null };

  if (recent) {
    return NextResponse.json(
      { error: "rate_limited" } satisfies ApiResponse<never>,
      { status: 429 }
    );
  }

  const { error } = await db.from("contact_submissions").insert({
    name,
    email,
    subject,
    message,
    ip,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { success: true } } satisfies ApiResponse<{ success: boolean }>,
    { status: 201 }
  );
}
