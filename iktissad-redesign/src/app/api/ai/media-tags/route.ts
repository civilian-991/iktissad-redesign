/**
 * POST /api/ai/media-tags
 *
 * Generate relevant tags for a media item using Claude Vision.
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

const mediaTagsSchema = z.object({
  imageUrl: z.string().url("imageUrl must be a valid URL"),
  mediaId: z.string().uuid().optional(),
});

type MediaTagsResult = { tags: string[] };

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

  const parsed = mediaTagsSchema.safeParse(body);
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
        max_tokens: 256,
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
                text: `You are a media librarian for IKTISSAD, an Arabic financial news website.
Analyze this image and extract relevant tags.
Respond with JSON only: {"tags": ["tag1", "tag2", "tag3"]}
Tags should be lowercase English words (2-5 tags max).
Focus on: people, organizations, locations, events, objects, concepts visible in the image.
Examples: ["chart", "meeting", "saudi-arabia", "oil", "finance"]`,
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

    let tags: string[] = [];

    try {
      // Strip potential markdown code fences
      const cleaned = rawText.replace(/```(?:json)?/g, "").trim();
      const parsedJson = JSON.parse(cleaned) as { tags?: unknown };
      if (Array.isArray(parsedJson.tags)) {
        tags = parsedJson.tags
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.toLowerCase().trim())
          .slice(0, 5);
      }
    } catch {
      // If Claude returned non-JSON, return empty tags
      tags = [];
    }

    // Optionally persist to media record
    if (mediaId && tags.length > 0) {
      const admin = createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("media") as any)
        .update({ tags: JSON.stringify(tags) })
        .eq("id", mediaId);
    }

    const result: MediaTagsResult = { tags };
    return NextResponse.json({ data: result } satisfies ApiResponse<MediaTagsResult>);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
