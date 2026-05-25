/**
 * ArticleAnalyticsPanel — Collapsible analytics section for article edit page.
 * Shows: total reads, avg time on page, avg scroll depth, read-through rate.
 * Reads over time (last 7 days) — recharts AreaChart.
 * Subscriber vs anonymous breakdown.
 *
 * Fetches: GET /api/admin/reading-analytics?articleId=[id]
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  BarChart2,
  ChevronDown,
  ChevronUp,
  Eye,
  Clock,
  TrendingUp,
  Users,
  UserX,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { ReadingAnalytics } from '@/app/api/admin/reading-analytics/route';

// ── Helpers ────────────────────────────────────────────────────

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}ث`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}د ${s}ث` : `${m}د`
}

function formatDay(dateStr: string): string {
  const [, , day] = dateStr.split('-')
  return day
}

// ── Stat card ─────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white/5 border border-gold/10 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-0.5">{label}</p>
        <p className="text-white font-[family-name:var(--font-display)] font-semibold text-lg leading-none">{value}</p>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function ArticleAnalyticsPanel({ articleId }: { articleId: string }) {
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useSWR<ApiResponse<ReadingAnalytics>>(
    open ? `/api/admin/reading-analytics?articleId=${articleId}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  )

  const detail = data?.data?.articleDetail

  return (
    <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-white/70 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
            <BarChart2 size={16} />
          </div>
          <span className="font-[family-name:var(--font-display)] font-semibold">تحليلات المقال</span>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="border-t border-gold/10 p-5 space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={28} className="animate-spin text-gold" />
            </div>
          ) : !detail ? (
            <p className="text-center text-white/40 text-sm font-[family-name:var(--font-display)] py-8">
              لا توجد بيانات قراءة لهذا المقال بعد.
            </p>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={Eye}
                  label="إجمالي القراءات"
                  value={detail.totalReads.toLocaleString('ar-u-nu-latn')}
                  color="text-gold"
                />
                <StatCard
                  icon={Clock}
                  label="متوسط وقت القراءة"
                  value={formatSeconds(detail.avgTimeOnPage)}
                  color="text-teal-400"
                />
                <StatCard
                  icon={TrendingUp}
                  label="متوسط عمق التمرير"
                  value={`${detail.avgScrollDepth}%`}
                  color="text-blue-400"
                />
                <StatCard
                  icon={Eye}
                  label="معدل القراءة الكاملة"
                  value={`${detail.readThroughRate}%`}
                  color="text-profit"
                />
              </div>

              {/* Reads over time */}
              <div>
                <h4 className="text-white/60 text-xs font-[family-name:var(--font-display)] mb-3 uppercase tracking-wider">
                  القراءات — آخر 7 أيام
                </h4>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={detail.readsByDay}
                      margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#DDA853" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#DDA853" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDay}
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#183B4E',
                          border: '1px solid rgba(221,168,83,0.2)',
                          borderRadius: '0.5rem',
                          fontSize: '0.8125rem',
                          color: '#F5EEDC',
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(v: any) => [`${v} قراءة`, '']}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        labelFormatter={(l: any) => `يوم ${formatDay(String(l))}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="reads"
                        stroke="#DDA853"
                        strokeWidth={2}
                        fill="url(#goldGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#DDA853' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subscriber vs anonymous */}
              <div>
                <h4 className="text-white/60 text-xs font-[family-name:var(--font-display)] mb-3 uppercase tracking-wider">
                  المشتركون مقابل الزوار
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-gold/10 rounded-xl p-4 flex items-center gap-3">
                    <Users size={18} className="text-gold flex-shrink-0" />
                    <div>
                      <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">مشتركون</p>
                      <p className="text-white font-[family-name:var(--font-display)] font-semibold">
                        {detail.subscriberReads.toLocaleString('ar-u-nu-latn')}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-gold/10 rounded-xl p-4 flex items-center gap-3">
                    <UserX size={18} className="text-white/40 flex-shrink-0" />
                    <div>
                      <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">زوار</p>
                      <p className="text-white font-[family-name:var(--font-display)] font-semibold">
                        {detail.anonymousReads.toLocaleString('ar-u-nu-latn')}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Simple bar ratio */}
                {detail.totalReads > 0 && (
                  <div className="mt-3 h-2 rounded-full overflow-hidden bg-white/5 flex">
                    <div
                      className="h-full bg-gold transition-all duration-700"
                      style={{
                        width: `${Math.round((detail.subscriberReads / detail.totalReads) * 100)}%`,
                      }}
                    />
                    <div className="flex-1 h-full bg-white/10" />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
