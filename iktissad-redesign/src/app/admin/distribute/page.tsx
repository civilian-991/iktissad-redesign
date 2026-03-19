/**
 * Social Publishing Hub — Article List
 * /admin/distribute
 *
 * Lists published and scheduled articles with a "توزيع" (Distribute) button
 * per article that links to the per-article social distribution page.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'motion/react'
import {
  Share2,
  Search,
  FileText,
  Loader2,
  CheckCircle,
  Clock,
  ChevronLeft,
} from 'lucide-react'
import { swrFetcher, articlesKey } from '@/lib/api-client'
import { Button } from '@/components/ui'
import { iconSizes } from '@/lib/design-tokens'
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary'
import type { Article, ApiResponse } from '@/types'

// Only show articles eligible for distribution
const DISTRIBUTABLE_STATUSES = ['published', 'scheduled'] as const

export default function DistributePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  const swrKey = articlesKey({
    page,
    pageSize,
    status: 'published',
    search: searchQuery || undefined,
  })

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    swrKey,
    swrFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  )

  const articles = data?.data ?? []
  const pagination = data?.pagination
  const total = pagination?.total ?? 0
  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1 flex items-center gap-3">
            <Share2 size={iconSizes.lg} className="text-gold" />
            مركز التوزيع الاجتماعي
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {total} مقال جاهز للتوزيع
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث في المقالات المنشورة..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
          />
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
            size={iconSizes.md}
          />
        </div>
      </div>

      {/* Articles Grid */}
      <SectionErrorBoundary section="distribute-list">
        <div>
          {isLoading && articles.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 size={32} className="animate-spin text-gold/50" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16 bg-midnight/50 border border-gold/10 rounded-xl">
              <FileText size={48} className="mx-auto text-white/20 mb-4" />
              <p className="text-white/40 font-[family-name:var(--font-display)]">
                لا توجد مقالات منشورة
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {articles.map((article, index) => (
                  <ArticleCard key={article.id} article={article} index={index} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                صفحة {page} من {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  السابق
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(
                  (p) => (
                    <Button
                      key={p}
                      variant={p === page ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </div>
      </SectionErrorBoundary>
    </div>
  )
}

// ─── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({ article, index }: { article: Article; index: number }) {
  const isScheduled = article.status === 'scheduled'
  const dateLabel = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')
    : new Date(article.createdAt).toLocaleDateString('ar-SA-u-ca-gregory')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.04 }}
      className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden hover:border-gold/25 transition-colors group"
    >
      {/* Thumbnail */}
      {article.featuredImage && (
        <div className="relative h-36 overflow-hidden">
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 to-transparent" />
          {/* Status badge overlay */}
          <span
            className={`absolute top-3 right-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-[family-name:var(--font-display)] ${
              isScheduled
                ? 'bg-teal/20 text-teal border border-teal/30'
                : 'bg-profit/20 text-profit border border-profit/30'
            }`}
          >
            {isScheduled ? (
              <Clock size={10} />
            ) : (
              <CheckCircle size={10} />
            )}
            {isScheduled ? 'مجدول' : 'منشور'}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {!article.featuredImage && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-[family-name:var(--font-display)] ${
              isScheduled
                ? 'bg-teal/20 text-teal border border-teal/30'
                : 'bg-profit/20 text-profit border border-profit/30'
            }`}
          >
            {isScheduled ? (
              <Clock size={10} />
            ) : (
              <CheckCircle size={10} />
            )}
            {isScheduled ? 'مجدول' : 'منشور'}
          </span>
        )}

        <div>
          <h3 className="text-white font-[family-name:var(--font-display)] font-semibold text-sm leading-snug line-clamp-2 mb-1">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-white/40 text-xs line-clamp-2 font-[family-name:var(--font-display)]">
              {article.excerpt}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-white/30 text-xs font-[family-name:var(--font-display)]">
            {dateLabel}
          </span>
          <Link href={`/admin/distribute/${article.id}`}>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/20 hover:border-gold/40 text-gold text-xs font-[family-name:var(--font-display)] font-semibold rounded-lg transition-all">
              <Share2 size={12} />
              توزيع
              <ChevronLeft size={10} className="opacity-60" />
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
