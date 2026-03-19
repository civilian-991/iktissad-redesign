/**
 * AI Content Agent API Route
 * /api/ai/agent
 *
 * Streaming autonomous research + draft agent for IKTISSAD.
 * Uses AI SDK v6 streamText with tool-calling:
 *  - searchArchive: queries Supabase articles by keyword
 *
 * Returns an AI SDK v6 data stream (toDataStreamResponse).
 * Client reads lines prefixed with "0:" (text chunks) and "d:" (done).
 */

import { NextRequest, NextResponse } from 'next/server'
import { streamText, tool, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import { buildContextFragment } from '@/lib/ai/arabic-editorial'
import { createAdminClient } from '@/lib/supabase/admin'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = anthropic('claude-sonnet-4.6')
const MAX_ARCHIVE_RESULTS = 8

// ─────────────────────────────────────────────────────────────────────────────
// Request schema
// ─────────────────────────────────────────────────────────────────────────────

const agentRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
})

// ─────────────────────────────────────────────────────────────────────────────
// searchArchive tool — queries Supabase articles table for relevant context
// ─────────────────────────────────────────────────────────────────────────────

const searchArchiveTool = tool({
  description:
    'يبحث في أرشيف مقالات اقتصاد الداخلية عن محتوى ذي صلة بالموضوع المطلوب. استخدم هذه الأداة قبل كتابة أي مسودة لجمع السياق من المقالات السابقة.',
  parameters: z.object({
    query: z
      .string()
      .describe('نص البحث بالعربية أو الإنجليزية — موضوع، شركة، قطاع، أو كلمة مفتاحية'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_ARCHIVE_RESULTS)
      .optional()
      .default(5)
      .describe('عدد النتائج المطلوبة (الحد الأقصى 8)'),
  }),
  execute: async ({ query, limit }) => {
    try {
      const supabase = createAdminClient()

      // Full-text search on title + excerpt using ilike for broad match.
      // Falls back to a recency-based list if the query is empty.
      const safeLimit = Math.min(limit ?? 5, MAX_ARCHIVE_RESULTS)
      const searchTerm = `%${query.trim()}%`

      const { data, error } = await supabase
        .from('articles')
        .select('id, title, excerpt, published_at, section_id, status')
        .or(`title.ilike.${searchTerm},excerpt.ilike.${searchTerm}`)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(safeLimit) as {
          data: Array<{
            id: string
            title: string | null
            excerpt: string | null
            published_at: string | null
            section_id: string | null
            status: string | null
          }> | null
          error: unknown
        }

      if (error) {
        return {
          success: false,
          results: [],
          message: 'تعذّر البحث في الأرشيف.',
        }
      }

      const results = (data ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? '',
        excerpt: row.excerpt ?? '',
        publishedAt: row.published_at ?? '',
        sectionId: row.section_id ?? '',
      }))

      return {
        success: true,
        results,
        message:
          results.length > 0
            ? `وُجدت ${results.length} نتيجة ذات صلة في الأرشيف.`
            : 'لم تُوجد نتائج ذات صلة في الأرشيف لهذا الاستعلام.',
      }
    } catch {
      return {
        success: false,
        results: [],
        message: 'خطأ داخلي أثناء البحث في الأرشيف.',
      }
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await requireAuth()
  if (!auth.authenticated) {
    return unauthorizedResponse()
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = agentRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    )
  }

  const { message, conversationHistory } = parsed.data

  // ── Build messages ────────────────────────────────────────────────────────
  // Merge conversation history + new user message into a single messages array.
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...conversationHistory,
    { role: 'user', content: message },
  ]

  // ── System prompt (agent mode) ────────────────────────────────────────────
  const baseContext = buildContextFragment()
  const systemPrompt = `${baseContext}

أنت وكيل بحث وتحرير مستقل. مهمتك:
1. البحث في أرشيف المقالات باستخدام أداة searchArchive قبل الكتابة
2. توليد مسودة مقال منظّمة بالهيكل الصحفي المناسب
3. اقتراح روابط داخلية من المقالات التي وجدتها

عند الانتهاء من البحث والكتابة، أنتج ردّاً يحتوي على:

[ARTICLE_DRAFT_START]
المحتوى الكامل للمسودة
[ARTICLE_DRAFT_END]

[ARTICLE_META_START]
\`\`\`json
{"title":"...","excerpt":"...","type":"news|report|analysis|opinion|interview"}
\`\`\`
[ARTICLE_META_END]`

  // ── Stream ────────────────────────────────────────────────────────────────
  try {
    const result = streamText({
      model: MODEL,
      system: systemPrompt,
      messages,
      tools: {
        searchArchive: searchArchiveTool,
      },
      stopWhen: stepCountIs(5),
      maxOutputTokens: 4000,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `فشل معالجة طلب الوكيل: ${message}` },
      { status: 500 }
    )
  }
}
