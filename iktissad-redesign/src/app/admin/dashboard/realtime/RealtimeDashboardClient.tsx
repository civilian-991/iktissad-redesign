'use client';

/**
 * Real-Time Editorial Dashboard — Client Component
 * Shows live reader count, trending articles, top sections,
 * and breaking news performance. Auto-refreshes every 30s.
 */

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Users,
  TrendingUp,
  Zap,
  Layers,
  Loader2,
  RefreshCw,
  Eye,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { formatRelativeTime } from '@/lib/i18n/format';
import { swrFetcher, realtimeAnalyticsKey } from '@/lib/api-client';
import { iconSizes } from '@/lib/design-tokens';
import type { ApiResponse } from '@/types';
import type { RealtimeAnalytics } from '@/app/api/admin/analytics/realtime/route';
import WidgetErrorBoundary from '@/components/admin/WidgetErrorBoundary';

// ─── Time Formatter ─────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  return formatRelativeTime(dateStr, 'ar');
}

export default function RealtimeDashboardClient() {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, mutate } = useSWR<ApiResponse<RealtimeAnalytics>>(
    realtimeAnalyticsKey(),
    swrFetcher,
    {
      refreshInterval: 30_000, // Auto-refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  const analytics = data?.data;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={48} className="text-loss" />
        <p className="text-white/60 font-[family-name:var(--font-display)]">
          {error.message || 'Failed to load real-time data'}
        </p>
        <button
          onClick={() => mutate()}
          className="px-4 py-2 bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition-colors font-[family-name:var(--font-display)]"
        >
          {t('admin.realtimeDashboard.refreshing')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.realtimeDashboard.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.realtimeDashboard.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/30 text-xs font-[family-name:var(--font-display)]">
            {t('admin.realtimeDashboard.autoRefresh')}
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-gold/10 text-gold rounded-lg hover:bg-gold/20 transition-colors text-sm font-[family-name:var(--font-display)] disabled:opacity-50"
          >
            <RefreshCw
              size={iconSizes.sm}
              className={isRefreshing ? 'animate-spin' : ''}
            />
          </button>
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-profit" />
            </span>
            <span className="text-profit text-xs font-[family-name:var(--font-display)] font-semibold">
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* Active Readers Stat */}
      <WidgetErrorBoundary label="active-readers">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-profit/20 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="relative flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-profit to-emerald-700 flex items-center justify-center shadow-lg">
              <Users className="text-white" size={28} />
            </div>
            <div>
              <p className="text-white/60 text-sm font-[family-name:var(--font-display)] mb-1">
                {t('admin.realtimeDashboard.activeReaders')}
              </p>
              <p className="text-5xl font-[family-name:var(--font-display)] font-bold text-white">
                {isLoading ? (
                  <Loader2 size={32} className="animate-spin text-white/30" />
                ) : (
                  (analytics?.activeReaders ?? 0).toLocaleString('ar-u-nu-latn')
                )}
              </p>
              <p className="text-white/30 text-xs font-[family-name:var(--font-display)] mt-1">
                {t('admin.realtimeDashboard.last5Min')}
              </p>
            </div>
          </div>
        </motion.div>
      </WidgetErrorBoundary>

      {/* Main Grid: Trending + Top Sections */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trending Articles */}
        <WidgetErrorBoundary label="trending-articles">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={iconSizes.md} className="text-gold" />
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                {t('admin.realtimeDashboard.trendingArticles')}
              </h2>
              <span className="text-white/30 text-xs font-[family-name:var(--font-display)] ms-2">
                {t('admin.realtimeDashboard.lastHour')}
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-gold/50" />
              </div>
            ) : !analytics?.trendingArticles?.length ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-xl border border-gold/10 bg-white/[0.02]">
                <TrendingUp size={28} className="text-white/20" />
                <p className="text-white/40 font-[family-name:var(--font-display)] text-sm">
                  {t('admin.realtimeDashboard.noTrending')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {analytics.trendingArticles.map((article, i) => (
                  <div
                    key={article.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <span className="text-2xl font-[family-name:var(--font-display)] font-bold text-gold/40 w-8 text-center">
                      {(i + 1).toLocaleString('ar-u-nu-latn')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="text-white group-hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm line-clamp-1"
                      >
                        {article.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1">
                        {article.sectionName && (
                          <span className="text-xs text-gold/60 font-[family-name:var(--font-display)]">
                            {article.sectionName}
                          </span>
                        )}
                        {article.isBreaking && (
                          <span className="text-xs bg-loss/20 text-loss px-2 py-0.5 rounded-full font-[family-name:var(--font-display)]">
                            <Zap size={10} className="inline me-1" />
                            عاجل
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-white/50">
                      <Eye size={iconSizes.sm} />
                      <span className="text-sm font-[family-name:var(--font-display)] font-semibold">
                        {article.reads.toLocaleString('ar-u-nu-latn')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </WidgetErrorBoundary>

        {/* Top Sections */}
        <WidgetErrorBoundary label="top-sections">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Layers size={iconSizes.md} className="text-gold" />
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                {t('admin.realtimeDashboard.topSections')}
              </h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-gold/50" />
              </div>
            ) : !analytics?.topSections?.length ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-xl border border-gold/10 bg-white/[0.02]">
                <Layers size={22} className="text-white/20" />
                <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">
                  {t('admin.realtimeDashboard.noTrending')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.topSections.map((section, i) => {
                  const maxReads = analytics.topSections[0]?.reads || 1;
                  const pct = Math.round((section.reads / maxReads) * 100);
                  return (
                    <div key={section.name + i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/80 text-sm font-[family-name:var(--font-display)]">
                          {section.name}
                        </span>
                        <span className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold">
                          {section.reads.toLocaleString('ar-u-nu-latn')}
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                          className="h-full bg-gradient-to-l from-gold to-bronze rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </WidgetErrorBoundary>
      </div>

      {/* Breaking News Performance */}
      <WidgetErrorBoundary label="breaking-performance">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={iconSizes.md} className="text-loss" />
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
              {t('admin.realtimeDashboard.breakingPerformance')}
            </h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gold/50" />
            </div>
          ) : !analytics?.breakingPerformance?.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-xl border border-gold/10 bg-white/[0.02]">
              <Zap size={22} className="text-white/20" />
              <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">
                {t('admin.realtimeDashboard.noBreaking')}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.breakingPerformance.map((article) => (
                <Link
                  key={article.id}
                  href={`/admin/articles/${article.id}`}
                  className="group p-4 rounded-xl border border-loss/20 bg-loss/5 hover:border-loss/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs bg-loss/20 text-loss px-2 py-0.5 rounded-full font-[family-name:var(--font-display)]">
                      <Zap size={10} className="inline me-1" />
                      عاجل
                    </span>
                    <div className="flex items-center gap-1 text-white/50">
                      <Eye size={12} />
                      <span className="text-xs font-[family-name:var(--font-display)]">
                        {article.reads.toLocaleString('ar-u-nu-latn')}
                      </span>
                    </div>
                  </div>
                  <p className="text-white group-hover:text-gold text-sm font-[family-name:var(--font-display)] line-clamp-2 mb-2">
                    {article.title}
                  </p>
                  {article.publishedAt && (
                    <div className="flex items-center gap-1 text-white/30 text-xs">
                      <Clock size={10} />
                      <span className="font-[family-name:var(--font-display)]">
                        {timeAgo(article.publishedAt)}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </WidgetErrorBoundary>
    </div>
  );
}
