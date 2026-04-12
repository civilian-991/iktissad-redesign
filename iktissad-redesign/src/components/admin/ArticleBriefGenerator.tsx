'use client'

/**
 * ArticleBriefGenerator
 * Phase 9.1 — AI Article Brief Generator
 *
 * Full-featured UI for generating an editorial brief from a topic idea.
 * Calls POST /api/ai/article-brief and renders a rich, structured result.
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  Lightbulb,
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  FileText,
  ArrowLeft,
  Target,
  Hash,
  Users,
  AlignLeft,
  LayoutList,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { iconSizes } from '@/lib/design-tokens'
import type { ArticleBrief, OutlineSection } from '@/app/api/ai/article-brief/route'

// ─── Article type options ──────────────────────────────────────────────────────

const ARTICLE_TYPE_OPTIONS: { value: string; label: string; arabic: string }[] = [
  { value: '',          label: 'دع الذكاء الاصطناعي يختار', arabic: '' },
  { value: 'news',      label: 'خبر',                        arabic: 'خبر' },
  { value: 'report',    label: 'تقرير',                      arabic: 'تقرير' },
  { value: 'analysis',  label: 'تحليل',                      arabic: 'تحليل' },
  { value: 'interview', label: 'مقابلة',                     arabic: 'مقابلة' },
  { value: 'opinion',   label: 'رأي',                        arabic: 'رأي' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('تعذّر النسخ')
    }
  }, [text])

  return (
    <button
      onClick={handleCopy}
      title="نسخ"
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
    >
      {copied ? (
        <Check size={13} className="text-profit" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  )
}

function SectionCard({
  icon: Icon,
  title,
  children,
  className = '',
  copyText,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  className?: string
  copyText?: string
}) {
  return (
    <div className={`bg-midnight/50 border border-gold/10 rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Icon size={14} className="text-gold" />
          </div>
          <h3 className="text-sm font-[family-name:var(--font-display)] font-semibold text-white">
            {title}
          </h3>
        </div>
        {copyText && <CopyButton text={copyText} />}
      </div>
      {children}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="bg-midnight/50 border border-gold/10 rounded-xl p-5">
        <div className="h-4 w-32 bg-white/10 rounded mb-3" />
        <div className="h-6 w-3/4 bg-white/10 rounded mb-2" />
        <div className="h-4 w-full bg-white/5 rounded" />
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-midnight/50 border border-gold/10 rounded-xl p-5">
            <div className="h-4 w-24 bg-white/10 rounded mb-3" />
            <div className="space-y-2">
              <div className="h-3 bg-white/5 rounded w-full" />
              <div className="h-3 bg-white/5 rounded w-5/6" />
              <div className="h-3 bg-white/5 rounded w-4/6" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-midnight/50 border border-gold/10 rounded-xl p-5">
        <div className="h-4 w-28 bg-white/10 rounded mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-16 w-10 bg-white/10 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    خبر:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    تقرير:  'bg-gold/10 text-gold border-gold/20',
    تحليل:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
    مقابلة: 'bg-green-500/10 text-green-400 border-green-500/20',
    رأي:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }
  const color = colorMap[type] ?? 'bg-white/10 text-white border-white/20'
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-[family-name:var(--font-display)] font-semibold border ${color}`}>
      {type}
    </span>
  )
}

function OutlineSectionRow({ section, index }: { section: OutlineSection; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gold/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-start"
      >
        <span className="shrink-0 w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-xs font-[family-name:var(--font-accent)] text-gold font-bold">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-[family-name:var(--font-display)] font-semibold text-white text-start">
          {section.title}
        </span>
        <span className="shrink-0 text-xs text-white/40 font-[family-name:var(--font-display)]">
          {section.targetWords} كلمة
        </span>
        {open ? (
          <ChevronUp size={14} className="text-white/40 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-white/40 shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 text-sm text-white/60 font-[family-name:var(--font-display)] leading-relaxed border-t border-gold/10">
              {section.description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Brief display ─────────────────────────────────────────────────────────────

function BriefDisplay({ brief }: { brief: ArticleBrief }) {
  const router = useRouter()

  const handleStartArticle = useCallback(() => {
    try {
      const encoded = encodeURIComponent(JSON.stringify(brief))
      router.push(`/admin/articles/new?brief=${encoded}`)
    } catch {
      toast.error('تعذّر تمرير الموجز — يرجى النسخ يدوياً')
    }
  }, [brief, router])

  const fullBriefText = [
    `العنوان المقترح: ${brief.suggestedHeadline}`,
    ``,
    `نوع المقال: ${brief.recommendedType}`,
    `السبب: ${brief.recommendedTypeReason}`,
    ``,
    `الزاوية التحريرية: ${brief.suggestedAngle}`,
    ``,
    `النقاط المحورية:`,
    ...brief.keyPoints.map((p, i) => `${i + 1}. ${p}`),
    ``,
    `كلمات SEO: ${brief.seoKeywords.join('، ')}`,
    ``,
    `عدد الكلمات المستهدف: ${brief.targetWordCount.min}–${brief.targetWordCount.max} كلمة`,
    ``,
    `المقدمة الافتتاحية:`,
    brief.introduction,
    ``,
    `المصادر المقترحة:`,
    ...brief.suggestedSources.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `هيكل المقال:`,
    ...brief.outlineSections.map(
      (s, i) => `${i + 1}. ${s.title} (${s.targetWords} كلمة)\n   ${s.description}`
    ),
  ].join('\n')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
      dir="rtl"
    >
      {/* Headline + type + angle — hero card */}
      <div className="bg-gradient-to-br from-midnight to-obsidian border border-gold/20 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <TypeBadge type={brief.recommendedType} />
          <CopyButton text={fullBriefText} />
        </div>
        <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-white leading-snug mb-3">
          {brief.suggestedHeadline}
        </h2>
        <p className="text-sm text-white/60 font-[family-name:var(--font-display)] leading-relaxed mb-4">
          {brief.suggestedAngle}
        </p>
        <div className="flex items-center gap-2 text-xs text-white/40 font-[family-name:var(--font-display)]">
          <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10">
            {brief.targetWordCount.min}–{brief.targetWordCount.max} كلمة
          </span>
          <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10">
            {brief.recommendedTypeReason}
          </span>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key points */}
        <SectionCard icon={Target} title="النقاط المحورية" copyText={brief.keyPoints.join('\n')}>
          <ol className="space-y-2">
            {brief.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-xs font-[family-name:var(--font-accent)] text-gold font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-white/70 font-[family-name:var(--font-display)] leading-snug">
                  {point}
                </span>
              </li>
            ))}
          </ol>
        </SectionCard>

        {/* SEO keywords */}
        <SectionCard icon={Hash} title="كلمات SEO المستهدفة" copyText={brief.seoKeywords.join('، ')}>
          <div className="flex flex-wrap gap-2">
            {brief.seoKeywords.map((kw, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-gold/5 border border-gold/15 text-sm text-gold/80 font-[family-name:var(--font-display)]"
              >
                {kw}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* Introduction */}
        <SectionCard
          icon={AlignLeft}
          title="المقدمة الافتتاحية"
          copyText={brief.introduction}
          className="md:col-span-2"
        >
          <p className="text-sm text-white/70 font-[family-name:var(--font-display)] leading-relaxed">
            {brief.introduction}
          </p>
        </SectionCard>

        {/* Suggested sources */}
        <SectionCard icon={Users} title="المصادر المقترحة" copyText={brief.suggestedSources.join('\n')}>
          <ul className="space-y-2">
            {brief.suggestedSources.map((source, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-gold/60 mt-0.5" />
                <span className="text-sm text-white/70 font-[family-name:var(--font-display)]">
                  {source}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Word count targets */}
        <SectionCard icon={BookOpen} title="هدف عدد الكلمات">
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="text-center">
              <p className="text-2xl font-[family-name:var(--font-accent)] font-bold text-gold">
                {brief.targetWordCount.min.toLocaleString('ar-SA')}
              </p>
              <p className="text-xs text-white/40 font-[family-name:var(--font-display)] mt-1">الحد الأدنى</p>
            </div>
            <div className="w-px h-10 bg-gold/20" />
            <div className="text-center">
              <p className="text-2xl font-[family-name:var(--font-accent)] font-bold text-white">
                {brief.targetWordCount.max.toLocaleString('ar-SA')}
              </p>
              <p className="text-xs text-white/40 font-[family-name:var(--font-display)] mt-1">الحد الأقصى</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Article outline */}
      <SectionCard icon={LayoutList} title="هيكل المقال">
        <div className="space-y-2">
          {brief.outlineSections.map((section, i) => (
            <OutlineSectionRow key={i} section={section} index={i} />
          ))}
        </div>
      </SectionCard>

      {/* Action bar */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleStartArticle}
          className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gold hover:bg-gold/90 text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm transition-all"
        >
          <FileText size={iconSizes.sm} />
          ابدأ مقالاً من الموجز
          <ArrowLeft size={iconSizes.sm} />
        </button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(fullBriefText)
              toast.success('تم نسخ الموجز بالكامل')
            } catch {
              toast.error('تعذّر النسخ')
            }
          }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-[family-name:var(--font-display)] text-sm transition-all border border-white/10"
        >
          <Copy size={iconSizes.sm} />
          نسخ الموجز
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ArticleBriefGenerator() {
  const [topic, setTopic] = useState('')
  const [articleType, setArticleType] = useState('')
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<ArticleBrief | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!topic.trim()) {
      toast.error('يرجى إدخال موضوع المقال أولاً')
      return
    }

    setLoading(true)
    setError(null)
    setBrief(null)

    try {
      const res = await fetch('/api/ai/article-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          articleType: articleType || undefined,
          language: 'ar',
        }),
      })

      const data = await res.json() as { brief?: ArticleBrief; error?: string }

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      if (!data.brief) {
        throw new Error('لم يتم استلام موجز من الخادم')
      }

      setBrief(data.brief)
      toast.success('تم توليد الموجز التحريري بنجاح')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع'
      setError(msg)
      toast.error(`فشل التوليد: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [topic, articleType])

  const handleRegenerate = useCallback(() => {
    setBrief(null)
    generate()
  }, [generate])

  return (
    <div className="space-y-6" dir="rtl">
      {/* Input section */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
        <div className="space-y-4">
          {/* Topic input */}
          <div>
            <label
              htmlFor="topic-input"
              className="block text-sm font-[family-name:var(--font-display)] font-semibold text-white/80 mb-2"
            >
              موضوع المقال أو الفكرة
            </label>
            <textarea
              id="topic-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثال: تداعيات رفع الفيدرالي الأمريكي لأسعار الفائدة على الأسواق الخليجية..."
              rows={3}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gold/15 text-white placeholder:text-white/30 font-[family-name:var(--font-display)] text-sm leading-relaxed focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all resize-none disabled:opacity-50"
            />
          </div>

          {/* Article type selector */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="type-select"
                className="block text-sm font-[family-name:var(--font-display)] font-semibold text-white/80 mb-2"
              >
                نوع المقال
                <span className="text-white/40 font-normal ms-2">(اختياري)</span>
              </label>
              <select
                id="type-select"
                value={articleType}
                onChange={(e) => setArticleType(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-gold/15 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/40 transition-all disabled:opacity-50 appearance-none cursor-pointer"
              >
                {ARTICLE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-midnight text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={loading || !topic.trim()}
              className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-obsidian font-[family-name:var(--font-display)] font-bold text-sm transition-all sm:min-w-[160px]"
            >
              {loading ? (
                <>
                  <Loader2 size={iconSizes.sm} className="animate-spin" />
                  يجري التوليد...
                </>
              ) : (
                <>
                  <Sparkles size={iconSizes.sm} />
                  توليد الموجز
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-3 mb-4 px-1">
              <Loader2 size={iconSizes.sm} className="animate-spin text-gold" />
              <span className="text-sm text-white/60 font-[family-name:var(--font-display)]">
                يحلل الذكاء الاصطناعي الموضوع ويُعدّ الموجز...
              </span>
            </div>
            <LoadingSkeleton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-loss/10 border border-loss/20"
          >
            <AlertCircle size={iconSizes.md} className="text-loss shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-[family-name:var(--font-display)] font-semibold text-loss">
                فشل توليد الموجز
              </p>
              <p className="text-sm text-white/60 font-[family-name:var(--font-display)] mt-0.5">
                {error}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {brief && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Regenerate bar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-white/40 font-[family-name:var(--font-display)]">
                الموجز التحريري المولَّد
              </p>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-[family-name:var(--font-display)] text-xs transition-all border border-white/10"
              >
                <RefreshCw size={12} />
                إعادة التوليد
              </button>
            </div>
            <BriefDisplay brief={brief} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state hint */}
      <AnimatePresence>
        {!brief && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gold/5 border border-gold/15 flex items-center justify-center mb-4">
              <Lightbulb size={28} className="text-gold/60" />
            </div>
            <p className="text-white/40 font-[family-name:var(--font-display)] text-sm max-w-xs leading-relaxed">
              أدخل موضوع مقالك أو فكرتك التحريرية أعلاه وسيولّد الذكاء الاصطناعي موجزاً شاملاً جاهزاً للكتابة
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
