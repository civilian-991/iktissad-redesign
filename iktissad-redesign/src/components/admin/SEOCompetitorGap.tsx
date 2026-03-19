'use client'

/**
 * SEOCompetitorGap — AI-powered competitor content gap analysis widget.
 *
 * Sits inside the SEO panel area of the article editor. Given a target keyword,
 * it calls /api/ai/seo-competitor-gap and streams back 3 specific angles that
 * top-ranking Arabic articles on that keyword cover but the current draft misses.
 *
 * Design: matches the dark zinc theme of SEOPanel.tsx exactly.
 */

import { useState, useRef, useCallback } from 'react'
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SEOCompetitorGapProps {
  title: string
  content: string
  targetKeyword: string
  articleType?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SEOCompetitorGap({
  title,
  content,
  targetKeyword,
  articleType,
}: SEOCompetitorGapProps) {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRun, setHasRun] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const isKeywordReady = targetKeyword.trim().length > 3

  const runAnalysis = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setResult('')

    try {
      const response = await fetch('/api/ai/seo-competitor-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, targetKeyword, articleType }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(errText || `HTTP ${response.status}`)
      }

      if (!response.body) throw new Error('لا توجد استجابة من الخادم')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (chunk) {
          accumulated += chunk
          setResult(accumulated)
        }
      }

      setHasRun(true)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'فشل التحليل')
    } finally {
      setLoading(false)
    }
  }, [title, content, targetKeyword, articleType])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3 text-right"
      dir="rtl"
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-white">فجوات المحتوى</h3>
        </div>

        {/* Re-run button — only shown after first result */}
        {hasRun && !loading && (
          <button
            type="button"
            onClick={runAnalysis}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 transition-colors"
            title="إعادة التحليل"
          >
            <RefreshCw size={12} />
            إعادة التحليل
          </button>
        )}
      </div>

      {/* Keyword not ready — placeholder */}
      {!isKeywordReady && (
        <p className="text-xs text-zinc-500 py-2 text-center">
          أدخل الكلمة المفتاحية لتحليل الفجوات
        </p>
      )}

      {/* Keyword ready — trigger button (shown before first run or after clear) */}
      {isKeywordReady && !hasRun && !loading && !error && (
        <button
          type="button"
          onClick={runAnalysis}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-amber-500/10 border border-amber-600/40 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60 transition-colors"
        >
          <Sparkles size={14} />
          تحليل
        </button>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 justify-center py-2">
          <Loader2 size={14} className="animate-spin text-amber-400 shrink-0" />
          <span className="text-xs text-zinc-400">جاري التحليل...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-700/60 px-3 py-2.5">
          <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={runAnalysis}
              className="mt-1.5 text-xs text-red-400 hover:text-red-200 underline transition-colors"
            >
              حاول مرة أخرى
            </button>
          </div>
        </div>
      )}

      {/* Streamed result */}
      {result && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-3">
          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
            {result}
            {loading && (
              <span className="inline-block w-0.5 h-3.5 bg-amber-400 animate-pulse mr-0.5 align-middle" />
            )}
          </p>
        </div>
      )}
    </div>
  )
}
