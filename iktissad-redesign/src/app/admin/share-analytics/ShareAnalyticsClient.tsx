'use client';

/**
 * Social Share Analytics Dashboard — Client Component
 * Most shared articles, platform breakdown pie, total shares.
 */

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Share2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { swrFetcher, shareAnalyticsKey } from '@/lib/api-client';
import { iconSizes } from '@/lib/design-tokens';
import type { ApiResponse } from '@/types';
import type { ShareAnalytics } from '@/app/api/admin/analytics/shares/route';
import WidgetErrorBoundary from '@/components/admin/WidgetErrorBoundary';

// ─── Platform Colors & Icons ────────────────────────────────────
const platformConfig: Record<string, { color: string; bg: string; label: string }> = {
  twitter:   { color: 'text-sky-400',    bg: 'bg-sky-400',    label: 'تويتر/X' },
  linkedin:  { color: 'text-blue-500',   bg: 'bg-blue-500',   label: 'لينكدإن' },
  whatsapp:  { color: 'text-emerald-400', bg: 'bg-emerald-400', label: 'واتساب' },
  facebook:  { color: 'text-blue-400',   bg: 'bg-blue-400',   label: 'فيسبوك' },
  telegram:  { color: 'text-cyan-400',   bg: 'bg-cyan-400',   label: 'تيليغرام' },
  copy_link: { color: 'text-amber-400',  bg: 'bg-amber-400',  label: 'نسخ الرابط' },
  email:     { color: 'text-rose-400',   bg: 'bg-rose-400',   label: 'بريد إلكتروني' },
};

type Period = '7' | '30' | '90';

export default function ShareAnalyticsClient() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('30');

  const { data, isLoading, error } = useSWR<ApiResponse<ShareAnalytics>>(
    shareAnalyticsKey(period),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const analytics = data?.data;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={48} className="text-loss" />
        <p className="text-white/60 font-[family-name:var(--font-display)]">Failed to load share data</p>
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
              <Share2 size={iconSizes.md} className="text-gold" />
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
              {t('admin.shareAnalytics.title')}
            </h1>
          </div>
          <p className="text-white/40 text-sm font-[family-name:var(--font-display)] ms-12">
            {t('admin.shareAnalytics.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          {(['7', '30', '90'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors ${
                period === p
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
              }`}
            >
              {p === '7' ? '7 أيام' : p === '30' ? '30 يوم' : '90 يوم'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gold/50" />
        </div>
      ) : !analytics || analytics.totalShares === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-midnight/50 border border-gold/10 rounded-xl">
          <Share2 size={40} className="text-white/20" />
          <p className="text-white/40 font-[family-name:var(--font-display)]">
            {t('admin.shareAnalytics.noShares')}
          </p>
        </div>
      ) : (
        <>
          {/* Total Shares + Platform Breakdown */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Total */}
            <WidgetErrorBoundary label="total-shares">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-midnight/50 border border-gold/10 rounded-xl p-6 flex flex-col items-center justify-center"
              >
                <p className="text-white/50 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.shareAnalytics.totalShares')}
                </p>
                <p className="text-5xl font-[family-name:var(--font-display)] font-bold text-gold">
                  {analytics.totalShares.toLocaleString('ar-u-nu-latn')}
                </p>
              </motion.div>
            </WidgetErrorBoundary>

            {/* Platform Breakdown */}
            <WidgetErrorBoundary label="platform-breakdown">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 bg-midnight/50 border border-gold/10 rounded-xl p-6"
              >
                <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-4">
                  {t('admin.shareAnalytics.platformBreakdown')}
                </h2>

                {/* Stacked bar */}
                <div className="flex h-6 rounded-full overflow-hidden bg-white/5 mb-4">
                  {analytics.platformBreakdown.map((p) => {
                    const pct = Math.round((p.count / analytics.totalShares) * 100);
                    const cfg = platformConfig[p.platform];
                    return (
                      <motion.div
                        key={p.platform}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 2)}%` }}
                        transition={{ duration: 0.6 }}
                        className={`h-full ${cfg?.bg ?? 'bg-white/20'}`}
                        title={`${cfg?.label ?? p.platform}: ${pct}%`}
                      />
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {analytics.platformBreakdown.map((p) => {
                    const cfg = platformConfig[p.platform];
                    const pct = Math.round((p.count / analytics.totalShares) * 100);
                    return (
                      <div key={p.platform} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${cfg?.bg ?? 'bg-white/20'}`} />
                        <span className="text-xs text-white/60 font-[family-name:var(--font-display)]">
                          {cfg?.label ?? p.platform}
                        </span>
                        <span className="text-xs text-white/30 font-[family-name:var(--font-display)]">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </WidgetErrorBoundary>
          </div>

          {/* Most Shared Articles */}
          <WidgetErrorBoundary label="most-shared">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-midnight/50 border border-gold/10 rounded-xl p-6"
            >
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-4">
                {t('admin.shareAnalytics.mostShared')}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gold/10">
                      <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                        #
                      </th>
                      <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                        المقال
                      </th>
                      <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                        {t('admin.shareAnalytics.shares')}
                      </th>
                      <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                        المنصات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.mostShared.map((article, i) => (
                      <tr
                        key={article.articleId}
                        className="border-b border-gold/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 text-gold/40 font-[family-name:var(--font-display)] text-sm font-bold w-8">
                          {(i + 1).toLocaleString('ar-u-nu-latn')}
                        </td>
                        <td className="py-3">
                          <Link
                            href={`/admin/articles/${article.articleId}`}
                            className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm line-clamp-1 flex items-center gap-1"
                          >
                            {article.title}
                            <ExternalLink size={12} className="text-white/20 shrink-0" />
                          </Link>
                        </td>
                        <td className="py-3 text-gold font-[family-name:var(--font-display)] text-sm font-semibold">
                          {article.shares.toLocaleString('ar-u-nu-latn')}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            {Object.entries(article.platforms)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 4)
                              .map(([platform, count]) => {
                                const cfg = platformConfig[platform];
                                return (
                                  <span
                                    key={platform}
                                    className={`text-xs px-1.5 py-0.5 rounded ${cfg?.bg ?? 'bg-white/10'} bg-opacity-20 ${cfg?.color ?? 'text-white/50'} font-[family-name:var(--font-display)]`}
                                    title={`${cfg?.label ?? platform}: ${count}`}
                                  >
                                    {count}
                                  </span>
                                );
                              })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </WidgetErrorBoundary>
        </>
      )}
    </div>
  );
}
