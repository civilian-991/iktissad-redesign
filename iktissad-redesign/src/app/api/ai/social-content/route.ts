/**
 * AI Social Content Generator
 * /api/ai/social-content
 *
 * Generates platform-native Arabic social media content from article data.
 * Returns a plain text stream via toTextStreamResponse() — consumed by the
 * distribute page's fetch() reader (non-browser-chat pattern).
 *
 * Platforms: tweet (X thread) | linkedin | telegram | tldr
 */

import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const socialContentSchema = z.object({
  articleId: z.string(),
  platform: z.enum(['tweet', 'linkedin', 'telegram', 'tldr']),
  title: z.string(),
  excerpt: z.string().optional().default(''),
  content: z.string().optional().default(''),
})

type SocialContentInput = z.infer<typeof socialContentSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Model
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = anthropic('claude-sonnet-4.6')

// ─────────────────────────────────────────────────────────────────────────────
// System + user prompts per platform
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_BASE = `أنت محرر رقمي متخصص في المحتوى المالي العربي. تكتب بأسلوب احترافي موجز يناسب القراء المهتمين بالاقتصاد والأعمال في المنطقة العربية. لا تستخدم وسوم HTML. اكتب بالعربية الفصحى المعاصرة.`

function buildSystem(platform: SocialContentInput['platform']): string {
  switch (platform) {
    case 'tweet':
      return `${SYSTEM_BASE}

أنت متخصص في صياغة خيوط تغريدات مالية عربية على منصة X (تويتر). قواعد صارمة:
- اكتب خمس تغريدات متسلسلة تشكّل خيطاً (Thread) متماسكاً
- ابدأ التغريدة الأولى بخطّاف قوي: رقم مفاجئ، سؤال استفزازي، أو حكم جريء
- كل تغريدة ≤ 280 حرفاً بما فيها الأرقام والمسافات
- رقّم كل تغريدة في بدايتها بالشكل: ١/٥ ، ٢/٥ ... إلخ
- التغريدة الأخيرة: دعوة واضحة للتفاعل أو قراءة المقال الكامل
- لا هاشتاق، لا روابط — المحتوى يتكلم وحده`

    case 'linkedin':
      return `${SYSTEM_BASE}

أنت متخصص في المحتوى المهني لـ LinkedIn العربي. معايير المنشور:
- 150 إلى 200 كلمة، لا أكثر
- ابدأ بجملة افتتاحية قوية تطرح الإشكالية أو الفرصة
- وسّع التحليل في فقرة أو فقرتين بمنطق اقتصادي واضح
- اختم بسؤال يدعو الجمهور المهني للتعليق أو المشاركة
- أسلوب: تحليلي، محترف، يُظهر عمق المعرفة الاقتصادية`

    case 'telegram':
      return `${SYSTEM_BASE}

أنت متخصص في محتوى قنوات Telegram المالية العربية. أسلوب المنشور:
- ابدأ بعنوان مختصر يكتب بخط عريض باستخدام **نص** (markdown Telegram)
- استخدم 📊 قبل الأرقام والإحصاءات المهمة
- استخدم 🔹 كنقاط رصاصة للنقاط الرئيسية
- استخدم ⚡️ للنتائج أو التوقعات
- اختم بـ 📌 وجملة تلخيصية واحدة
- المطلوب 120-180 كلمة، منسّق بوضوح لقراءة سريعة على الموبايل`

    case 'tldr':
      return `${SYSTEM_BASE}

مهمتك: كتابة ملخص ثلاثي النقاط (TL;DR) للمقال.
- ثلاث نقاط فقط، لا أقل ولا أكثر
- كل نقطة جملة واحدة موجزة لا تتجاوز 25 كلمة
- ابدأ كل نقطة برقم ثم نقطتين: ١. ... ٢. ... ٣. ...
- التركيز: الحقيقة الجوهرية، الأثر العملي، والنتيجة المتوقعة
- لا مقدمات، لا شروح إضافية — ثلاث نقاط فقط`
  }
}

function buildUserPrompt(input: SocialContentInput): string {
  const { platform, title, excerpt, content } = input
  const body = excerpt || content

  switch (platform) {
    case 'tweet':
      return `اكتب خيط تغريدات (5 تغريدات) حول هذا المقال الاقتصادي:

العنوان: ${title}
المقتطف: ${body}

تذكّر: كل تغريدة ≤ 280 حرفاً، رقّمها ١/٥ إلى ٥/٥.`

    case 'linkedin':
      return `اكتب منشور LinkedIn مهني (150-200 كلمة) حول:

العنوان: ${title}
المقتطف: ${body}`

    case 'telegram':
      return `اكتب منشور قناة Telegram (120-180 كلمة) منسّق حول:

العنوان: ${title}
المقتطف: ${body}`

    case 'tldr':
      return `اكتب ملخص ثلاثي النقاط (TL;DR) حول:

العنوان: ${title}
المقتطف: ${body}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) {
    return unauthorizedResponse()
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = socialContentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    )
  }

  const input = parsed.data

  try {
    const result = streamText({
      model: MODEL,
      system: buildSystem(input.platform),
      prompt: buildUserPrompt(input),
      maxOutputTokens: 1200,
    })

    return result.toTextStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `فشل توليد المحتوى: ${message}` },
      { status: 500 }
    )
  }
}
