import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { unauthorizedResponse, requireRole, forbiddenResponse, csrfForbiddenResponse } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  publicReadLimit,
  authWriteLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

/**
 * GET /api/admin/templates
 * List all article templates.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(undefined, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const ip = getClientIp(request);
  const rl = publicReadLimit(`admin-templates:get:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  const supabase = await createClient();
  const { data, error } = await (supabase.from("article_templates") as any)
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data } satisfies ApiResponse<typeof data>);
}

const createTemplateSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  templateBody: z.any(), // JSONB — TipTap JSON
  category: z.string().optional(),
});

/**
 * POST /api/admin/templates
 * Create a new article template.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(undefined, ["super_admin", "editor"]);
  if (!auth.authenticated) return unauthorizedResponse()
  if (auth.csrfFailed) return csrfForbiddenResponse()
  if (auth.forbidden) return forbiddenResponse()

  const ip = getClientIp(request);
  const rl = authWriteLimit(`admin-templates:post:${ip}`);
  if (!rl.allowed) return rateLimitedResponse(rl);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await (admin.from("article_templates") as any)
    .insert({
      name: parsed.data.name,
      name_en: parsed.data.nameEn ?? "",
      description: parsed.data.description ?? "",
      template_body:
        typeof parsed.data.templateBody === "string"
          ? parsed.data.templateBody
          : JSON.stringify(parsed.data.templateBody),
      category: parsed.data.category ?? "general",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  return NextResponse.json({ data } satisfies ApiResponse<typeof data>, {
    status: 201,
  });
}
