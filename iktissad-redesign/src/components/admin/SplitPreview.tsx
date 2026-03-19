'use client'

import React, { useState, useCallback } from 'react'
import type { JSONContent } from '@tiptap/core'
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  Share2,
  Copy,
  Check,
  Loader2,
  Eye,
} from 'lucide-react'
import TipTapRenderer from './TipTapRenderer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SplitPreviewProps {
  content: JSONContent | string | null
  title: string
  excerpt?: string
  featuredImageUrl?: string
  articleType?: string
  isOpen: boolean
  onClose: () => void
  articleId?: string | number
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile'

interface ShareModalState {
  open: boolean
  loading: boolean
  url: string | null
  error: string | null
  copied: boolean
}

// ---------------------------------------------------------------------------
// Viewport config
// ---------------------------------------------------------------------------

const VIEWPORT_CONFIG: Record<ViewportMode, { label: string; maxWidth: string; icon: React.ReactNode }> = {
  desktop: {
    label: 'سطح المكتب',
    maxWidth: '860px',
    icon: <Monitor size={16} />,
  },
  tablet: {
    label: 'لوحي',
    maxWidth: '640px',
    icon: <Tablet size={16} />,
  },
  mobile: {
    label: 'جوال',
    maxWidth: '390px',
    icon: <Smartphone size={16} />,
  },
}

// ---------------------------------------------------------------------------
// Watermark overlay
// ---------------------------------------------------------------------------

function WatermarkOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <span
        className="opacity-10 text-9xl font-black text-zinc-400 rotate-[-30deg] whitespace-nowrap"
        style={{ fontSize: '8rem' }}
      >
        مسودة
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Share modal
// ---------------------------------------------------------------------------

interface ShareModalProps {
  state: ShareModalState
  onCopy: () => void
  onClose: () => void
}

