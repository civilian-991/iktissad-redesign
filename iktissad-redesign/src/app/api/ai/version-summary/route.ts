/**
 * POST /api/ai/version-summary
 * Generate an Arabic AI summary of changes between two article versions.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

const versionSummarySchema = z.object({
  previousContent: z.string().optional().default(""),
  currentContent: z.string().min(1),
  previousTitle: z.string().optional().default(""),
  currentTitle: z.string().optional().default(""),
});

interface VersionSummaryResult {
  summary: string;
}

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

  const parsed = versionSummarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((i) => i.message).join(", "),
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { previousContent, currentContent, previousTitle, currentTitle } =
    parsed.data;

  const prompt = `قارن بين نسختين من مقال صحفي وقدم ملخصاً عربياً موجزاً للتغييرات في جملة أو جملتين.

العنوان السابق: ${previousTitle || "(غير متوفر)"}
العنوان الحالي: ${currentTitle || "(غير متوفر)"}

المحتوى السابق (أول 500 حرف):
${previousContent.slice(0, 500)}

المحتوى الحالي (أول 500 حرف):
${currentContent.slice(0, 500)}

اكتب ملخصاً موجزاً للتغييرات بالعربية في جملة أو جملتين فقط. مثال: "تم تعديل العنوان وإضافة فقرتين في القسم التحليلي."`;

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
        max_tokens: 200,
        system:
          "أنت محرر صحفي متخصص في المحتوى المالي العربي. مهمتك تلخيص التغييرات بين نسختين من مقال بشكل موجز ودقيق. استخدم الأرقام الغربية (0-9) دائماً، لا الأرقام الهندية (الأرقام العربية الشرقية).",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        {
          error: `AI API error: ${res.status} ${errBody}`,
        } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    const result = await res.json();
    const summary: string = result.content?.[0]?.text?.trim() ?? "";

    const response: ApiResponse<VersionSummaryResult> = {
      data: { summary },
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Version summary failed: ${message}` } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
