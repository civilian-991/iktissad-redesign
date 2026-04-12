/**
 * POST /api/ai/auto-tag
 *
 * Extracts entities (people, companies, economic topics, countries) from
 * article content and suggests them as tags.
 *
 * Request body: { content: string; title: string; existingTags?: string[] }
 * Response:     { data: { tags: string[] } }
 *
 * Requires admin auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  content: z.string().min(1),
  title: z.string().min(1),
  existingTags: z.array(z.string()).optional().default([]),
});

interface AutoTagResult {
  tags: string[];
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI features not configured" } satisfies ApiResponse<never>,
      { status: 503 }
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { content, title, existingTags } = parsed.data;

  // Truncate content to avoid token limits
  const truncatedContent = content.slice(0, 4000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `You are an expert financial news editor for IKTISSAD, an Arabic financial news platform.
Extract entities and topics from article content to use as tags.

Guidelines:
- Extract: people names (in Arabic), company names, countries, economic topics, financial concepts
- Return 5-10 concise Arabic tags
- Each tag should be 1-4 words maximum
- Prefer Arabic names/terms; use English only for proper names with no Arabic equivalent
- Do NOT include tags that are already in the existing tags list
- Return ONLY a JSON array of strings, nothing else

Example output: ["سامي العمر", "أرامكو السعودية", "النفط الخام", "الأسواق المالية", "المملكة العربية السعودية"]`,
        messages: [
          {
            role: "user",
            content: `Article title: ${title}

Existing tags (exclude these): ${existingTags.join(", ") || "none"}

Article content:
${truncatedContent}

Return a JSON array of suggested tags:`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Claude API error: ${res.status}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    const data = await res.json();
    const rawText: string = data?.content?.[0]?.type === "text" ? data.content[0].text : "[]";

    // Parse the JSON array from Claude's response
    let tags: string[] = [];
    try {
      // Extract JSON array from response (Claude sometimes adds extra text)
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) {
        tags = JSON.parse(match[0]) as string[];
        tags = tags.filter((t) => typeof t === "string" && t.trim().length > 0).map((t) => t.trim());
      }
    } catch {
      // If parsing fails, extract tags manually line by line
      tags = rawText
        .split(/[\n,]/)
        .map((t) => t.replace(/^["'\s\-*•]+|["'\s\-*•]+$/g, "").trim())
        .filter((t) => t.length > 0 && t.length < 60);
    }

    const response: ApiResponse<AutoTagResult> = { data: { tags } };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to extract tags",
      } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
