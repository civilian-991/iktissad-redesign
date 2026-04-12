/**
 * POST /api/ai/fact-check
 *
 * Analyzes article content for verifiable claims (numbers, statistics,
 * attributions) and returns confidence levels with suggested sources.
 *
 * Advisory-only — does NOT auto-approve or modify content.
 *
 * Request body: { content: string; title: string }
 * Response:     { data: { claims: FactCheckClaim[] } }
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
});

export interface FactCheckClaim {
  claim: string;
  /** 0–1 confidence that this claim can be independently verified */
  confidence: number;
  /** high | medium | low */
  priority: "high" | "medium" | "low";
  /** Suggested authoritative sources for verification */
  suggestedSources: string[];
  /** Brief description of what makes this claim verifiable */
  note: string;
}

interface FactCheckResult {
  claims: FactCheckClaim[];
  checkedAt: string;
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

  const { content, title } = parsed.data;
  // Strip HTML and truncate to avoid token limits
  const plainText = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 6000);

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
        max_tokens: 2048,
        system: `You are a fact-checking assistant for IKTISSAD, an Arabic financial news platform.
Analyze the article and identify verifiable claims that editors should review.

Focus on:
- Specific numbers, percentages, statistics
- Attributed quotes and statements
- Economic data points and market figures
- Claims about companies, governments, or individuals

For each claim return a JSON object with:
- "claim": the exact claim text (in the article's language)
- "confidence": 0.0-1.0 how easily this can be independently verified (1.0 = very easy)
- "priority": "high" | "medium" | "low" (high = critical financial data, medium = statistics, low = general attribution)
- "suggestedSources": array of 1-3 authoritative source names (e.g. "World Bank", "Bloomberg", "Saudi SAMA")
- "note": one sentence explaining what to check

Return ONLY a JSON array of claim objects. Maximum 8 claims. If no verifiable claims found, return [].`,
        messages: [
          {
            role: "user",
            content: `Article title: ${title}\n\nContent:\n${plainText}\n\nReturn JSON array of fact-check claims:`,
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

    let claims: FactCheckClaim[] = [];
    try {
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]) as unknown[];
        claims = parsed
          .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
          .map((c) => ({
            claim: String(c.claim ?? ""),
            confidence: Math.min(1, Math.max(0, Number(c.confidence ?? 0.5))),
            priority: (["high", "medium", "low"].includes(c.priority as string)
              ? c.priority
              : "medium") as FactCheckClaim["priority"],
            suggestedSources: Array.isArray(c.suggestedSources)
              ? (c.suggestedSources as unknown[]).map(String)
              : [],
            note: String(c.note ?? ""),
          }))
          .filter((c) => c.claim.length > 0);
      }
    } catch {
      claims = [];
    }

    const response: ApiResponse<FactCheckResult> = {
      data: { claims, checkedAt: new Date().toISOString() },
    };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to run fact-check",
      } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
