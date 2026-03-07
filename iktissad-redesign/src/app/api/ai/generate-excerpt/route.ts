import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  content: z.string().min(1),
  language: z.enum(["ar", "en"]),
  maxLength: z.number().int().positive().optional().default(200),
});

type ExcerptResult = { excerpt: string; language: string };

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

  const { content, language, maxLength } = parsed.data;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        system:
          "You are an editor for IKTISSAD, an Arabic financial news website. Generate a concise, compelling excerpt/summary for the given article content. The excerpt should capture the key points and entice readers. Output only the excerpt text, nothing else.",
        messages: [
          {
            role: "user",
            content: `Write an excerpt in ${language === "ar" ? "Arabic" : "English"}. Keep it under ${maxLength} characters.\n\nArticle content:\n${content}`,
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
    const excerpt: string =
      data?.content?.[0]?.type === "text" ? data.content[0].text : "";

    const response: ApiResponse<ExcerptResult> = {
      data: { excerpt, language },
    };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to generate excerpt",
      } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
