/**
 * POST /api/ai/summarize
 *
 * Generates a 2-3 sentence AI summary (TLDR) for an article in both Arabic
 * and English. Saves the summaries to the articles table.
 *
 * Request body: { articleId: string; content: string; title: string }
 * Response:     { data: { summary: string; summaryEn: string } }
 *
 * Requires admin auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  articleId: z.string().uuid(),
  content: z.string().min(1),
  title: z.string().min(1),
});

interface SummarizeResult {
  summary: string;
  summaryEn: string;
}

async function callClaude(apiKey: string, prompt: string, system: string): Promise<string> {
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
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data?.content?.[0]?.type === "text" ? (data.content[0].text as string).trim() : "";
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

  const { articleId, content, title } = parsed.data;
  const truncatedContent = content.slice(0, 5000);

  try {
    // Generate Arabic and English summaries in parallel
    const [summary, summaryEn] = await Promise.all([
      callClaude(
        apiKey,
        `اكتب ملخصاً بالعربية من 2-3 جمل فقط للمقال التالي. يجب أن يكون الملخص واضحاً ومفيداً للقارئ المتعجل.\n\nالعنوان: ${title}\n\nالمحتوى:\n${truncatedContent}`,
        "أنت محرر متخصص في موقع إقتصاد المالي. اكتب ملخصاً موجزاً ودقيقاً بالعربية الفصحى. أخرج النص فقط بدون أي تعليقات أو مقدمة."
      ),
      callClaude(
        apiKey,
        `Write a 2-3 sentence English TLDR summary of the following Arabic financial news article. Be concise and informative.\n\nTitle: ${title}\n\nContent:\n${truncatedContent}`,
        "You are an editor at IKTISSAD, an Arabic financial news platform. Write concise, accurate English summaries. Output only the summary text, no preamble."
      ),
    ]);

    // Persist summaries to DB
    const admin = createAdminClient();
    await (admin.from("articles") as any)
      .update({ summary, summary_en: summaryEn })
      .eq("id", articleId);

    const response: ApiResponse<SummarizeResult> = { data: { summary, summaryEn } };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to generate summary",
      } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
