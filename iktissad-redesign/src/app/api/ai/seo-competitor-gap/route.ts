/**
 * SEO Competitor Gap API Route
 * /api/ai/seo-competitor-gap
 *
 * Streaming endpoint for competitor content gap analysis.
 * Given a draft article + target keyword, asks the AI to identify 3 specific
 * angles/facts/data that top-ranking Arabic articles on this keyword cover
 * but the current draft is missing.
 *
 * Uses AI SDK streamText + toTextStreamResponse for streaming.
 */

import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const competitorGapSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  content: z.string(),
  targetKeyword: z.string().min(1, 'الكلمة المفتاحية مطلوبة'),
  articleType: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Model
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = anthropic('claude-sonnet-4.6')

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

  const parsed = competitorGapSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    )
  }

  const { title, content, targetKeyword, articleType } = parsed.data

  const systemPrompt = `أنت محرر صحفي مالي خبير في المحتوى العربي ومحركات البحث. مهمتك تحليل مسودات المقالات وتحديد الثغرات مقارنةً بالمقالات المتصدرة لنتائج البحث. استخدم الأرقام الغربية (0-9) دائماً، لا الأرقام الهندية (الأرقام العربية الشرقية).`

  const userPrompt = `أنت محرر صحفي مالي خبير في المحتوى العربي ومحركات البحث.

المقال الحالي:
العنوان: ${title}
الكلمة المفتاحية: ${targetKeyword}
نوع المقال: ${articleType ?? 'غير محدد'}

المحتوى:
${content.slice(0, 1500)}

مهمتك: حدّد بإيجاز 3 زوايا أو معلومات أو بيانات محددة يتوقع القارئ العربي إيجادها في مقال متصدر لنتائج البحث حول هذا الموضوع، ولكنها غائبة عن المسودة الحالية.

اكتب فقط قائمة مرقمة من 3 نقاط، كل نقطة جملة واحدة مختصرة. لا مقدمة ولا خاتمة.`

  try {
    const result = streamText({
      model: MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 600,
    })

    return result.toTextStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `فشل تحليل الفجوات: ${message}` },
      { status: 500 }
    )
  }
}
