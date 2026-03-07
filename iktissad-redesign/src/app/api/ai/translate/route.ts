import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

const translateSchema = z.object({
  text: z.string().min(1),
  from: z.enum(["ar", "en"]),
  to: z.enum(["ar", "en"]),
});

interface TranslateResult {
  translatedText: string;
  from: string;
  to: string;
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

  const parsed = translateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { text, from, to } = parsed.data;

  const fromLabel = from === "ar" ? "Arabic" : "English";
  const toLabel = to === "ar" ? "Arabic" : "English";

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
        max_tokens: 4096,
        system:
          "You are a professional translator for a financial news website called IKTISSAD. Translate the following text accurately, preserving formatting, HTML tags, and financial terminology. Only output the translation, nothing else.",
        messages: [
          {
            role: "user",
            content: `Translate the following from ${fromLabel} to ${toLabel}:\n\n${text}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: `Translation API error: ${res.status} ${errBody}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    const result = await res.json();
    const translatedText: string =
      result.content?.[0]?.text ?? "";

    const response: ApiResponse<TranslateResult> = {
      data: { translatedText, from, to },
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Translation failed: ${message}` } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
