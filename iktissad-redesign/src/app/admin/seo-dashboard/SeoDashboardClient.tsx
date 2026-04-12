'use client';

/**
 * SEO Performance Dashboard — Client Component
 * Lists articles with SEO scores, check details, and edit links.
 */

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { swrFetcher, seoScoresKey } from '@/lib/api-client';
import { iconSizes } from '@/lib/design-tokens';
import type { ApiResponse } from '@/types';
import type { ArticleSeoScore, SeoCheck } from '@/app/api/admin/analytics/seo-scores/route';
import WidgetErrorBoundary from '@/components/admin/WidgetErrorBoundary';

// ─── Check Status Icon ──────────────────────────────────────────
function CheckIcon({ status }: { status: SeoCheck['status'] }) {
  switch (status) {
    case 'good':
      return <CheckCircle2 size={14} className="text-profit shrink-0" />;
    case 'needs_work':
      return <AlertTriangle size={14} className="text-amber-400 shrink-0" />;
    case 'missing':
      return <XCircle size={14} className="text-loss shrink-0" />;
  }
}

// ─── Score Ring ──────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'text-profit'
      : score >= 50
        ? 'text-amber-400'
        : 'text-loss';
  const bgColor =
    score >= 80
      ? 'bg-profit/10'
      : score >= 50
        ? 'bg-amber-400/10'
        : 'bg-loss/10';

  return (
    <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
      <span className={`text-lg font-[family-name:var(--font-display)] font-bold ${color}`}>
        {score}
      </span>
    </div>
  );
}

// ─── Check label i18n ───────────────────────────────────────────
const checkLabels: Record<string, string> = {
  titleLength: 'طول العنوان',
  metaDescription: 'الوصف التعريفي',
  featuredImage: 'الصورة الرئيسية',
  metaTitle: 'عنوان SEO',
  excerpt: 'المقتطف',
};

export default function SeoDashboardClient() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score');
  const pageSize = 15;

  const { data, isLoading, error } = useSWR<ApiResponse<ArticleSeoScore[]>>(
    seoScoresKey({ page, pageSize, sortBy }),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const articles = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={48} className="text-loss" />
        <p className="text-white/60 font-[family-name:var(--font-display)]">Failed to load SEO data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Search size={iconSizes.md} className="text-gold" />
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
              {t('admin.seoDashboard.title')}
            </h1>
          </div>
          <p className="text-white/40 text-sm font-[family-name:var(--font-display)] ms-12">
            {t('admin.seoDashboard.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setSortBy('score'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors ${
              sortBy === 'score'
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
            }`}
          >
            {t('admin.seoDashboard.poorSeoOnly')}
          </button>
          <button
            onClick={() => { setSortBy('date'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors ${
              sortBy === 'date'
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
            }`}
          >
            {t('admin.seoDashboard.allArticles')}
          </button>
        </div>
      </div>

      {/* Articles List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gold/50" />
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-midnight/50 border border-gold/10 rounded-xl">
          <Search size={40} className="text-white/20" />
          <p className="text-white/40 font-[family-name:var(--font-display)]">
            {t('admin.seoDashboard.noArticles')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article, idx) => (
            <WidgetErrorBoundary key={article.id} label={`seo-${article.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  <ScoreRing score={article.score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm line-clamp-1 flex items-center gap-1"
                      >
                        {article.title}
                        <ExternalLink size={12} className="text-white/20 shrink-0" />
                      </Link>
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="px-3 py-1 bg-gold/10 text-gold rounded-lg hover:bg-gold/20 transition-colors text-xs font-[family-name:var(--font-display)] shrink-0"
                      >
                        {t('admin.seoDashboard.fixNow')}
                      </Link>
                    </div>

                    {/* Checks */}
                    <div className="flex flex-wrap gap-3">
                      {article.checks.map((check) => (
                        <div key={check.label} className="flex items-center gap-1.5">
                          <CheckIcon status={check.status} />
                          <span className="text-xs text-white/50 font-[family-name:var(--font-display)]">
                            {checkLabels[check.label] ?? check.label}
                          </span>
                          <span className="text-xs text-white/25 font-[family-name:var(--font-display)]">
                            {check.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </WidgetErrorBoundary>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 text-white/40 hover:text-gold disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={iconSizes.md} />
          </button>
          <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {page.toLocaleString('ar')} / {totalPages.toLocaleString('ar')}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 text-white/40 hover:text-gold disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={iconSizes.md} />
          </button>
        </div>
      )}
    </div>
  );
}
