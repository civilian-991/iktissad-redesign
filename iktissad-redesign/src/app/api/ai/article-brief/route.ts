/**
 * AI Article Brief Generator API Route
 * /api/ai/article-brief
 *
 * POST — generates a full Arabic editorial brief for a given topic.
 * Uses generateText + Output.object() for structured JSON output.
 *
 * Request:  { topic, articleType?, language? }
 * Response: { brief: ArticleBrief }
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import {
  buildSystemPrompt,
  buildContextFragment,
  buildArticleOutline,
  ArticleType,
  ALL_ARTICLE_TYPES,
  WORD_COUNT_TARGETS,
  ARTICLE_TYPE_CONFIGS,
} from '@/lib/ai/arabic-editorial'

// ─────────────────────────────────────────────────────────────────────────────
// Types (exported for client usage)
// ─────────────────────────────────────────────────────────────────────────────

export interface OutlineSection {
  title: string
  description: string
  targetWords: number
}

export interface ArticleBrief {
  recommendedType: string
  recommendedTypeReason: string
  suggestedAngle: string
  keyPoints: string[]
  seoKeywords: string[]
  targetWordCount: { min: number; max: number }
  suggestedHeadline: string
  suggestedSources: string[]
  introduction: string
  outlineSections: OutlineSection[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Model
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = anthropic('claude-sonnet-4.6')

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────────────────────────

const requestSchema = z.object({
  topic: z.string().min(1, 'الموضوع مطلوب').max(500),
  articleType: z.string().optional(),
  language: z.enum(['ar', 'en']).default('ar'),
})

const briefOutputSchema = z.object({
  brief: z.object({
    recommendedType: z
      .string()
      .describe('The recommended article type in Arabic (e.g. خبر, تقرير, تحليل, مقابلة, رأي)'),
    recommendedTypeReason: z
      .string()
      .describe('One sentence explaining why this article type fits the topic (in Arabic)'),
    suggestedAngle: z
      .string()
      .describe('The unique editorial angle or thesis for this article (in Arabic)'),
    keyPoints: z
      .array(z.string())
      .min(5)
      .max(7)
      .describe('5 to 7 key points the article should cover (in Arabic)'),
    seoKeywords: z
      .array(z.string())
      .length(5)
      .describe('5 target SEO keywords in Arabic relevant to MENA/GCC financial audience'),
    targetWordCount: z
      .object({
        min: z.number().int().positive(),
        max: z.number().int().positive(),
      })
      .describe('Recommended word count range for this article type'),
    suggestedHeadline: z
      .string()
      .describe('A compelling draft headline for the article (in Arabic)'),
    suggestedSources: z
      .array(z.string())
      .min(2)
      .max(6)
      .describe(
        'Organisations, institutions, or public figures to seek quotes or data from (in Arabic)'
      ),
    introduction: z
      .string()
      .describe('A draft opening paragraph (2–4 sentences) that hooks the reader (in Arabic)'),
    outlineSections: z
      .array(
        z.object({
          title: z.string().describe('Section heading in Arabic'),
          description: z
            .string()
            .describe('One sentence describing what this section should cover'),
          targetWords: z.number().int().positive().describe('Target word count for this section'),
        })
      )
      .min(3)
      .max(8)
      .describe('Ordered list of article sections with headings, descriptions, and word targets'),
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function resolveArticleType(value?: string): ArticleType | undefined {
  if (!value) return undefined
  const values = Object.values(ArticleType) as string[]
  return values.includes(value) ? (value as ArticleType) : undefined
}

function getWordCountForType(type: ArticleType): { min: number; max: number } {
  const target = WORD_COUNT_TARGETS[type]
  return { min: target.min, max: target.max }
}

function getArabicTypeName(type: ArticleType): string {
  const config = ARTICLE_TYPE_CONFIGS[type]
  return config?.arabicName ?? type
}

/** Build the system prompt, incorporating any known article type. */
function buildSystem(articleType?: ArticleType): string {
  if (articleType) {
    return buildSystemPrompt({ articleType })
  }
  return buildContextFragment()
}

