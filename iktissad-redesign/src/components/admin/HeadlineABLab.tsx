/**
 * Headline A/B Lab — Main Component
 * مختبر A/B للعناوين
 *
 * Props:
 *   articleId?     — pre-select an article (used when embedded in the article editor)
 *   articleTitle?  — pre-fill current headline
 *   articleContent? — article body for AI context
 */

'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import useSWR, { mutate as globalMutate } from 'swr'
import { toast } from 'sonner'
import {
  FlaskConical,
  Shuffle,
  TrendingUp,
  Copy,
  Check,
  BarChart3,
  Zap,
  Loader2,
  Play,
  Square,
  ChevronDown,
  Search,
} from 'lucide-react'
import { swrFetcher, articlesKey } from '@/lib/api-client'
import { iconSizes } from '@/lib/design-tokens'
import { Button } from '@/components/ui'
import type { Article, ApiResponse } from '@/types'
import type { HeadlineVariant } from '@/app/api/ai/headline-variants/route'
import type { ABTest } from '@/app/api/admin/ab-tests/route'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HeadlineABLabProps {
  articleId?: string
  articleTitle?: string
  articleContent?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// CTR Score bar — gradient from red → amber → green
// ─────────────────────────────────────────────────────────────────────────────

function CtrBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score))

  const barClass =
    pct >= 80
      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
      : pct >= 50
        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
        : 'bg-gradient-to-r from-red-600 to-red-500'

  const textClass =
    pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-xs font-mono font-semibold w-8 text-start ${textClass}`}>
        {pct}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Angle badge
// ─────────────────────────────────────────────────────────────────────────────

function AngleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-gold/90 font-[family-name:var(--font-display)] font-medium">
      <Zap size={8} />
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Single variant card
// ─────────────────────────────────────────────────────────────────────────────

interface VariantCardProps {
  variant: HeadlineVariant
  index: number
  isActiveTest: boolean
  onTest: (headline: string) => void
  onSetMain: (headline: string) => void
  isSaving: boolean
}

function VariantCard({
  variant,
  index,
  isActiveTest,
  onTest,
  onSetMain,
  isSaving,
}: VariantCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(variant.headline)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className={`group relative rounded-xl border p-5 transition-all ${
        isActiveTest
          ? 'bg-gold/5 border-gold/30 shadow-[0_0_20px_rgba(221,168,83,0.08)]'
          : 'bg-white/[0.03] border-gold/10 hover:border-gold/20 hover:bg-white/[0.05]'
      }`}
    >
      {/* Rank badge */}
      <div className="absolute top-4 end-4 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
        <span className="text-[10px] text-white/50 font-mono font-bold">{index + 1}</span>
      </div>

      {/* Active test indicator */}
      {isActiveTest && (
        <div className="absolute top-4 start-16 flex items-center gap-1.5 text-[10px] text-gold font-[family-name:var(--font-display)]">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          قيد الاختبار
        </div>
      )}

      {/* Angle badge */}
      <div className="mb-3 flex justify-end">
        <AngleBadge label={variant.angle} />
      </div>

      {/* Headline text */}
      <p
        dir="rtl"
        className="text-white text-lg font-[family-name:var(--font-display)] font-bold leading-relaxed mb-4"
      >
        {variant.headline}
      </p>

      {/* CTR Score */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/40 text-xs font-[family-name:var(--font-display)] flex items-center gap-1">
            <BarChart3 size={10} />
            نقاط CTR المتوقعة
          </span>
        </div>
        <CtrBar score={variant.ctrScore} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onTest(variant.headline)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-[family-name:var(--font-display)] ${
            isActiveTest
              ? 'bg-gold/15 border-gold/30 text-gold'
              : 'bg-white/5 border-gold/10 text-white/60 hover:text-gold hover:border-gold/30 hover:bg-gold/5'
          }`}
        >
          <Shuffle size={11} />
          {isActiveTest ? 'قيد الاختبار' : 'اختبر هذا العنوان'}
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-gold/10 text-white/60 hover:text-white hover:border-gold/20 transition-all font-[family-name:var(--font-display)]"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? 'تم النسخ' : 'نسخ'}
        </button>

        <button
          onClick={() => onSetMain(variant.headline)}
          disabled={isSaving}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-gold/10 text-white/60 hover:text-white hover:border-gold/20 transition-all font-[family-name:var(--font-display)] disabled:opacity-40"
        >
          {isSaving ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <TrendingUp size={11} />
          )}
          تعيين كعنوان رئيسي
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Active A/B Test Panel
// ─────────────────────────────────────────────────────────────────────────────

