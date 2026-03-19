/**
 * Admin Content Intelligence Page
 * /admin/content-intelligence
 *
 * Hub for Phase 5 content intelligence features:
 * - ContentGapWidget: section/country coverage gaps + story ideas
 * - Underperforming articles list with inline suggestions
 */

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { BrainCircuit, TrendingDown } from 'lucide-react';
import { iconSizes } from '@/lib/design-tokens';
import ContentGapWidget from '@/components/admin/ContentGapWidget';
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary';
import { swrFetcher, contentGapKey } from '@/lib/api-client';
import type { ContentGapData, UnderperformingArticle } from '@/types';
import type { ApiResponse } from '@/types';

// ─── Underperforming article card ─────────────────────────────────────────────

function PerformanceBadge({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100);
  const color =
    ratio < 0.4 ? 'bg-loss/10 text-loss border-loss/20' :
    ratio < 0.7 ? 'bg-gold/10 text-gold border-gold/20' :
                  'bg-profit/10 text-profit border-profit/20';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-[family-name:var(--font-display)] border ${color}`}>
      {pct}%
    </span>
  );
}

function UnderperformingArticleRow({ article }: { article: UnderperformingArticle }) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-gold/10 hover:border-gold/20 transition-colors">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/articles/${article.id}`}
          className="flex-1 text-sm font-[family-name:var(--font-display)] text-white hover:text-gold transition-colors line-clamp-1"
        >
          {article.title}
        </Link>
        <PerformanceBadge ratio={article.performanceRatio} />
      </div>
      {article.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.suggestions.map((suggestion, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-lg bg-midnight border border-gold/10 text-white/50 font-[family-name:var(--font-display)]"
            >
              {suggestion}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentIntelligencePage() {
  const { data, isLoading } = useSWR<ApiResponse<ContentGapData>>(
    contentGapKey(),
    swrFetcher
  );

  const underperforming: UnderperformingArticle[] = (
    data?.data?.underperformingArticles ?? []
  )
    .slice()
    .sort((a, b) => a.performanceRatio - b.performanceRatio);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <BrainCircuit size={iconSizes.md} className="text-gold" />
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
              ذكاء المحتوى
            </h1>
          </div>
          <p className="text-white/40 text-sm font-[family-name:var(--font-display)] mr-12">
            تحليل الأداء واكتشاف الفجوات التحريرية
          </p>
        </div>
      </div>

      {/* Content Gap Widget */}
      <SectionErrorBoundary section="content-gap-widget">
        <ContentGapWidget />
      </SectionErrorBoundary>

      {/* Underperforming Articles */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-loss/10 border border-loss/20 flex items-center justify-center">
            <TrendingDown size={iconSizes.sm} className="text-loss" />
          </div>
          <div>
            <h2 className="text-base font-[family-name:var(--font-display)] font-semibold text-white">
              المقالات الأقل أداءً
            </h2>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
              مقارنةً بمتوسط القسم — مرتبة تصاعدياً
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : underperforming.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white/30 text-sm font-[family-name:var(--font-display)]">
              لا توجد مقالات تحتاج إلى تحسين في هذا الوقت
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {underperforming.map((article) => (
              <UnderperformingArticleRow key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
