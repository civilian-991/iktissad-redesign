/**
 * POST /api/ai/alt-text
 *
 * Generate bilingual (Arabic + English) alt text for an image using Claude Vision.
 * Optionally persists the result to the media record when mediaId is provided.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

// ──────────────────────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────────────────────

const altTextSchema = z.object({
  imageUrl: z.string().url("imageUrl must be a valid URL"),
  mediaId: z.string().uuid().optional(),
});

type AltTextResult = { altAr: string; altEn: string };

// ──────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

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

  const parsed = altTextSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((i) => i.message).join(", "),
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { imageUrl, mediaId } = parsed.data;

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
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "url", url: imageUrl },
              },
              {
                type: "text",
                text: `You are an accessibility specialist for IKTISSAD, an Arabic financial news website.
Analyze this image and generate concise, descriptive alt text.
Respond with JSON only: {"altAr": "Arabic alt text here", "altEn": "English alt text here"}
The Arabic text should be natural, descriptive Arabic (not a translation of English).
Keep each under 150 characters. Focus on what is visually depicted.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Claude API error: ${res.status} ${errText}` } satisfies ApiResponse<never>,
        { status: 502 }
      );
    }

    const claudeResult = await res.json();
    const rawText: string = claudeResult.content?.[0]?.text ?? "{}";

    let altAr = "";
    let altEn = "";

    try {
      // Strip potential markdown code fences
      const cleaned = rawText.replace(/```(?:json)?/g, "").trim();
      const parsed = JSON.parse(cleaned) as { altAr?: string; altEn?: string };
      altAr = parsed.altAr ?? "";
      altEn = parsed.altEn ?? "";
    } catch {
      // If Claude returned non-JSON, use the raw text as English fallback
      altEn = rawText.slice(0, 150);
    }

    // Optionally persist to media record
    if (mediaId && (altAr || altEn)) {
      const admin = createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("media") as any)
        .update({ alt: altAr, alt_en: altEn })
        .eq("id", mediaId);
    }

    const result: AltTextResult = { altAr, altEn };
    return NextResponse.json({ data: result } satisfies ApiResponse<AltTextResult>);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