function ShareModal({ state, onCopy, onClose }: ShareModalProps) {
  if (!state.open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="رابط المعاينة"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">رابط المعاينة</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {state.loading && (
          <div className="flex items-center gap-3 text-zinc-300 py-4">
            <Loader2 size={20} className="animate-spin text-amber-500" />
            <span>جارٍ إنشاء الرابط…</span>
          </div>
        )}

        {state.error && !state.loading && (
          <p className="text-red-400 text-sm py-2">{state.error}</p>
        )}

        {state.url && !state.loading && (
          <>
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-3 mb-3">
              <input
                readOnly
                value={state.url}
                dir="ltr"
                className="flex-1 bg-transparent text-zinc-200 text-sm outline-none truncate"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={onCopy}
                className="text-amber-400 hover:text-amber-300 transition-colors shrink-0"
                aria-label="نسخ الرابط"
              >
                {state.copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-zinc-500 text-xs text-right">
              الرابط صالح لمدة 48 ساعة
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SplitPreview({
  content,
  title,
  excerpt,
  featuredImageUrl,
  articleType,
  isOpen,
  onClose,
  articleId,
}: SplitPreviewProps) {
  const [viewport, setViewport] = useState<ViewportMode>('desktop')
  const [watermark, setWatermark] = useState(true)
  const [share, setShare] = useState<ShareModalState>({
    open: false,
    loading: false,
    url: null,
    error: null,
    copied: false,
  })

  // -------------------------------------------------------------------
  // Share link generation
  // -------------------------------------------------------------------

  const handleShare = useCallback(async () => {
    if (!articleId) {
      setShare({ open: true, loading: false, url: null, error: 'لم يتم تحديد معرّف المقال', copied: false })
      return
    }

    setShare({ open: true, loading: true, url: null, error: null, copied: false })

    try {
      const res = await fetch('/api/preview/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      })

      const json = (await res.json()) as { data?: { token: string; url: string }; error?: string }

      if (!res.ok || json.error || !json.data) {
        setShare((prev) => ({
          ...prev,
          loading: false,
          error: json.error ?? 'فشل إنشاء الرابط. حاول مرة أخرى.',
        }))
        return
      }

      const fullUrl = `${window.location.origin}${json.data.url}`
      setShare({ open: true, loading: false, url: fullUrl, error: null, copied: false })
    } catch {
      setShare((prev) => ({
        ...prev,
        loading: false,
        error: 'حدث خطأ في الاتصال. حاول مرة أخرى.',
      }))
    }
  }, [articleId])

  const handleCopy = useCallback(() => {
    if (!share.url) return
    navigator.clipboard.writeText(share.url).then(() => {
      setShare((prev) => ({ ...prev, copied: true }))
      setTimeout(() => setShare((prev) => ({ ...prev, copied: false })), 2000)
    })
  }, [share.url])

  const closeShareModal = useCallback(() => {
    setShare({ open: false, loading: false, url: null, error: null, copied: false })
  }, [])

  // -------------------------------------------------------------------
  // Keyboard close
  // -------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  if (!isOpen) return null

  const { maxWidth } = VIEWPORT_CONFIG[viewport]

  return (
    <>
      {/* Main overlay */}
      <div
        className="fixed inset-0 z-50 bg-zinc-950 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="معاينة المقال"
        onKeyDown={handleKeyDown}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header bar                                                        */}
        {/* ---------------------------------------------------------------- */}
        <header className="h-14 shrink-0 bg-zinc-900 border-b border-zinc-800 flex items-center gap-3 px-4">
          {/* Title */}
          <div className="flex items-center gap-2 text-white mr-auto">
            <Eye size={18} className="text-amber-500" />
            <span className="font-semibold text-sm">معاينة المقال</span>
          </div>

          {/* Viewport toggles */}
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
            {(Object.keys(VIEWPORT_CONFIG) as ViewportMode[]).map((mode) => {
              const cfg = VIEWPORT_CONFIG[mode]
              const active = viewport === mode
              return (
                <button
                  key={mode}
                  onClick={() => setViewport(mode)}
                  title={cfg.label}
                  aria-label={cfg.label}
                  aria-pressed={active}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                    active
                      ? 'bg-amber-500 text-zinc-900'
                      : 'text-zinc-400 hover:text-white',
                  ].join(' ')}
                >
                  {cfg.icon}
                  <span className="hidden sm:inline">{cfg.label}</span>
                </button>
              )
            })}
          </div>

          {/* Watermark toggle */}
          <button
            onClick={() => setWatermark((v) => !v)}
            title={watermark ? 'إخفاء العلامة المائية' : 'إظهار العلامة المائية'}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200',
              watermark
                ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                : 'border-zinc-700 text-zinc-400 hover:text-white',
            ].join(' ')}
          >
            {watermark ? 'مسودة بعلامة مائية' : 'معاينة نظيفة'}
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 transition-all duration-200"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">نشر رابط للمراجعة</span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="إغلاق المعاينة"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-200"
          >
            <X size={18} />
          </button>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Preview body                                                      */}
        {/* ---------------------------------------------------------------- */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 flex justify-center py-8 px-4">
          <div
            className="w-full transition-all duration-300 relative"
            style={{ maxWidth }}
          >
            {/* Article content card */}
            <div className="bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl relative">
              {/* Watermark */}
              {watermark && <WatermarkOverlay />}

              {/* Content */}
              <div className="p-6 sm:p-8 font-[Tajawal,sans-serif]">
                {/* Featured image */}
                {featuredImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featuredImageUrl}
                    alt={title}
                    className="w-full rounded-lg mb-6 object-cover max-h-80"
                  />
                )}

                {/* Article type badge */}
                {articleType && (
                  <span className="inline-block bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                    {articleType}
                  </span>
                )}

                {/* Title */}
                {title && (
                  <h1
                    dir="rtl"
                    className="text-4xl font-bold text-white leading-snug mb-4 font-serif"
                  >
                    {title}
                  </h1>
                )}

                {/* Excerpt */}
                {excerpt && (
                  <p
                    dir="rtl"
                    className="text-zinc-400 text-lg mb-8 border-b border-zinc-800 pb-8 leading-relaxed"
                  >
                    {excerpt}
                  </p>
                )}

                {/* Body */}
                <TipTapRenderer content={content} />

                {/* Empty state */}
                {!content && (
                  <div className="text-center py-16 text-zinc-600">
                    <Eye size={40} className="mx-auto mb-4 opacity-40" />
                    <p className="text-sm">لا يوجد محتوى للمعاينة بعد</p>
                  </div>
                )}
              </div>
            </div>

            {/* Viewport label */}
            <p className="text-center text-zinc-600 text-xs mt-3">
              {VIEWPORT_CONFIG[viewport].label} — {maxWidth}
            </p>
          </div>
        </main>
      </div>

      {/* Share modal rendered outside the overlay for correct z-index */}
      <ShareModal state={share} onCopy={handleCopy} onClose={closeShareModal} />
    </>
  )
}
