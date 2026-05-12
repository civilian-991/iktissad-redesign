import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapUserRow } from "@/lib/supabase/mappers";
import type { ApiResponse, AdminUser } from "@/types";

// Byline-only contributor creation. Unlike POST /api/users, this does NOT
// create a Supabase Auth account or admin_roles row — third-party authors
// never log in, they just need a name/avatar to attach to articles.
const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { name, avatar } = parsed.data;
  const id = randomUUID();
  // users.email is UNIQUE NOT NULL — synthesize a placeholder when the
  // editor didn't supply one. Non-routable .local domain prevents accidental
  // mail being sent there.
  const email = parsed.data.email ?? `contributor-${id}@iktissad.local`;

  const admin = createAdminClient();
  const { data: row, error } = await (admin.from("users") as any)
    .insert({
      id,
      email,
      name,
      role: "contributor",
      avatar: avatar ?? "",
      department: "",
      status: "active",
    })
    .select()
    .single();

  if (error) {
    const isDuplicate = error.code === "23505" || error.message.toLowerCase().includes("duplicate");
    return NextResponse.json(
      { error: isDuplicate ? "Email already exists" : error.message } satisfies ApiResponse<never>,
      { status: isDuplicate ? 409 : 500 }
    );
  }

  const response: ApiResponse<AdminUser> = { data: mapUserRow(row as any) };
  return NextResponse.json(response, { status: 201 });
}
