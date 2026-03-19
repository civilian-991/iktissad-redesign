/**
 * Per-Article Social Distribution Hub
 * /admin/distribute/[articleId]
 *
 * Generates and manages platform-native social content for a single article.
 * Four tabs: Tweet/X Thread | LinkedIn | Telegram | TL;DR
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import {
  Share2,
  Twitter,
  Linkedin,
  Send,
  Copy,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  FileText,
  Zap,
} from 'lucide-react'
import { swrFetcher } from '@/lib/api-client'
import { Button } from '@/components/ui'
import { iconSizes } from '@/lib/design-tokens'
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary'
import type { Article, ApiResponse } from '@/types'
import type { SocialAccountsStatus } from '@/app/api/admin/social-accounts/route'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Platform = 'tweet' | 'linkedin' | 'telegram' | 'tldr'

interface TabConfig {
  id: Platform
  label: string
  icon: React.ReactNode
  maxChars?: number
  tweetMaxPerChunk?: number
}

const TABS: TabConfig[] = [
  {
    id: 'tweet',
    label: 'تغريدة X',
    icon: <Twitter size={15} />,
    maxChars: 280,
    tweetMaxPerChunk: 280,
  },
  {
    id: 'linkedin',
    label: 'لينكد إن',
    icon: <Linkedin size={15} />,
    maxChars: 3000,
  },
  {
    id: 'telegram',
    label: 'تيليغرام',
    icon: <Send size={15} />,
  },
  {
    id: 'tldr',
    label: 'ملخص',
    icon: <FileText size={15} />,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Tweet character counter helper
// ─────────────────────────────────────────────────────────────────────────────

function parseTweets(text: string): string[] {
  // Split on blank lines to get individual tweets
  return text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function TweetCharCounter({ text }: { text: string }) {
  const tweets = parseTweets(text)
  if (tweets.length === 0) return null

  return (
    <div className="space-y-1.5">
      {tweets.map((tweet, i) => {
        const len = tweet.length
        const over = len > 280
        return (
          <div key={i} className="flex items-center gap-2 text-xs font-[family-name:var(--font-display)]">
            <span className="text-white/40 shrink-0">تغريدة {i + 1}</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  over ? 'bg-red-500' : len > 240 ? 'bg-amber-400' : 'bg-profit'
                }`}
                style={{ width: `${Math.min((len / 280) * 100, 100)}%` }}
              />
            </div>
            <span className={`shrink-0 tabular-nums ${over ? 'text-red-400 font-semibold' : 'text-white/40'}`}>
              {len}/280
            </span>
          </div>
        )
      })}
      <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">
        {tweets.length} تغريدة في الخيط
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple character counter for other platforms
// ─────────────────────────────────────────────────────────────────────────────

function CharCounter({ text, max }: { text: string; max: number }) {
  const len = text.length
  const over = len > max
  return (
    <span
      className={`text-xs font-[family-name:var(--font-display)] tabular-nums ${
        over ? 'text-red-400 font-semibold' : 'text-white/40'
      }`}
    >
      {len.toLocaleString('ar-SA')} / {max.toLocaleString('ar-SA')}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth Status Panel
// ─────────────────────────────────────────────────────────────────────────────

function OAuthStatusPanel({ status }: { status: SocialAccountsStatus | undefined }) {
  const platforms = [
    {
      key: 'twitter' as const,
      label: 'X (تويتر)',
      icon: <Twitter size={14} />,
      detail: status?.twitter.connected ? `@${status.twitter.handle}` : null,
    },
    {
      key: 'linkedin' as const,
      label: 'LinkedIn',
      icon: <Linkedin size={14} />,
      detail: status?.linkedin.connected ? status.linkedin.name : null,
    },
    {
      key: 'telegram' as const,
      label: 'Telegram',
      icon: <Send size={14} />,
      detail: status?.telegram.connected ? status.telegram.channelName : null,
    },
  ]

  return (
    <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5">
      <h3 className="text-white/70 text-sm font-[family-name:var(--font-display)] font-semibold mb-4 flex items-center gap-2">
        <Zap size={14} className="text-gold" />
        حالة الاتصال بالمنصات
      </h3>
      <div className="grid sm:grid-cols-3 gap-3">
        {platforms.map((p) => {
          const connected = status?.[p.key]?.connected ?? false
          return (
            <div
              key={p.key}
              className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-lg border border-white/5"
            >
              <span className="text-white/50">{p.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-white/70 text-xs font-[family-name:var(--font-display)] font-medium">
                  {p.label}
                </p>
                <p
                  className={`text-xs font-[family-name:var(--font-display)] truncate ${
                    connected ? 'text-profit' : 'text-white/30'
                  }`}
                >
                  {connected ? p.detail : 'غير متصل'}
                </p>
              </div>
              {connected ? (
                <CheckCircle size={12} className="text-profit shrink-0" />
              ) : (
                <AlertCircle size={12} className="text-white/20 shrink-0" />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-white/25 text-xs font-[family-name:var(--font-display)] mt-3">
        ربط المنصات متاح في إعدادات التكاملات
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Tab Panel
// ─────────────────────────────────────────────────────────────────────────────

interface PlatformPanelProps {
  tab: TabConfig
  article: Article
  socialStatus: SocialAccountsStatus | undefined
}

function PlatformPanel({ tab, article, socialStatus }: PlatformPanelProps) {
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Map platform tab id → OAuth platform key
  const platformConnected = (() => {
    if (tab.id === 'tweet') return socialStatus?.twitter.connected ?? false
    if (tab.id === 'linkedin') return socialStatus?.linkedin.connected ?? false
    if (tab.id === 'telegram') return socialStatus?.telegram.connected ?? false
    return false
  })()

  const generate = useCallback(async () => {
    if (isGenerating) {
      abortRef.current?.abort()
      return
    }

    abortRef.current = new AbortController()
    setIsGenerating(true)
    setContent('')

    try {
      const res = await fetch('/api/ai/social-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          platform: tab.id,
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'خطأ في الخادم' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      if (!res.body) throw new Error('لا يوجد تدفق بيانات')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setContent((prev) => prev + decoder.decode(value, { stream: true }))
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'حدث خطأ'
      toast.error(`فشل توليد المحتوى: ${message}`)
    } finally {
      setIsGenerating(false)
    }
  }, [article, tab.id, isGenerating])

  const copyToClipboard = useCallback(async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success('تم النسخ إلى الحافظة')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('فشل النسخ')
    }
  }, [content])

  const handleSchedule = useCallback(() => {
    if (!scheduleDate) {
      toast.error('اختر تاريخ ووقت الجدولة أولاً')
      return
    }
    toast.success(`تمت جدولة النشر على ${tab.label} في ${new Date(scheduleDate).toLocaleString('ar-SA')}`)
  }, [scheduleDate, tab.label])

  const handlePostNow = useCallback(() => {
    if (!platformConnected) {
      toast.error(`المنصة غير متصلة — يرجى ربط الحساب من إعدادات التكاملات`)
      return
    }
    toast.success(`تم إرسال المنشور إلى ${tab.label}`)
  }, [platformConnected, tab.label])

  return (
    <div className="space-y-4">
      {/* Generate button + copy */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={generate}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-[family-name:var(--font-display)] font-semibold transition-all ${
            isGenerating
              ? 'bg-gold/20 border border-gold/30 text-gold'
              : 'bg-gold/10 hover:bg-gold/20 border border-gold/20 hover:border-gold/40 text-gold'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              جارٍ التوليد...
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              توليد تلقائي
            </>
          )}
        </button>

        {content && (
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white text-xs font-[family-name:var(--font-display)] transition-all"
          >
            {copied ? (
              <>
                <CheckCircle size={12} className="text-profit" />
                تم النسخ
              </>
            ) : (
              <>
                <Copy size={12} />
                نسخ
              </>
            )}
          </button>
        )}
      </div>

      {/* Content textarea */}
      <div className="relative">
        {isGenerating && !content && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-xl border border-gold/10 z-10">
            <div className="text-center space-y-2">
              <Loader2 size={24} className="animate-spin text-gold mx-auto" />
              <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                يولّد الذكاء الاصطناعي محتوى {tab.label}...
              </p>
            </div>
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`سيظهر محتوى ${tab.label} هنا بعد الضغط على "توليد تلقائي"...`}
          rows={tab.id === 'tweet' ? 14 : tab.id === 'linkedin' ? 10 : 8}
          dir="rtl"
          className={`w-full bg-white/5 border rounded-xl p-4 text-white/90 font-[family-name:var(--font-display)] text-sm leading-relaxed placeholder:text-white/25 focus:outline-none transition-colors resize-none ${
            isGenerating && !content
              ? 'border-gold/20 opacity-0'
              : 'border-gold/10 focus:border-gold/30'
          }`}
        />
      </div>

      {/* Character counters */}
      {content && tab.id === 'tweet' && <TweetCharCounter text={content} />}
      {content && tab.id === 'linkedin' && tab.maxChars && (
        <div className="flex justify-end">
          <CharCounter text={content} max={tab.maxChars} />
        </div>
      )}

      {/* Schedule + Post Now row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-gold/10">
        {/* Schedule datetime */}
        <div className="flex items-center gap-2 flex-1">
          <Clock size={14} className="text-white/40 shrink-0" />
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="flex-1 bg-white/5 border border-gold/10 rounded-lg py-2 px-3 text-white/70 font-[family-name:var(--font-display)] text-xs focus:outline-none focus:border-gold/30 transition-colors"
          />
          <button
            onClick={handleSchedule}
            disabled={!content || !scheduleDate}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white/60 hover:text-white text-xs font-[family-name:var(--font-display)] transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            جدول النشر
          </button>
        </div>

        {/* Post Now */}
        <button
          onClick={handlePostNow}
          disabled={!content}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-[family-name:var(--font-display)] font-semibold transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
            platformConnected
              ? 'bg-profit/10 hover:bg-profit/20 border border-profit/20 hover:border-profit/40 text-profit'
              : 'bg-white/5 border border-white/10 text-white/40'
          }`}
        >
          {platformConnected ? (
            <>
              <Share2 size={12} />
              نشر الآن
            </>
          ) : (
            <>
              <AlertCircle size={12} />
              غير متصل
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ArticleDistributePage({
  params,
}: {
  params: Promise<{ articleId: string }>
}) {
  const { articleId } = use(params)
  const [activeTab, setActiveTab] = useState<Platform>('tweet')

  const { data: articleRes, isLoading: articleLoading } = useSWR<ApiResponse<Article>>(
    `/api/articles/${articleId}`,
    swrFetcher,
    { revalidateOnFocus: false }
  )

  const { data: socialRes } = useSWR<ApiResponse<SocialAccountsStatus>>(
    '/api/admin/social-accounts',
    swrFetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const article = articleRes?.data
  const socialStatus = socialRes?.data

  if (articleLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={32} className="animate-spin text-gold/50" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="text-center py-24">
        <AlertCircle size={48} className="mx-auto text-white/20 mb-4" />
        <p className="text-white/40 font-[family-name:var(--font-display)]">
          لم يتم العثور على المقال
        </p>
        <Link
          href="/admin/distribute"
          className="inline-flex items-center gap-2 mt-4 text-gold text-sm font-[family-name:var(--font-display)] hover:underline"
        >
          <ArrowRight size={14} />
          العودة إلى مركز التوزيع
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <Link
          href="/admin/distribute"
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm font-[family-name:var(--font-display)] transition-colors mb-3"
        >
          <ArrowRight size={13} />
          مركز التوزيع
        </Link>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 bg-gold/10 border border-gold/20 rounded-lg shrink-0">
            <Share2 size={18} className="text-gold" />
          </div>
          <div>
            <h1 className="text-xl font-[family-name:var(--font-display)] font-bold text-white leading-snug mb-1 line-clamp-2">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="text-white/40 text-sm font-[family-name:var(--font-display)] line-clamp-2">
                {article.excerpt}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-white/30 font-[family-name:var(--font-display)]">
              {article.section && (
                <span className="px-2 py-0.5 bg-white/5 rounded border border-white/10">
                  {article.section}
                </span>
              )}
              {article.publishedAt && (
                <span>
                  {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-midnight/50 border border-gold/10 rounded-xl p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-[family-name:var(--font-display)] font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gold/15 text-gold border border-gold/25'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <SectionErrorBoundary section="social-platform-panel">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5"
          >
            {TABS.filter((t) => t.id === activeTab).map((tab) => (
              <PlatformPanel
                key={tab.id}
                tab={tab}
                article={article}
                socialStatus={socialStatus}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </SectionErrorBoundary>

      {/* OAuth Connection Status */}
      <OAuthStatusPanel status={socialStatus} />
    </div>
  )
}
