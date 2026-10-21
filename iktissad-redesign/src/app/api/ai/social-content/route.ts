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
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import {
  socialContentSchema,
  SOCIAL_CONTENT_MODEL,
  buildSocialSystem,
  buildSocialPrompt,
} from '@/lib/ai/social-content'


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
      model: SOCIAL_CONTENT_MODEL,
      system: buildSocialSystem(input.platform),
      prompt: buildSocialPrompt(input),
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
