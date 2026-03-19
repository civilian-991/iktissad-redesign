/**
 * GEO Analysis API Route
 * /api/ai/geo-analysis
 *
 * POST — Analyzes Arabic financial article for AI search engine readiness
 * (Generative Engine Optimization). Returns structured suggestions for
 * Perplexity, ChatGPT, Gemini citation optimization.
 *
 * Uses generateText + Output.object() for structured JSON output.
 *
 * Request:  { articleId?, title, content, articleType?, keyword? }
 * Response: { geoAnalysis: GEOAnalysisResult }
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
// Model
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = anthropic('claude-sonnet-4.6')

// ─────────────────────────────────────────────────────────────────────────────
// Request schema
// ─────────────────────────────────────────────────────────────────────────────

const requestSchema = z.object({
  articleId: z.string().optional(),
  title: z.string().min(1, 'العنوان مطلوب'),
  content: z.string().min(1, 'المحتوى مطلوب'),
  articleType: z.string().optional(),
  keyword: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Output schema (for structured AI response)
// ─────────────────────────────────────────────────────────────────────────────

const geoOutputSchema = z.object({
  geoAnalysis: z.object({
    readinessScore: z
      .number()
      .min(0)
      .max(100)
      .describe('Overall AI search readiness score from 0 to 100'),
    directAnswerParagraph: z
      .string()
      .describe(
        'Suggested direct answer paragraph in Arabic (2-3 sentences) that AI search engines can surface as a citation'
      ),
    directAnswerExists: z
      .boolean()
      .describe(
        'Whether the article already begins with a clear direct-answer paragraph'
      ),
    faqSuggestions: z
      .array(
        z.object({
          question: z
            .string()
            .describe('Arabic question that readers might ask AI search engines'),
          answer: z
            .string()
            .describe(
              'Concise Arabic answer in 1-2 sentences suitable for AI citation'
            ),
        })
      )
      .min(3)
      .max(5)
      .describe('3 to 5 FAQ pairs derived from the article content'),
    citationFormatting: z.object({
      score: z
        .number()
        .min(0)
        .max(100)
        .describe('Score from 0-100 reflecting how well sources are cited'),
      suggestions: z
        .array(z.string())
        .describe(
          'Actionable suggestions to improve source citation for AI attribution'
        ),
    }),
    structuredDataRecommendations: z
      .array(
        z.object({
          schemaType: z
            .string()
            .describe(
              "JSON-LD schema type such as '@NewsArticle', '@FAQPage', '@Article'"
            ),
          reason: z
            .string()
            .describe('Arabic explanation of why this schema type helps AI search'),
          snippet: z
            .string()
            .describe('Minimal JSON-LD example string for this schema type'),
        })
      )
      .describe('Recommended JSON-LD structured data schema types'),
    improvements: z
      .array(z.string())
      .min(3)
      .max(5)
      .describe(
        '3 to 5 actionable Arabic improvement suggestions for AI search readiness'
      ),
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Exported result type (used by GEOPanel component)
// ─────────────────────────────────────────────────────────────────────────────

export type GEOAnalysisResult = z.infer<
  typeof geoOutputSchema
>['geoAnalysis']

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

function buildPrompt(
  title: string,
  content: string,
  keyword?: string
): string {
  const contentSnippet = content.slice(0, 3000)
  const keywordLine = keyword
    ? `الكلمة المفتاحية المستهدفة: ${keyword}\n`
    : ''

  return `أنت خبير في تحسين المحتوى لمحركات البحث بالذكاء الاصطناعي (GEO — Generative Engine Optimization). مهمتك تحليل مقال اقتصادي عربي وتقديم توصيات شاملة لتحسين ظهوره كمصدر موثوق في نتائج Perplexity وChatGPT وGemini.

عنوان المقال: ${title}
${keywordLine}
مقتطف من المحتوى:
${contentSnippet}

---

قيّم المقال وأنشئ تحليل GEO شاملاً يتضمن:

1. **درجة الجاهزية لمحركات الذكاء الاصطناعي** (0-100):
   - هل يبدأ المقال بإجابة مباشرة وواضحة؟ (أهم معيار)
   - هل المحتوى منظم ومهيكل؟
   - هل تُذكر المصادر والأرقام بوضوح؟
   - هل المحتوى يجيب على أسئلة محددة؟

2. **فقرة الإجابة المباشرة** (2-3 جمل بالعربية):
   - ملخص دقيق يجيب على السؤال الجوهري للمقال
   - مكتوب بصيغة تقتبسها محركات الذكاء الاصطناعي مباشرةً
   - يتضمن أرقاماً أو حقائق محددة إن وُجدت

3. **هل يحتوي المقال على إجابة مباشرة في بدايته؟** (true/false)

4. **3-5 أسئلة متكررة مع إجاباتها** (بالعربية):
   - أسئلة يطرحها القراء على محركات الذكاء الاصطناعي حول هذا الموضوع
   - إجابات موجزة (1-2 جمل) مناسبة للاقتباس المباشر

5. **تقييم جودة الاستشهاد بالمصادر** (0-100) + اقتراحات التحسين:
   - هل تُذكر مصادر بيانات محددة؟
   - هل التواريخ والأرقام موثقة؟
   - اقتراحات لتحسين الاستشهادات

6. **توصيات البيانات المنظمة** (JSON-LD):
   - حدد أنواع Schema المناسبة: @NewsArticle، @FAQPage، @Article
   - لكل نوع: سبب التوصية + مثال JSON-LD مبسط
   - مثال JSON-LD يجب أن يكون سلسلة نصية واحدة (JSON مضغوط)

7. **3-5 اقتراحات تحسين عملية** (بالعربية):
   - إجراءات محددة لرفع درجة الجاهزية
   - مرتبة حسب الأولوية والتأثير

اجعل جميع النصوص العربية واضحة ومهنية ومناسبة للمحتوى الاقتصادي والمالي.`
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

  const { title, content, articleType, keyword } = parsed.data
  const systemPrompt = buildSystem(articleType)
  const userPrompt = buildPrompt(title, content, keyword)

  try {
    // Primary: structured output via Output.object()
    const result = await generateText({
      model: MODEL,
      output: Output.object({ schema: geoOutputSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 2400,
    })

    const output = result.output as z.infer<typeof geoOutputSchema> | null

    if (output?.geoAnalysis) {
      return NextResponse.json({ data: output })
    }

    // Fallback: free-text response with JSON extraction
    const fallbackResult = await generateText({
      model: MODEL,
      system: systemPrompt,
      prompt:
        userPrompt +
        '\n\nأجب بتنسيق JSON فقط يطابق هذا الشكل: {"geoAnalysis":{"readinessScore":0,"directAnswerParagraph":"...","directAnswerExists":false,"faqSuggestions":[{"question":"...","answer":"..."}],"citationFormatting":{"score":0,"suggestions":[]},"structuredDataRecommendations":[{"schemaType":"...","reason":"...","snippet":"..."}],"improvements":[]}}',
      maxOutputTokens: 2400,
    })

    const jsonMatch = fallbackResult.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const fallbackParsed = JSON.parse(jsonMatch[0])
        const validated = geoOutputSchema.safeParse(fallbackParsed)
        if (validated.success) {
          return NextResponse.json({ data: validated.data })
        }
      } catch {
        // JSON parse failed — fall through to error
      }
    }

    return NextResponse.json(
      { error: 'فشل تحليل GEO — يرجى المحاولة مجدداً' },
      { status: 500 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[geo-analysis] error:', err)
    return NextResponse.json(
      { error: `فشل تحليل GEO: ${message}` },
      { status: 500 }
    )
  }
}
