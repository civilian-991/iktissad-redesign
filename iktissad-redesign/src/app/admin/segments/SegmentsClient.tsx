'use client';

/**
 * Audience Segmentation Dashboard — Client Component
 * Shows reader segments: new/returning, subscriber/free, by country, by section.
 */

import { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'motion/react';
import {
  Users,
  UserPlus,
  UserCheck,
  Globe,
  Layers,
  Loader2,
  AlertCircle,
  Clock,
  ScrollText,
  Download,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { swrFetcher, segmentAnalyticsKey } from '@/lib/api-client';
import { iconSizes } from '@/lib/design-tokens';
import type { ApiResponse } from '@/types';
import type { SegmentAnalytics, SegmentGroup } from '@/app/api/admin/analytics/segments/route';
import WidgetErrorBoundary from '@/components/admin/WidgetErrorBoundary';

// ─── Period Filter ──────────────────────────────────────────────
type Period = '30' | '90';

// ─── Country code → Arabic name mapping ─────────────────────────
const countryNames: Record<string, string> = {
  AE: 'الإمارات', SA: 'السعودية', QA: 'قطر', KW: 'الكويت',
  BH: 'البحرين', OM: 'عُمان', EG: 'مصر', JO: 'الأردن',
  LB: 'لبنان', IQ: 'العراق', unknown: 'غير محدد',
};

function getCountryName(code: string): string {
  return countryNames[code] ?? code;
}

// ─── Segment Bar ────────────────────────────────────────────────
function SegmentBar({ groups, colors }: { groups: SegmentGroup[]; colors: string[] }) {
  const total = groups.reduce((s, g) => s + g.readers, 0) || 1;
  return (
    <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
      {groups.map((g, i) => {
        const pct = Math.round((g.readers / total) * 100);
        return (
          <motion.div
            key={g.label}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(pct, 2)}%` }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className={`h-full ${colors[i] ?? 'bg-white/20'}`}
            title={`${g.label}: ${pct}%`}
          />
        );
      })}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────
function SegmentStat({ group, color, t }: { group: SegmentGroup; color: string; t: (key: string) => string }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-sm font-[family-name:var(--font-display)] font-semibold">
          {group.label === 'new' ? t('admin.segments.new')
            : group.label === 'returning' ? t('admin.segments.returning')
            : group.label === 'subscriber' ? t('admin.segments.subscriber')
            : group.label === 'free' ? t('admin.segments.free')
            : getCountryName(group.label)}
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs text-white/50 font-[family-name:var(--font-display)]">
        <span className="flex items-center gap-1">
          <Users size={12} />
          {group.readers.toLocaleString('ar-u-nu-latn')}
        </span>
        <span className="flex items-center gap-1" title={t('admin.segments.avgTimeOnPage')}>
          <Clock size={12} />
          {group.avgTimeOnPage}s
        </span>
        <span className="flex items-center gap-1" title={t('admin.segments.avgScrollDepth')}>
          <ScrollText size={12} />
          {group.avgScrollDepth}%
        </span>
      </div>
    </div>
  );
}

export default function SegmentsClient() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('30');

  const { data, isLoading, error } = useSWR<ApiResponse<SegmentAnalytics>>(
    segmentAnalyticsKey(period),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const analytics = data?.data;

  // Export as CSV for email campaigns
  const handleExport = () => {
    if (!analytics) return;
    const rows: string[] = ['Segment,Category,Readers,Avg Time (s),Avg Scroll Depth (%)'];
    const addRows = (category: string, groups: SegmentGroup[]) => {
      for (const g of groups) {
        rows.push(`"${g.label}","${category}",${g.readers},${g.avgTimeOnPage},${g.avgScrollDepth}`);
      }
    };
    addRows('New vs Returning', analytics.newVsReturning);
    addRows('Subscriber vs Free', analytics.subscriberVsFree);
    addRows('Country', analytics.byCountry);
    addRows('Section Preference', analytics.bySectionPreference);

    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `segments-${period}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={48} className="text-loss" />
        <p className="text-white/60 font-[family-name:var(--font-display)]">
          Failed to load segment data
        </p>
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
              <Users size={iconSizes.md} className="text-gold" />
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
              {t('admin.segments.title')}
            </h1>
          </div>
          <p className="text-white/40 text-sm font-[family-name:var(--font-display)] ms-12">
            {t('admin.segments.subtitle')}
          </p>
        </div>
        {/* Period Selector + Export */}
        <div className="flex gap-2 items-center">
          {(['30', '90'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors ${
                period === p
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
              }`}
            >
              {p === '30' ? t('admin.segments.last30days') : t('admin.segments.last90days')}
            </button>
          ))}
          {analytics && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 text-gold border border-gold/20 rounded-lg hover:bg-gold/20 transition-colors text-sm font-[family-name:var(--font-display)]"
              title="تصدير CSV"
            >
              <Download size={iconSizes.sm} />
              CSV
            </button>
          )}
        </div>
      </div>

      {/* Total Readers */}
      {analytics && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/30 text-sm font-[family-name:var(--font-display)]"
        >
          {analytics.totalReaders.toLocaleString('ar-u-nu-latn')} {t('admin.segments.readers')}
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gold/50" />
        </div>
      ) : !analytics ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-midnight/50 border border-gold/10 rounded-xl">
          <Users size={40} className="text-white/20" />
          <p className="text-white/40 font-[family-name:var(--font-display)]">
            {t('admin.segments.noData')}
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* New vs Returning */}
          <WidgetErrorBoundary label="new-vs-returning">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <UserPlus size={iconSizes.md} className="text-gold" />
                <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                  {t('admin.segments.newVsReturning')}
                </h2>
              </div>
              <SegmentBar
                groups={analytics.newVsReturning}
                colors={['bg-teal', 'bg-purple-500']}
              />
              <div className="space-y-2 mt-4">
                {analytics.newVsReturning.map((g, i) => (
                  <SegmentStat
                    key={g.label}
                    group={g}
                    color={i === 0 ? 'bg-teal' : 'bg-purple-500'}
                    t={t}
                  />
                ))}
              </div>
            </motion.div>
          </WidgetErrorBoundary>

          {/* Subscriber vs Free */}
          <WidgetErrorBoundary label="subscriber-vs-free">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <UserCheck size={iconSizes.md} className="text-gold" />
                <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                  {t('admin.segments.subscriberVsFree')}
                </h2>
              </div>
              <SegmentBar
                groups={analytics.subscriberVsFree}
                colors={['bg-gold', 'bg-white/20']}
              />
              <div className="space-y-2 mt-4">
                {analytics.subscriberVsFree.map((g, i) => (
                  <SegmentStat
                    key={g.label}
                    group={g}
                    color={i === 0 ? 'bg-gold' : 'bg-white/20'}
                    t={t}
                  />
                ))}
              </div>
            </motion.div>
          </WidgetErrorBoundary>

          {/* By Country */}
          <WidgetErrorBoundary label="by-country">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Globe size={iconSizes.md} className="text-gold" />
                <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                  {t('admin.segments.byCountry')}
                </h2>
              </div>
              <div className="space-y-2">
                {analytics.byCountry.length === 0 ? (
                  <p className="text-white/30 text-sm font-[family-name:var(--font-display)] py-4 text-center">
                    {t('admin.segments.noData')}
                  </p>
                ) : (
                  analytics.byCountry.map((g) => (
                    <SegmentStat key={g.label} group={g} color="bg-gold/60" t={t} />
                  ))
                )}
              </div>
            </motion.div>
          </WidgetErrorBoundary>

          {/* By Section Preference */}
          <WidgetErrorBoundary label="by-section">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Layers size={iconSizes.md} className="text-gold" />
                <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                  {t('admin.segments.bySectionPreference')}
                </h2>
              </div>
              <div className="space-y-2">
                {analytics.bySectionPreference.length === 0 ? (
                  <p className="text-white/30 text-sm font-[family-name:var(--font-display)] py-4 text-center">
                    {t('admin.segments.noData')}
                  </p>
                ) : (
                  analytics.bySectionPreference.map((g) => (
                    <SegmentStat key={g.label} group={g} color="bg-bronze" t={t} />
                  ))
                )}
              </div>
            </motion.div>
          </WidgetErrorBoundary>
        </div>
      )}
    </div>
  );
}
