import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// POST /api/preview/token
//
// Generate a tokenized preview link for a draft article.
// Requires an active Supabase auth session.
//
// Request body: { articleId: string | number }
// Response:     { data: { token: string, expiresAt: string, url: string } }
// ---------------------------------------------------------------------------

interface RequestBody {
  articleId?: string | number
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
  if (articleId === undefined || articleId === null || articleId === '') {
    return NextResponse.json(
      { error: 'حقل articleId مطلوب.' },
      { status: 400 }
    )
  }

  // Normalise articleId to a number (the DB column is bigint)
  const articleIdNum = Number(articleId)
  if (!Number.isFinite(articleIdNum) || articleIdNum <= 0) {
    return NextResponse.json(
      { error: 'قيمة articleId غير صالحة.' },
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
      article_id: articleIdNum,
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
