import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// POST /api/preview/token
//
// Generate a tokenized preview link for a draft article.
// Requires an active Supabase auth session.
//
// Request body: { articleId: string }  — UUID of the article
// Response:     { data: { token: string, expiresAt: string, url: string } }
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RequestBody {
  articleId?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Auth check
  const auth = await requireAuth()
  if (!auth.authenticated) return unauthorizedResponse()

  // 2. Parse and validate body
  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return NextResponse.json(
      { error: 'طلب غير صالح — يرجى إرسال JSON صحيح.' },
      { status: 400 }
    )
  }

  const { articleId } = body
  if (!articleId || !UUID_RE.test(articleId)) {
    return NextResponse.json(
      { error: 'قيمة articleId غير صالحة — يجب أن تكون UUID صحيحاً.' },
      { status: 400 }
    )
  }

  // 3. Generate token and expiry
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  // 4. Persist in Supabase (service-role bypasses RLS for the insert)
  const supabase = createAdminClient()

  const { error: dbError } = await supabase
    .from('preview_tokens' as never)
    .insert({
      token,
      article_id: articleId,
      created_by: auth.userId ?? null,
      expires_at: expiresAt,
    } as never)

  if (dbError) {
    console.error('[preview/token] Supabase insert error:', dbError)
    return NextResponse.json(
      { error: 'فشل إنشاء رابط المعاينة. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    )
  }

  // 5. Return token details
  return NextResponse.json({
    data: {
      token,
      expiresAt,
      url: `/preview/${token}`,
    },
  })
}
