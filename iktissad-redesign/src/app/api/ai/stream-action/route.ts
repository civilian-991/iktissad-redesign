/**
 * AI Stream Action API Route
 * /api/ai/stream-action
 *
 * Streaming endpoint for TipTap AI sidebar actions.
 * Uses AI SDK v6 streamText + @ai-sdk/anthropic.
 * Returns a plain text stream (toTextStreamResponse).
 *
 * Non-streaming action: 'headlines' — returns { headlines: string[] } JSON.
 */

import { NextRequest, NextResponse } from 'next/server'
import { streamText, generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import {
  buildSystemPrompt,
  buildContextFragment,
  ArticleType,
} from '@/lib/ai/arabic-editorial'

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const streamActionSchema = z.object({
  action: z.enum([
    'continue',
    'improve',
    'summarize',
    'translate',
    'excerpt',
    'headlines',
    'fact-check',
  ]),
  content: z.string(),
  selection: z.string().optional(),
  articleType: z.string().optional(),
  targetKeyword: z.string().optional(),
  translateTo: z.enum(['ar', 'en']).optional(),
})

type StreamActionInput = z.infer<typeof streamActionSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = anthropic('claude-sonnet-4.6')

function resolveArticleType(value?: string): ArticleType | undefined {
  if (!value) return undefined
  const values = Object.values(ArticleType) as string[]
  return values.includes(value) ? (value as ArticleType) : undefined
}

function buildSystem(input: StreamActionInput): string {
  const articleType = resolveArticleType(input.articleType)
  if (articleType) {
    return buildSystemPrompt({
      articleType,
      targetKeyword: input.targetKeyword,
    })
  }
  return buildContextFragment()
}

function buildUserPrompt(input: StreamActionInput): string {
  const { action, content, selection, translateTo } = input
  const sel = selection ?? ''
  const text = sel || content

  switch (action) {
    case 'continue':
      return `استكمل الكتابة من حيث انتها هذا النص، بنفس الأسلوب والسياق:\n\n${content}`

    case 'improve':
      return `أعد صياغة النص التالي ليكون أكثر دقةً وإحكاماً وسلطةً صحفية:\n\n${text}`

    case 'summarize':
      return `لخّص النص التالي في جملة أو جملتين:\n\n${text}`

    case 'translate': {
      const target = translateTo ?? 'en'
      const fromLabel = target === 'en' ? 'العربية' : 'الإنجليزية'
      const toLabel = target === 'en' ? 'الإنجليزية' : 'العربية'
      return `ترجم النص التالي من ${fromLabel} إلى ${toLabel}، مع الحفاظ على المصطلحات المالية والأسلوب الصحفي:\n\n${text}`
    }

    case 'excerpt':
      return `اكتب مقدمة موجزة (150–200 كلمة) تصلح كـ excerpt لهذا المقال:\n\n${content}`

    case 'headlines':
      return `اقترح 5 عناوين صحفية مختلفة لهذا المقال، كل عنوان في سطر جديد، مرتبة من الأقوى إلى الأضعف:\n\n${content}`

    case 'fact-check':
      return `افحص النص التالي وحدّد أي أرقام أو نسب مئوية أو إحصاءات قد تبدو غير منطقية أو تستحق التحقق. أجب بقائمة مرقّمة:\n\n${text}`

    default:
      return content
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const auth = await requireAuth()
  if (!auth.authenticated) {
    return unauthorizedResponse()
  }

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = streamActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    )
  }

  const input = parsed.data
  const systemPrompt = buildSystem(input)
  const userPrompt = buildUserPrompt(input)

  // ── headlines: non-streaming, return JSON array of 5 strings ───────────────
  if (input.action === 'headlines') {
    try {
      // Try structured output first
      const result = await generateText({
        model: MODEL,
        output: Output.object({
          schema: z.object({
            headlines: z
              .array(z.string())
              .length(5)
              .describe('Five Arabic headlines from strongest to weakest'),
          }),
        }),
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 1000,
      })

      const headlinesOutput = result.output as { headlines?: string[] } | null

      if (headlinesOutput?.headlines && Array.isArray(headlinesOutput.headlines)) {
        return NextResponse.json({ headlines: headlinesOutput.headlines })
      }

      // Fallback: parse free-text response by newlines
      const textResult = await generateText({
        model: MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 1000,
      })
      const headlines = textResult.text
        .split('\n')
        .map((l) => l.replace(/^\d+[\.\-\)]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 5)

      return NextResponse.json({ headlines })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json(
        { error: `فشل توليد العناوين: ${message}` },
        { status: 500 }
      )
    }
  }

  // ── All other actions: plain text stream ────────────────────────────────────
  try {
    const result = streamText({
      model: MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 2000,
    })

    return result.toTextStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `فشل معالجة الطلب: ${message}` },
      { status: 500 }
    )
  }
}
