'use client';

/**
 * Reading Analytics Dashboard — Client Component
 * Top articles table, subscriber vs anon, section performance,
 * and spread dwell horizontal bar charts.
 */

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BookOpen,
  Clock,
  ScrollText,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowUpDown,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { ReadingAnalytics } from '@/app/api/admin/reading-analytics/route';

// ─── Color Palette ──────────────────────────────────────────────
const GOLD = '#DDA853';
const NAVY = '#27548A';
const OBSIDIAN = '#183B4E';

// ─── Date Range Filter ──────────────────────────────────────────
type DateRange = '7' | '30' | '90' | 'custom';

// ─── Time Formatter ─────────────────────────────────────────────
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins === 0) return `${seconds.toLocaleString('ar-SA-u-ca-gregory')} ث`;
  return `${mins.toLocaleString('ar-SA-u-ca-gregory')} د`;
}

// ─── Custom Tooltip ─────────────────────────────────────────────
interface TooltipProps {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  formatValue?: (v: number) => string;
}

function ArabicTooltip({ active, payload, label, formatValue }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const fmt = formatValue ?? ((v: number) => v.toLocaleString('ar-SA-u-ca-gregory'));
  return (
    <div className="bg-obsidian border border-gold/30 rounded-lg px-3 py-2 text-sm font-[family-name:var(--font-display)]">
      {label && <p className="text-white/60 mb-1">{label}</p>}
      <p className="text-gold font-semibold">{fmt(payload[0].value)}</p>
    </div>
  );
}

// ─── Chart Skeleton ─────────────────────────────────────────────
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-midnight/50 border border-gold/10 rounded-xl p-6 animate-pulse" style={{ height: height + 80 }}>
      <div className="h-5 bg-white/10 rounded w-1/3 mb-4" />
      <div className="bg-white/5 rounded-lg" style={{ height }} />
    </div>
  );
}

