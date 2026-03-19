/**
 * /preview/[token] — Tokenized draft preview page
 *
 * Publicly accessible (no auth required). Anyone with the link can view
 * the draft article. Token expires after 48 hours.
 *
 * Shows a watermark banner for non-published articles.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PreviewClient from './PreviewClient'

interface PreviewTokenRow {
  token: string
  article_id: string
  expires_at: string
  used_count: number
}

interface ArticleRow {
  id: string
  title: string
  excerpt: string
  content: string
  body: unknown
  featured_image: string
  status: string
  published_at: string | null
  article_type: string | null
  author_id: string | null
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function PreviewPage({ params }: PageProps) {
  const { token } = await params

  if (!token) notFound()

  const supabase = await createClient()

  // 1. Look up the token (publicly readable per RLS policy)
  const { data: tokenRow, error: tokenError } = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: PreviewTokenRow | null; error: unknown }>
        }
      }
    }
  }).from('preview_tokens')
    .select('token, article_id, expires_at, used_count')
    .eq('token', token)
    .single()

  if (tokenError || !tokenRow) notFound()

  // 2. Check expiry
  const expired = new Date(tokenRow.expires_at) < new Date()
  if (expired) {
    return <ExpiredPage />
  }

  // 3. Fetch the article
  const { data: article, error: articleError } = await supabase
    .from('articles' as never)
    .select('id, title, excerpt, content, body, featured_image, status, published_at, article_type, author_id')
    .eq('id', tokenRow.article_id)
    .single() as { data: ArticleRow | null; error: unknown }

  if (articleError || !article) notFound()

  // 4. Increment used_count (fire-and-forget, don't block render)
  void (supabase as unknown as {
    from: (t: string) => {
      update: (data: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<unknown>
      }
    }
  }).from('preview_tokens')
    .update({ used_count: tokenRow.used_count + 1 })
    .eq('token', token)

  const isDraft = article.status !== 'published'

  return (
    <PreviewClient
      article={article}
      isDraft={isDraft}
      expiresAt={tokenRow.expires_at}
    />
  )
}

// ---------------------------------------------------------------------------
// Expired state — shown as a server-rendered page, no client JS needed
// ---------------------------------------------------------------------------

function ExpiredPage() {
  return (
    <div
      className="min-h-screen bg-zinc-950 flex items-center justify-center"
      dir="rtl"
    >
      <div className="text-center space-y-4 px-6">
        <div className="text-5xl">🔒</div>
        <h1 className="text-2xl font-bold text-white">انتهت صلاحية الرابط</h1>
        <p className="text-zinc-400 text-sm max-w-xs mx-auto">
          رابط المعاينة هذا انتهت صلاحيته. يرجى طلب رابط جديد من المحرر.
        </p>
      </div>
    </div>
  )
}