interface ABTestPanelProps {
  test: ABTest
  onStop: () => void
  isStopping: boolean
}

function ABTestPanel({ test, onStop, isStopping }: ABTestPanelProps) {
  const endsAt = new Date(test.endsAt)
  const now = new Date()
  const hoursLeft = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 3_600_000))
  const isExpired = endsAt < now

  return (
    <div className="bg-midnight/60 border border-gold/15 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gold/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <FlaskConical size={iconSizes.sm} className="text-gold/70" />
          <span className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
            مختبر A/B — الاختبار الجاري
          </span>
          {!isExpired && test.status === 'active' && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              نشط
            </span>
          )}
          {isExpired && (
            <span className="text-[10px] text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-[family-name:var(--font-display)]">
              انتهى
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs font-[family-name:var(--font-display)]">
            {isExpired ? 'انتهى الاختبار' : `${hoursLeft} ساعة متبقية`}
          </span>
          {test.status === 'active' && (
            <button
              onClick={onStop}
              disabled={isStopping}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-all font-[family-name:var(--font-display)] disabled:opacity-40"
            >
              {isStopping ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Square size={10} />
              )}
              إيقاف الاختبار
            </button>
          )}
        </div>
      </div>

      {/* Variant comparison */}
      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gold/10">
        {/* Variant A */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded">
              A
            </span>
            <span className="text-white/40 text-xs font-[family-name:var(--font-display)]">
              العنوان الأصلي
            </span>
          </div>
          <p
            dir="rtl"
            className="text-white/90 text-base font-[family-name:var(--font-display)] font-semibold leading-relaxed"
          >
            {test.variantA}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400/60 rounded-full"
                style={{ width: `${test.trafficSplit}%` }}
              />
            </div>
            <span className="text-xs text-white/40 font-mono w-8 text-start">
              {test.trafficSplit}%
            </span>
          </div>
        </div>

        {/* Variant B */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono font-bold text-gold/70 bg-gold/10 px-2 py-0.5 rounded">
              B
            </span>
            <span className="text-white/40 text-xs font-[family-name:var(--font-display)]">
              العنوان المنافس
            </span>
          </div>
          <p
            dir="rtl"
            className="text-white font-[family-name:var(--font-display)] font-semibold text-base leading-relaxed"
          >
            {test.variantB}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold/60 rounded-full"
                style={{ width: `${100 - test.trafficSplit}%` }}
              />
            </div>
            <span className="text-xs text-white/40 font-mono w-8 text-start">
              {100 - test.trafficSplit}%
            </span>
          </div>
        </div>
      </div>

      {/* Footer metadata */}
      <div className="px-5 py-3 border-t border-gold/10 bg-white/[0.015] flex items-center gap-6 text-xs text-white/30 font-[family-name:var(--font-display)]">
        <span>مدة الاختبار: {test.durationHours} ساعة</span>
        <span>توزيع الزيارات: {test.trafficSplit}/{100 - test.trafficSplit}</span>
        <span>
          بدأ:{' '}
          {new Date(test.startedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main HeadlineABLab component
// ─────────────────────────────────────────────────────────────────────────────

export default function HeadlineABLab({
  articleId: propArticleId,
  articleTitle: propTitle,
  articleContent: propContent,
}: HeadlineABLabProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [selectedArticleId, setSelectedArticleId] = useState<string>(propArticleId ?? '')
  const [articleSearch, setArticleSearch] = useState('')
  const [showArticleList, setShowArticleList] = useState(false)
  const [variants, setVariants] = useState<HeadlineVariant[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTestVariant, setActiveTestVariant] = useState<string | null>(null)
  const [testDuration, setTestDuration] = useState(24)
  const [isSavingMain, setIsSavingMain] = useState(false)
  const [isStartingTest, setIsStartingTest] = useState(false)
  const [isStoppingTest, setIsStoppingTest] = useState(false)

  // ── Data: articles list ───────────────────────────────────────────────────
  const { data: articlesData } = useSWR<ApiResponse<Article[]>>(
    articlesKey({ pageSize: 50, status: 'draft' }),
    swrFetcher,
    { revalidateOnFocus: false }
  )
  const articles = articlesData?.data ?? []

  // ── Selected article ──────────────────────────────────────────────────────
  const selectedArticle = articles.find((a) => a.id === selectedArticleId) ?? null
  const currentTitle = propTitle ?? selectedArticle?.title ?? ''
  const currentContent = propContent ?? selectedArticle?.content ?? ''

  // ── A/B tests for selected article ───────────────────────────────────────
  const abTestsKey = selectedArticleId
    ? `/api/admin/ab-tests?articleId=${selectedArticleId}`
    : null

  // ab-tests route returns { tests: ABTest[] } directly (not ApiResponse wrapper)
  const abTestsFetcher = async (url: string): Promise<{ tests: ABTest[] }> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  const { data: abTestsData, mutate: mutateTests } = useSWR<{ tests: ABTest[] }>(
    abTestsKey,
    abTestsFetcher,
    { revalidateOnFocus: true, refreshInterval: 30_000 }
  )

  const activeTest =
    abTestsData?.tests.find((t) => t.status === 'active') ?? null

  // ── Filtered articles for selector ───────────────────────────────────────
  const filteredArticles = articles.filter((a) =>
    articleSearch
      ? a.title.includes(articleSearch) || a.id.includes(articleSearch)
      : true
  )

  // ── Generate variants ─────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!currentTitle || !currentContent) {
      toast.error('اختر مقالاً أولاً لتوليد متغيرات العنوان')
      return
    }

    setIsGenerating(true)
    setVariants([])

    try {
      const res = await fetch('/api/ai/headline-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: selectedArticleId || undefined,
          title: currentTitle,
          content: currentContent,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'خطأ غير متوقع' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const json = await res.json()
      setVariants(json.variants ?? [])
      toast.success('تم توليد 5 متغيرات للعنوان')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ غير متوقع'
      toast.error(`فشل التوليد: ${msg}`)
    } finally {
      setIsGenerating(false)
    }
  }, [currentTitle, currentContent, selectedArticleId])

  // ── Set as main headline via PATCH /api/articles/[id] ────────────────────
  const handleSetMain = useCallback(
    async (headline: string) => {
      if (!selectedArticleId) {
        toast.error('اختر مقالاً أولاً')
        return
      }

      setIsSavingMain(true)
      try {
        const res = await fetch(`/api/articles/${selectedArticleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: headline }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'خطأ' }))
          throw new Error(err.error || `HTTP ${res.status}`)
        }

        await globalMutate(articlesKey({ pageSize: 50, status: 'draft' }))
        toast.success('تم تعيين العنوان الرئيسي')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطأ غير متوقع'
        toast.error(`فشل الحفظ: ${msg}`)
      } finally {
        setIsSavingMain(false)
      }
    },
    [selectedArticleId]
  )

  // ── Start A/B test ────────────────────────────────────────────────────────
  const handleStartTest = useCallback(async () => {
    if (!selectedArticleId || !activeTestVariant || !currentTitle) {
      toast.error('اختر عنواناً للاختبار أولاً')
      return
    }

    setIsStartingTest(true)
    try {
      const res = await fetch('/api/admin/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: selectedArticleId,
          variantA: currentTitle,
          variantB: activeTestVariant,
          durationHours: testDuration,
          trafficSplit: 50,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'خطأ' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      await mutateTests()
      setActiveTestVariant(null)
      toast.success('تم بدء اختبار A/B')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ غير متوقع'
      toast.error(`فشل بدء الاختبار: ${msg}`)
    } finally {
      setIsStartingTest(false)
    }
  }, [selectedArticleId, activeTestVariant, currentTitle, testDuration, mutateTests])

  // ── Stop A/B test ─────────────────────────────────────────────────────────
  const handleStopTest = useCallback(async () => {
    if (!activeTest) return

    setIsStoppingTest(true)
    try {
      const res = await fetch('/api/admin/ab-tests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeTest.id, status: 'stopped' }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'خطأ' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      await mutateTests()
      toast.success('تم إيقاف الاختبار')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ غير متوقع'
      toast.error(`فشل الإيقاف: ${msg}`)
    } finally {
      setIsStoppingTest(false)
    }
  }, [activeTest, mutateTests])

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Article Selector ─────────────────────────────────────────────── */}
      {!propArticleId && (
        <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5">
          <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-3">
            اختر المقال
          </label>

          <div className="relative">
            <button
              onClick={() => setShowArticleList((v) => !v)}
              className="w-full flex items-center justify-between gap-3 bg-white/5 border border-gold/10 rounded-xl px-4 py-3 text-start hover:border-gold/20 transition-colors"
            >
              <span className="text-white/50 font-[family-name:var(--font-display)] text-sm">
                {selectedArticle ? selectedArticle.title : 'اختر مقالاً…'}
              </span>
              {selectedArticle ? (
                <span className="text-gold font-[family-name:var(--font-display)] text-sm font-medium line-clamp-1 flex-1 text-start">
                  {selectedArticle.title}
                </span>
              ) : null}
              <ChevronDown
                size={iconSizes.sm}
                className={`text-white/40 flex-shrink-0 transition-transform ${showArticleList ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showArticleList && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-2 inset-x-0 bg-midnight border border-gold/15 rounded-xl shadow-elevated z-20 overflow-hidden"
                >
                  {/* Search */}
                  <div className="p-3 border-b border-gold/10">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="ابحث عن مقال…"
                        value={articleSearch}
                        onChange={(e) => setArticleSearch(e.target.value)}
                        className="w-full bg-white/5 border border-gold/10 rounded-lg py-2 ps-10 pe-3 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30"
                      />
                      <Search
                        size={14}
                        className="absolute start-3 top-1/2 -translate-y-1/2 text-white/30"
                      />
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-56 overflow-y-auto">
                    {filteredArticles.length === 0 ? (
                      <p className="text-white/30 text-sm text-center py-6 font-[family-name:var(--font-display)]">
                        لا توجد مقالات
                      </p>
                    ) : (
                      filteredArticles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => {
                            setSelectedArticleId(article.id)
                            setVariants([])
                            setActiveTestVariant(null)
                            setShowArticleList(false)
                            setArticleSearch('')
                          }}
                          className={`w-full text-start px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors border-b border-gold/5 last:border-0 ${
                            selectedArticleId === article.id ? 'bg-gold/5' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-white text-sm font-[family-name:var(--font-display)] line-clamp-1">
                              {article.title}
                            </p>
                            <p className="text-white/30 text-xs mt-0.5 font-[family-name:var(--font-display)]">
                              {article.section} • {article.status}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Current Headline + Generate button ───────────────────────────── */}
      {currentTitle && (
        <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-2">
                العنوان الحالي
              </p>
              <p
                dir="rtl"
                className="text-white text-xl font-[family-name:var(--font-display)] font-bold leading-relaxed"
              >
                {currentTitle}
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleGenerate}
              disabled={isGenerating || !currentTitle}
              leftIcon={
                isGenerating ? (
                  <Loader2 size={iconSizes.md} className="animate-spin" />
                ) : (
                  <FlaskConical size={iconSizes.md} />
                )
              }
            >
              {isGenerating ? 'جارٍ التوليد…' : 'توليد متغيرات'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!currentTitle && !propArticleId && (
        <div className="text-center py-16 border border-gold/10 rounded-xl bg-white/[0.02]">
          <FlaskConical size={48} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/30 font-[family-name:var(--font-display)] text-sm">
            اختر مقالاً لبدء الاختبار
          </p>
        </div>
      )}

      {/* ── Variants grid ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {variants.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Shuffle size={iconSizes.sm} className="text-gold/70" />
              <h2 className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
                المتغيرات المقترحة ({variants.length})
              </h2>
            </div>

            {variants.map((variant, i) => (
              <VariantCard
                key={i}
                variant={variant}
                index={i}
                isActiveTest={activeTestVariant === variant.headline}
                onTest={(h) =>
                  setActiveTestVariant((prev) => (prev === h ? null : h))
                }
                onSetMain={handleSetMain}
                isSaving={isSavingMain}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── A/B Lab section ──────────────────────────────────────────────── */}
      {(variants.length > 0 || activeTest) && selectedArticleId && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={iconSizes.sm} className="text-gold/70" />
            <h2 className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
              مختبر A/B
            </h2>
          </div>

          {/* Active test */}
          {activeTest ? (
            <ABTestPanel
              test={activeTest}
              onStop={handleStopTest}
              isStopping={isStoppingTest}
            />
          ) : (
            /* Start test configurator */
            <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5 space-y-4">
              <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
                {activeTestVariant
                  ? `سيتم اختبار العنوان المحدد مقابل العنوان الحالي`
                  : 'اختر عنواناً من القائمة أعلاه للبدء'}
              </p>

              {activeTestVariant && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/[0.03] rounded-lg p-3 border border-white/10">
                    <span className="text-[10px] text-white/40 font-mono font-bold block mb-1">
                      A — الأصلي
                    </span>
                    <p
                      dir="rtl"
                      className="text-white/80 font-[family-name:var(--font-display)] leading-snug line-clamp-2"
                    >
                      {currentTitle}
                    </p>
                  </div>
                  <div className="bg-gold/[0.03] rounded-lg p-3 border border-gold/15">
                    <span className="text-[10px] text-gold/60 font-mono font-bold block mb-1">
                      B — المنافس
                    </span>
                    <p
                      dir="rtl"
                      className="text-white font-[family-name:var(--font-display)] leading-snug line-clamp-2"
                    >
                      {activeTestVariant}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                {/* Duration selector */}
                <div className="flex items-center gap-2">
                  <label className="text-white/40 text-xs font-[family-name:var(--font-display)] whitespace-nowrap">
                    مدة الاختبار
                  </label>
                  <select
                    value={testDuration}
                    onChange={(e) => setTestDuration(Number(e.target.value))}
                    className="bg-white/5 border border-gold/10 rounded-lg px-3 py-1.5 text-white text-xs font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
                  >
                    <option value={6} className="bg-midnight">
                      6 ساعات
                    </option>
                    <option value={12} className="bg-midnight">
                      12 ساعة
                    </option>
                    <option value={24} className="bg-midnight">
                      24 ساعة
                    </option>
                    <option value={48} className="bg-midnight">
                      48 ساعة
                    </option>
                    <option value={72} className="bg-midnight">
                      72 ساعة
                    </option>
                  </select>
                </div>

                {/* Traffic split label */}
                <div className="flex items-center gap-2 text-white/30 text-xs font-[family-name:var(--font-display)]">
                  <span>توزيع الزيارات:</span>
                  <span className="text-white/50 font-mono">50/50</span>
                </div>

                {/* Start button */}
                <div className="ms-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartTest}
                    disabled={!activeTestVariant || isStartingTest}
                    leftIcon={
                      isStartingTest ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Play size={14} />
                      )
                    }
                  >
                    {isStartingTest ? 'جارٍ البدء…' : 'بدء الاختبار'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