// ─── Scroll Depth Bar ────────────────────────────────────────────
function ScrollDepthBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(value, 100)}%`,
            background: value >= 70 ? GOLD : value >= 40 ? NAVY : '#6B7280',
          }}
        />
      </div>
      <span className="text-white/60 text-xs w-8 text-end">{value.toLocaleString('ar-SA-u-ca-gregory')}%</span>
    </div>
  );
}

// ─── Read-through Badge ─────────────────────────────────────────
function ReadThroughBadge({ value }: { value: number }) {
  const color = value >= 50 ? 'bg-emerald-500/20 text-emerald-400' : value >= 25 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/40';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-[family-name:var(--font-display)] ${color}`}>
      {value.toLocaleString('ar-SA-u-ca-gregory')}%
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function ReadingAnalyticsClient() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortCol, setSortCol] = useState<'reads' | 'avgTimeOnPage' | 'avgScrollDepth' | 'readThroughRate'>('reads');
  const [sortAsc, setSortAsc] = useState(false);

  // Build query params — memoized so the SWR key only changes when filters do.
  // Without useMemo, Date.now() ran on every render, defeating SWR caching.
  const params = useMemo(() => {
    if (dateRange === 'custom' && customFrom && customTo) {
      return `?from=${customFrom}&to=${customTo}`;
    }
    if (dateRange !== 'custom') {
      // eslint-disable-next-line react-hooks/purity
      const from = new Date(Date.now() - parseInt(dateRange) * 86400000).toISOString();
      return `?from=${from}`;
    }
    return '';
  }, [dateRange, customFrom, customTo]);

  const { data: res, isLoading, error } = useSWR<ApiResponse<ReadingAnalytics>>(
    `/api/admin/reading-analytics${params}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const d = res?.data;

  // Sort articles
  const sortedArticles = [...(d?.topArticles ?? [])].sort((a, b) => {
    const diff = (a[sortCol] as number) - (b[sortCol] as number);
    return sortAsc ? diff : -diff;
  });

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const totalReads = (d?.subscriberVsAnon.subscriber ?? 0) + (d?.subscriberVsAnon.anonymous ?? 0);
  const subPct = totalReads > 0
    ? Math.round((d!.subscriberVsAnon.subscriber / totalReads) * 100)
    : 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.readingAnalytics.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.readingAnalytics.subtitle')}
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['7', '30', '90'] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all ${
                dateRange === r
                  ? 'bg-gold text-obsidian font-semibold'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t(`admin.readingAnalytics.filters.last${r}days` as `admin.readingAnalytics.filters.last${typeof r}days`)}
            </button>
          ))}
          <button
            onClick={() => setDateRange('custom')}
            className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all ${
              dateRange === 'custom'
                ? 'bg-gold text-obsidian font-semibold'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t('admin.readingAnalytics.filters.custom')}
          </button>
          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white/5 border border-gold/20 rounded-lg px-3 py-1.5 text-white text-sm font-[family-name:var(--font-display)]"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white/5 border border-gold/20 rounded-lg px-3 py-1.5 text-white text-sm font-[family-name:var(--font-display)]"
              />
            </>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400">
          <AlertCircle size={18} />
          <span className="font-[family-name:var(--font-display)] text-sm">{t('admin.common.error')}</span>
        </div>
      )}

      {/* Subscriber vs Anonymous */}
      <div className="bg-midnight/50 border border-gold/10 rounded-xl p-6">
        <h2 className="text-white font-[family-name:var(--font-display)] font-semibold mb-4">
          {t('admin.readingAnalytics.subscriberVsAnon')}
        </h2>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-white/10 rounded w-2/3" />
            <div className="h-4 bg-white/10 rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-navy/20 border border-navy/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-white">
                  {(d?.subscriberVsAnon.subscriber ?? 0).toLocaleString('ar-SA-u-ca-gregory')}
                </p>
                <p className="text-white/50 text-sm mt-1 font-[family-name:var(--font-display)]">
                  {t('admin.readingAnalytics.subscribers')}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-white">
                  {(d?.subscriberVsAnon.anonymous ?? 0).toLocaleString('ar-SA-u-ca-gregory')}
                </p>
                <p className="text-white/50 text-sm mt-1 font-[family-name:var(--font-display)]">
                  {t('admin.readingAnalytics.anonymous')}
                </p>
              </div>
            </div>
            {/* Percentage bar */}
            <div>
              <div className="flex justify-between text-xs font-[family-name:var(--font-display)] text-white/50 mb-1">
                <span>{t('admin.readingAnalytics.subscribers')} {subPct}%</span>
                <span>{t('admin.readingAnalytics.anonymous')} {100 - subPct}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-navy transition-all rounded-s-full"
                  style={{ width: `${subPct}%` }}
                />
                <div
                  className="h-full bg-white/20 flex-1 rounded-e-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Articles Table */}
      <div className="bg-midnight/50 border border-gold/10 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={18} className="text-gold" />
          <h2 className="text-white font-[family-name:var(--font-display)] font-semibold">
            {t('admin.readingAnalytics.topArticles')}
          </h2>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sortedArticles.length === 0 ? (
          <p className="text-center text-white/40 py-8 font-[family-name:var(--font-display)] text-sm">
            {t('admin.readingAnalytics.noData')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10">
                  <th className="text-start pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold ps-2 pe-4 w-8">
                    {t('admin.readingAnalytics.columns.rank')}
                  </th>
                  <th className="text-start pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold pe-4">
                    {t('admin.readingAnalytics.columns.title')}
                  </th>
                  <th
                    className="text-start pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold pe-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('reads')}
                  >
                    <span className="flex items-center gap-1">
                      {t('admin.readingAnalytics.columns.reads')}
                      <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    className="text-start pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold pe-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('avgTimeOnPage')}
                  >
                    <span className="flex items-center gap-1">
                      {t('admin.readingAnalytics.columns.avgTime')}
                      <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    className="text-start pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold pe-4 cursor-pointer hover:text-white transition-colors min-w-32"
                    onClick={() => handleSort('avgScrollDepth')}
                  >
                    <span className="flex items-center gap-1">
                      {t('admin.readingAnalytics.columns.scrollDepth')}
                      <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    className="text-start pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('readThroughRate')}
                  >
                    <span className="flex items-center gap-1">
                      {t('admin.readingAnalytics.columns.readThrough')}
                      <ArrowUpDown size={12} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedArticles.map((article, idx) => (
                  <tr key={article.articleId} className="border-b border-gold/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 ps-2 pe-4">
                      <span className="text-white/40 text-sm font-[family-name:var(--font-display)]">
                        {(idx + 1).toLocaleString('ar-SA-u-ca-gregory')}
                      </span>
                    </td>
                    <td className="py-3 pe-4 max-w-xs">
                      <Link
                        href={`/${article.articleId}`}
                        className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm line-clamp-1"
                      >
                        {article.title}
                      </Link>
                    </td>
                    <td className="py-3 pe-4">
                      <span className="text-white font-[family-name:var(--font-display)] text-sm">
                        {article.reads.toLocaleString('ar-SA-u-ca-gregory')}
                      </span>
                    </td>
                    <td className="py-3 pe-4">
                      <span className="flex items-center gap-1 text-white/70 font-[family-name:var(--font-display)] text-sm">
                        <Clock size={12} className="text-gold" />
                        {formatTime(article.avgTimeOnPage)}
                      </span>
                    </td>
                    <td className="py-3 pe-4 min-w-32">
                      <ScrollDepthBar value={article.avgScrollDepth} />
                    </td>
                    <td className="py-3">
                      <ReadThroughBadge value={article.readThroughRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts Row: Section Performance + Spread Dwell */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Section Performance Horizontal Bar */}
        {isLoading ? (
          <ChartSkeleton height={320} />
        ) : (
          <div className="bg-midnight/50 border border-gold/10 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-gold" />
              <h2 className="text-white font-[family-name:var(--font-display)] font-semibold">
                {t('admin.readingAnalytics.sectionPerformance')}
              </h2>
            </div>
            {(d?.sectionPerformance?.length ?? 0) === 0 ? (
              <div className="flex items-center justify-center h-64 text-white/30 text-sm font-[family-name:var(--font-display)]">
                {t('admin.readingAnalytics.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, (d?.sectionPerformance.length ?? 0) * 40 + 40)}>
                <BarChart
                  data={d?.sectionPerformance ?? []}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-display)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.toLocaleString('ar-SA-u-ca-gregory')}
                  />
                  <YAxis
                    type="category"
                    dataKey="sectionName"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'var(--font-display)' }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ArabicTooltip active={active} payload={(payload as unknown) as { value: number; name: string }[]} label={String(label ?? '')} />
                    )}
                  />
                  <Bar dataKey="totalReads" radius={[0, 4, 4, 0]}>
                    {(d?.sectionPerformance ?? []).map((_, idx) => (
                      <Cell key={idx} fill={idx % 2 === 0 ? NAVY : GOLD} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Spread Dwell Horizontal Bar */}
        {isLoading ? (
          <ChartSkeleton height={320} />
        ) : (
          <div className="bg-midnight/50 border border-gold/10 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <ScrollText size={18} className="text-gold" />
              <h2 className="text-white font-[family-name:var(--font-display)] font-semibold">
                {t('admin.readingAnalytics.spreadDwell')}
              </h2>
            </div>
            {(d?.spreadDwell?.length ?? 0) === 0 ? (
              <div className="flex items-center justify-center h-64 text-white/30 text-sm font-[family-name:var(--font-display)]">
                {t('admin.readingAnalytics.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, (d?.spreadDwell.length ?? 0) * 40 + 40)}>
                <BarChart
                  data={(d?.spreadDwell ?? []).map((s) => ({
                    ...s,
                    label: s.spreadNumber.toLocaleString('ar-SA-u-ca-gregory'),
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-display)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatTime(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'var(--font-display)' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    label={{
                      value: t('admin.readingAnalytics.spread'),
                      position: 'insideTopRight',
                      style: { fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'var(--font-display)' },
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ArabicTooltip
                        active={active}
                        payload={(payload as unknown) as { value: number; name: string }[]}
                        label={label ? `${t('admin.readingAnalytics.spread')} ${label}` : ''}
                        formatValue={formatTime}
                      />
                    )}
                  />
                  <Bar dataKey="avgDwellSeconds" fill={GOLD} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