/** Build the user prompt asking for a full editorial brief. */
function buildPrompt(topic: string, language: 'ar' | 'en', articleType?: ArticleType): string {
  const isArabic = language === 'ar'

  // Build context about all available article types
  const typesList = ALL_ARTICLE_TYPES.map((t) => {
    const name = getArabicTypeName(t)
    const wc = getWordCountForType(t)
    return `- ${name} (${wc.min}–${wc.max} كلمة)`
  }).join('\n')

  // If a specific type was requested, inject outline context
  let outlineContext = ''
  if (articleType) {
    const outline = buildArticleOutline(articleType)
    const arabicName = getArabicTypeName(articleType)
    outlineContext = `\n\nهيكل ${arabicName} الموصى به:\n${outline}`
  }

  if (isArabic) {
    return `أنت محرر صحفي خبير متخصص في الصحافة المالية والاقتصادية للمنطقة العربية وخاصة دول مجلس التعاون الخليجي.

الموضوع المقترح: "${topic}"

أنواع المقالات المتاحة:
${typesList}
${outlineContext}

مهمتك إعداد موجز تحريري شامل لهذا الموضوع يشمل:

1. **نوع المقال الموصى به**: اختر من بين الأنواع المتاحة الأنسب لهذا الموضوع، مع شرح موجز للسبب.
2. **الزاوية التحريرية**: حدد الزاوية أو الأطروحة الرئيسية التي تجعل المقال مميزاً وذا قيمة للقارئ المالي العربي.
3. **النقاط المحورية**: 5–7 نقاط جوهرية يجب أن يغطيها المقال، مرتبة حسب الأهمية.
4. **كلمات SEO المستهدفة**: 5 كلمات أو عبارات مفتاحية بالعربية تستهدف الجمهور المالي والاقتصادي في المنطقة.
5. **عدد الكلمات المستهدف**: نطاق عدد الكلمات المناسب لهذا النوع من المقالات.
6. **العنوان المقترح**: عنوان صحفي جذاب يناسب الجمهور العربي ويحقق معدل نقر مرتفع.
7. **المصادر المقترحة**: 2–6 مؤسسات أو أشخاص يمكن الاستشهاد بهم أو طلب تعليقات منهم.
8. **المقدمة الافتتاحية**: فقرة افتتاحية مقترحة (جملتان إلى أربع جمل) تشد القارئ وتضعه في سياق الموضوع.
9. **هيكل المقال**: قائمة مرتبة من 3–8 أقسام مع عنوان كل قسم ووصف موجز وعدد الكلمات المستهدف.

التزم بالمعايير التحريرية العربية العالية، وأشر إلى البيانات الاقتصادية المحلية والإقليمية حيثما أمكن.`
  }

  // English prompt (for language='en')
  return `You are an expert editor specialising in Arabic-language financial and economic journalism, covering the MENA and GCC regions.

Proposed topic: "${topic}"

Available article types:
${typesList}
${outlineContext}

Generate a comprehensive editorial brief for this topic including: recommended article type with reasoning, unique editorial angle, 5–7 key points, 5 Arabic SEO keywords, word count targets, a compelling Arabic headline, 2–6 suggested sources, a draft Arabic introduction paragraph, and an ordered outline of 3–8 sections (each with a title, description, and word target).

All textual content in the brief (headline, introduction, section titles, key points, SEO keywords, etc.) must be written in Arabic regardless of this prompt language.`
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

  const { topic, articleType: articleTypeRaw, language } = parsed.data
  const articleType = resolveArticleType(articleTypeRaw)
  const systemPrompt = buildSystem(articleType)
  const userPrompt = buildPrompt(topic, language, articleType)

  try {
    // Primary: structured output via Output.object()
    const result = await generateText({
      model: MODEL,
      output: Output.object({ schema: briefOutputSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 2500,
    })

    const output = result.output as { brief?: ArticleBrief } | null

    if (output?.brief && typeof output.brief === 'object') {
      return NextResponse.json({ brief: output.brief })
    }

    // Fallback: unstructured text, ask for JSON directly
    const fallbackResult = await generateText({
      model: MODEL,
      system: systemPrompt,
      prompt:
        userPrompt +
        '\n\nأجب بتنسيق JSON فقط دون أي نص إضافي. يجب أن يكون الرد كائن JSON يحتوي على مفتاح "brief" مع جميع الحقول المطلوبة.',
      maxOutputTokens: 2500,
    })

    const jsonMatch = fallbackResult.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const fallbackParsed = JSON.parse(jsonMatch[0])
        const validated = briefOutputSchema.safeParse(fallbackParsed)
        if (validated.success) {
          return NextResponse.json({ brief: validated.data.brief })
        }
        // Return raw parsed if validation fails but data exists
        if (fallbackParsed.brief) {
          return NextResponse.json({ brief: fallbackParsed.brief })
        }
      } catch {
        // JSON parse failed — fall through to error
      }
    }

    return NextResponse.json(
      { error: 'فشل توليد الموجز التحريري — يرجى المحاولة مجدداً' },
      { status: 500 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `فشل توليد الموجز: ${message}` },
      { status: 500 }
    )
  }
}
