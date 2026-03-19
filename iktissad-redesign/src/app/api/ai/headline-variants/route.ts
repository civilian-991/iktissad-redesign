/**
 * AI Headline Variants API Route
 * /api/ai/headline-variants
 *
 * POST — generates 5 Arabic headline variants with different journalistic angles.
 * Uses generateText + Output.object() for structured JSON output.
 *
 * Request:  { articleId?, title, content, articleType? }
 * Response: { variants: HeadlineVariant[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import {
  buildSystemPrompt,
  buildContextFragment,
  ArticleType,
} from '@/lib/ai/arabic-editorial'

// ─────────────────────────────────────────────────────────────────────────────
// Types (exported for client usage)
// ─────────────────────────────────────────────────────────────────────────────

export interface HeadlineVariant {
  headline: string
  angle: string
  ctrScore: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const requestSchema = z.object({
  articleId: z.string().optional(),
  title: z.string().min(1, 'العنوان مطلوب'),
  content: z.string().min(1, 'المحتوى مطلوب'),
  articleType: z.string().optional(),
})

const variantsOutputSchema = z.object({
  variants: z
    .array(
      z.object({
        headline: z.string().describe('Arabic headline text'),
        angle: z
          .string()
          .describe('Short Arabic description of the journalistic angle used'),
        ctrScore: z
          .number()
          .min(1)
          .max(100)
          .describe(
            'Estimated CTR score 1-100 based on Arabic financial audience engagement patterns'
          ),
      })
    )
    .length(5)
    .describe('Five Arabic headline variants with different journalistic angles'),
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = anthropic('claude-sonnet-4.6')

function resolveArticleType(value?: string): ArticleType | undefined {
  if (!value) return undefined
  const values = Object.values(ArticleType) as string[]
  return values.includes(value) ? (value as ArticleType) : undefined
}

function buildSystem(articleType?: string): string {
  const type = resolveArticleType(articleType)
  if (type) {
    return buildSystemPrompt({ articleType: type })
  }
  return buildContextFragment()
}

function buildPrompt(title: string, content: string): string {
  // Trim content to avoid excessive token usage
  const contentSnippet = content.slice(0, 2000)

  return `أنت محرر صحفي متخصص في المحتوى المالي والاقتصادي العربي. مهمتك توليد 5 عناوين صحفية متميزة لهذا المقال، كل عنوان يتبنى زاوية صحفية مختلفة.

العنوان الحالي: ${title}

مقتطف من المحتوى:
${contentSnippet}

---

أنشئ 5 عناوين بديلة تغطي هذه الزوايا الصحفية المختلفة:
1. **نهج البيانات الأولى** — يبدأ بأرقام أو إحصاءات محددة لجذب القراء
2. **الأسلوب التساؤلي** — يطرح سؤالاً يثير الفضول ويدفع للقراءة
3. **السرد القصصي** — يروي قصة أو موقفاً لخلق الارتباط العاطفي
4. **الإلحاح والتأثير** — يوضح التأثير الفوري والأهمية العاجلة
5. **السلطة والخبرة** — يستند إلى مصادر موثوقة أو تحليل متعمق

لكل عنوان، قيّم نقاط CTR المتوقعة (1-100) بناءً على:
- مدى توافقه مع اهتمامات القراء الماليين العرب
- قوة الكلمات المستخدمة وجاذبيتها
- الوضوح وسهولة الفهم
- الحداثة والتميز عن العناوين الاعتيادية

اكتب اسم الزاوية بالعربية (مثل: "نهج البيانات الأولى"، "الأسلوب التساؤلي"، إلخ).`
}

// ─────────────────────────────────────────────────────────────────────────────
// POST Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
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

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    )
  }

  const { title, content, articleType } = parsed.data
  const systemPrompt = buildSystem(articleType)
  const userPrompt = buildPrompt(title, content)

  try {
    // Primary: structured output via Output.object()
    const result = await generateText({
      model: MODEL,
      output: Output.object({ schema: variantsOutputSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 1200,
    })

    const output = result.output as { variants?: HeadlineVariant[] } | null

    if (output?.variants && Array.isArray(output.variants) && output.variants.length > 0) {
      return NextResponse.json({ variants: output.variants })
    }

    // Fallback: free-text response parsed manually
    const fallbackResult = await generateText({
      model: MODEL,
      system: systemPrompt,
      prompt:
        userPrompt +
        '\n\nأجب بتنسيق JSON فقط: {"variants":[{"headline":"...","angle":"...","ctrScore":0},...]}',
      maxOutputTokens: 1200,
    })

    // Try to extract JSON from the response
    const jsonMatch = fallbackResult.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.variants && Array.isArray(parsed.variants)) {
          return NextResponse.json({ variants: parsed.variants.slice(0, 5) })
        }
      } catch {
        // JSON parse failed — fall through to error
      }
    }

    return NextResponse.json(
      { error: 'فشل توليد متغيرات العناوين — يرجى المحاولة مجدداً' },
      { status: 500 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `فشل توليد العناوين: ${message}` },
      { status: 500 }
    )
  }
}
