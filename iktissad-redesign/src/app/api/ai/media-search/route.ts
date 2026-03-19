import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse, MediaItem } from "@/types";

const searchSchema = z.object({
  query: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: "AI features not configured" } satisfies ApiResponse<never>,
      { status: 503 }
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  // Step 1: Expand query terms with Claude
  let keywords: string[] = [];
  try {
    const expansionRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `For a media library search system, expand this query into 3-5 English search keywords separated by commas. Query: "${parsed.data.query}". Respond with ONLY the keywords, nothing else.`,
          },
        ],
      }),
    });

    if (expansionRes.ok) {
      const expansionResult = await expansionRes.json();
      keywords = (expansionResult.content?.[0]?.text ?? "")
        .split(",")
        .map((k: string) => k.trim())
        .filter(Boolean);
    }
  } catch {
    // If Claude fails, fall back to direct search with original query only
    keywords = [];
  }

  // Step 2: Search media table by description/filename using ilike
  const admin = createAdminClient();
  const allTerms = [parsed.data.query, ...keywords].slice(0, 4);

  const searchConditions = allTerms
    .map((k: string) => `description.ilike.%${k}%,filename.ilike.%${k}%`)
    .join(",");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (admin.from("media").select("*") as any)
    .or(searchConditions)
    .limit(12)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }

  // Map snake_case DB rows to camelCase MediaItem
  const results: MediaItem[] = (rows ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    url: row.url as string,
    filename: row.filename as string,
    mimeType: (row.mime_type ?? row.mimeType ?? "") as string,
    size: (row.size ?? 0) as number,
    alt: (row.alt ?? "") as string,
    altEn: (row.alt_en ?? row.altEn ?? "") as string,
    folder: (row.folder ?? "") as string,
    uploadedBy: (row.uploaded_by ?? row.uploadedBy ?? "") as string,
    createdAt: (row.created_at ?? row.createdAt ?? "") as string,
    tags: (row.tags ?? []) as string[],
    description: (row.description ?? "") as string,
  }));

  return NextResponse.json({
    data: { results, query: parsed.data.query },
  } satisfies ApiResponse<{ results: MediaItem[]; query: string }>);
}
