'use client';

/**
 * Revenue Analytics Dashboard — Client Component
 * Uses recharts for all charts, SWR for data fetching.
 * RTL-aware with Arabic number formatting.
 */

import useSWR from 'swr';
import { motion } from 'motion/react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  UserPlus,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { RevenueAnalytics } from '@/app/api/admin/revenue/route';

// ─── Color Palette ──────────────────────────────────────────────
const GOLD = '#DDA853';
const NAVY = '#27548A';
const OBSIDIAN = '#183B4E';
const CREAM = '#F5EEDC';
const PIE_COLORS = [NAVY, GOLD, '#6B7280', '#10B981', '#8B5CF6'];

// ─── Formatters ─────────────────────────────────────────────────
function formatUSD(value: number) {
  return '$' + value.toLocaleString('en-US');
}

function formatMonth(month: string) {
  try {
    return new Date(month + '-01').toLocaleDateString('ar-SA-u-ca-gregory', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return month;
  }
}

// ─── Custom Tooltip ─────────────────────────────────────────────
interface TooltipProps {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  valueFormatter?: (v: number) => string;
  labelPrefix?: string;
}

function ArabicTooltip({ active, payload, label, valueFormatter, labelPrefix }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const fmt = valueFormatter ?? ((v: number) => v.toLocaleString('ar-SA-u-ca-gregory'));
  return (
    <div className="bg-obsidian border border-gold/30 rounded-lg px-3 py-2 text-sm font-[family-name:var(--font-display)]">
      <p className="text-white/60 mb-1">{labelPrefix ?? ''}{label ? formatMonth(label) : ''}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gold font-semibold">{fmt(p.value)}</p>
      ))}
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  subLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function KpiCard({ label, value, icon: Icon, iconColor, subLabel, trend }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-midnight/50 border border-gold/10 rounded-xl p-5 flex flex-col gap-3 hover:border-gold/20 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend && trend !== 'neutral' && (
          <span className={trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </span>
        )}
      </div>
      <div>
        <p className="text-white/50 text-xs font-[family-name:var(--font-display)] mb-1">{label}</p>
        <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">{value}</p>
        {subLabel && (
          <p className="text-white/40 text-xs mt-1 font-[family-name:var(--font-display)]">{subLabel}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Skeleton Loaders ───────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-midnight/50 border border-gold/10 rounded-xl p-5 animate-pulse">
      <div className="w-11 h-11 bg-white/10 rounded-lg mb-3" />
      <div className="h-3 bg-white/10 rounded w-2/3 mb-2" />
      <div className="h-7 bg-white/10 rounded w-1/2" />
    </div>
  );
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="bg-midnight/50 border border-gold/10 rounded-xl p-6 animate-pulse"
      style={{ height: height + 64 }}
    >
      <div className="h-5 bg-white/10 rounded w-1/3 mb-6" />
      <div className="h-full bg-white/5 rounded-lg" style={{ height }} />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function RevenueClient() {
  const { t } = useTranslation();

  const { data: res, isLoading, error } = useSWR<ApiResponse<RevenueAnalytics>>(
    '/api/admin/revenue',
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const d = res?.data;

  // Prepare chart data with formatted month labels
  const mrrChartData = (d?.mrrByMonth ?? []).map((m) => ({
    ...m,
    label: formatMonth(m.month),
  }));

  // Compute cumulative growth from mrrByMonth subscriber proxy
  // We use newThisMonth as a proxy — chart uses mrrByMonth since we don't have monthly subscriber counts
  const growthData = (d?.mrrByMonth ?? []).map((m, i, arr) => {
    // Use MRR as proxy for cumulative growth trend
    const cumulative = arr.slice(0, i + 1).reduce((sum, x) => sum + Number(x.mrr), 0) / (arr.length || 1);
    return { label: formatMonth(m.month), value: Math.round(cumulative) };
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
          {t('admin.revenue.title')}
        </h1>
        <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
          {t('admin.revenue.subtitle')}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400">
          <AlertCircle size={18} />
          <span className="font-[family-name:var(--font-display)] text-sm">
            {t('admin.common.error')}
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label={t('admin.revenue.mrr')}
              value={formatUSD(d?.mrr ?? 0)}
              icon={DollarSign}
              iconColor="bg-gradient-to-br from-gold to-amber-600"
              trend="up"
            />
            <KpiCard
              label={t('admin.revenue.arpu')}
              value={formatUSD(d?.arpu ?? 0)}
              icon={TrendingUp}
              iconColor="bg-gradient-to-br from-blue-500 to-navy"
              trend="neutral"
            />
            <KpiCard
              label={t('admin.revenue.churnRate')}
              value={(d?.churnRate ?? 0).toLocaleString('ar-SA-u-ca-gregory', { maximumFractionDigits: 1 }) + '%'}
              icon={TrendingDown}
              iconColor={(d?.churnRate ?? 0) > 5 ? 'bg-gradient-to-br from-rose-500 to-red-700' : 'bg-gradient-to-br from-emerald-500 to-teal-700'}
              trend={(d?.churnRate ?? 0) > 5 ? 'down' : 'up'}
            />
            <KpiCard
              label={t('admin.revenue.activeSubscribers')}
              value={(d?.activeSubscribers ?? 0).toLocaleString('ar-SA-u-ca-gregory')}
              icon={Users}
              iconColor="bg-gradient-to-br from-purple-500 to-indigo-700"
              trend="neutral"
            />
            <KpiCard
              label={t('admin.revenue.trials')}
              value={(d?.trialSubscribers ?? 0).toLocaleString('ar-SA-u-ca-gregory')}
              icon={Users}
              iconColor="bg-gradient-to-br from-emerald-500 to-teal-700"
              trend="neutral"
            />
            <KpiCard
              label={t('admin.revenue.newThisMonth')}
              value={(d?.newThisMonth ?? 0).toLocaleString('ar-SA-u-ca-gregory')}
              icon={UserPlus}
              iconColor="bg-gradient-to-br from-gold to-bronze"
              trend="up"
              subLabel={`${(d?.canceledThisMonth ?? 0).toLocaleString('ar-SA-u-ca-gregory')} ملغى`}
            />
          </>
        )}
      </div>

      {/* Charts Row 1: MRR Line + New Subscribers Bar */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* MRR Line Chart */}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-midnight/50 border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-white font-[family-name:var(--font-display)] font-semibold mb-1">
              {t('admin.revenue.charts.mrrTrend')}
            </h2>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-4">
              {t('admin.revenue.last12Months')}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={mrrChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-display)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-display)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v.toLocaleString('ar-SA-u-ca-gregory')}
                />
                <Tooltip
                  content={<ArabicTooltip valueFormatter={formatUSD} />}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke={GOLD}
                  strokeWidth={2.5}
                  dot={{ fill: GOLD, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Plan Distribution Donut */}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-midnight/50 border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-white font-[family-name:var(--font-display)] font-semibold mb-1">
              {t('admin.revenue.charts.planDistribution')}
            </h2>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-4">
              {t('admin.revenue.activeAndTrialing')}
            </p>
            {(d?.planDistribution?.length ?? 0) === 0 ? (
              <div className="flex items-center justify-center h-64 text-white/30 font-[family-name:var(--font-display)] text-sm">
                {t('admin.revenue.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={d?.planDistribution ?? []}
                    dataKey="count"
                    nameKey="planName"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                  >
                    {(d?.planDistribution ?? []).map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      Number(value).toLocaleString('ar-SA-u-ca-gregory'),
                    ]}
                    contentStyle={{
                      background: OBSIDIAN,
                      border: `1px solid rgba(221,168,83,0.3)`,
                      borderRadius: '8px',
                      fontFamily: 'var(--font-display)',
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                    itemStyle={{ color: GOLD }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-display)', fontSize: 12 }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        )}
      </div>

      {/* Charts Row 2: Subscriber Growth Area + Revenue Bar */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subscriber Growth Area Chart */}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-midnight/50 border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-white font-[family-name:var(--font-display)] font-semibold mb-1">
              {t('admin.revenue.charts.growth')}
            </h2>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-4">
              {t('admin.revenue.last12Months')}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={growthData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="creamGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CREAM} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CREAM} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-display)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-display)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v.toLocaleString('ar-SA-u-ca-gregory')}
                />
                <Tooltip content={<ArabicTooltip valueFormatter={formatUSD} />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={CREAM}
                  strokeWidth={2}
                  fill="url(#creamGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Monthly Revenue Bar Chart */}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-midnight/50 border border-gold/10 rounded-xl p-6"
          >
            <h2 className="text-white font-[family-name:var(--font-display)] font-semibold mb-1">
              {t('admin.revenue.charts.newSubscribers')}
            </h2>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-4">
              {t('admin.revenue.last12Months')}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={(d?.revenueByMonth ?? []).map((m) => ({
                  ...m,
                  label: formatMonth(m.month),
                }))}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-display)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-display)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v.toLocaleString('ar-SA-u-ca-gregory')}
                />
                <Tooltip content={<ArabicTooltip valueFormatter={formatUSD} />} />
                <Bar dataKey="revenue" fill={NAVY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>
    </div>
  );
}
