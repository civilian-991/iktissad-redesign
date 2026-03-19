'use client'

/**
 * PreviewClient — client component for the tokenized draft preview page.
 *
 * Renders the article using TipTapRenderer (same as production).
 * Shows a draft watermark banner when the article is not published.
 */

import type { JSONContent } from '@tiptap/core'
import Image from 'next/image'
import { Clock, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import TipTapRenderer from '@/components/admin/TipTapRenderer'

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
}

interface PreviewClientProps {
  article: ArticleRow
  isDraft: boolean
  expiresAt: string
}

const ARTICLE_TYPE_LABELS: Record<string, string> = {
  news: 'خبر',
  report: 'تقرير',
  analysis: 'تحليل',
  interview: 'مقابلة',
  opinion: 'رأي',
}

export default function PreviewClient({ article, isDraft, expiresAt }: PreviewClientProps) {
  const [showWatermark, setShowWatermark] = useState(isDraft)

  // Prefer block-based body over HTML content string
  const bodyContent = article.body
    ? (article.body as JSONContent)
    : (article.content || null)

  const expiresDate = new Date(expiresAt)
  const expiresLabel = expiresDate.toLocaleString('ar-SA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-zinc-950 text-white" dir="rtl">

      {/* ── Preview banner ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-amber-900/90 backdrop-blur border-b border-amber-700">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-sm flex-wrap">
          <div className="flex items-center gap-2 text-amber-200">
            <Clock size={14} className="shrink-0" />
            <span>
              {isDraft ? 'معاينة مسودة' : 'معاينة مشاركة'}
              {' · '}
              <span className="text-amber-400 font-medium">
                رابط صالح حتى {expiresLabel}
              </span>
            </span>
          </div>

          {isDraft && (
            <button
              type="button"
              onClick={() => setShowWatermark((v) => !v)}
              className="flex items-center gap-1.5 text-amber-300 hover:text-amber-100 transition-colors text-xs"
            >
              {showWatermark ? <EyeOff size={13} /> : <Eye size={13} />}
              {showWatermark ? 'إخفاء العلامة المائية' : 'إظهار العلامة المائية'}
            </button>
          )}
        </div>
      </div>

      {/* ── Watermark overlay ──────────────────────────────────────────── */}
      {showWatermark && isDraft && (
        <div
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          <p
            className="text-[10vw] font-black text-white/[0.04] select-none whitespace-nowrap"
            style={{ transform: 'rotate(-35deg)' }}
          >
            مسودة · مسودة · مسودة
          </p>
        </div>
      )}

      {/* ── Article ────────────────────────────────────────────────────── */}
      <article className="max-w-3xl mx-auto px-4 py-12 space-y-8">

        {/* Article type badge */}
        {article.article_type && ARTICLE_TYPE_LABELS[article.article_type] && (
          <span className="inline-block rounded-full bg-amber-900/40 border border-amber-700/60 px-3 py-1 text-xs font-medium text-amber-300">
            {ARTICLE_TYPE_LABELS[article.article_type]}
          </span>
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold leading-snug text-white">
          {article.title}
        </h1>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-lg text-zinc-400 leading-relaxed border-r-4 border-amber-600 pr-4">
            {article.excerpt}
          </p>
        )}

        {/* Featured image */}
        {article.featured_image && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-800">
            <Image
              src={article.featured_image}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        {/* Divider */}
        <hr className="border-zinc-800" />

        {/* Body */}
        <div className="prose prose-invert prose-zinc max-w-none text-right">
          <TipTapRenderer content={bodyContent} />
        </div>

      </article>

      {/* ── Footer notice ──────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 py-8 text-center">
        <p className="text-xs text-zinc-600">
          هذا رابط معاينة خاص — لا تنشره علنياً
        </p>
      </footer>
    </div>
  )
}
