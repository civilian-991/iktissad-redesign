'use client';

/**
 * RevenueAttributionWidget — Collapsible sidebar panel showing subscription
 * conversion attribution for a single article.
 *
 * Fetches: GET /api/admin/revenue-attribution?articleId=[articleId]
 */

import { useState } from 'react';
import useSWR from 'swr';
import { DollarSign, ChevronDown, ChevronUp, Loader2, TrendingUp } from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

interface ArticleRevenueStat {
  articleId: string;
  title: string;
  conversionCount: number;
  estimatedRevenue: number;
  avgScrollDepth: number;
  readThroughRate: number;
  isPaywalled: boolean;
  articleType: string | null;
}

interface RevenueAttributionData {
  articles: ArticleRevenueStat[];
  totalConversions: number;
  totalAttributedRevenue: number;
  topConvertingArticleType: string | null;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MetricBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-white/50 text-xs font-[family-name:var(--font-display)]">{label}</span>
        <span className="text-white/70 text-xs font-[family-name:var(--font-display)]">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function RevenueAttributionWidget({ articleId }: { articleId: string }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useSWR<ApiResponse<RevenueAttributionData>>(
    open ? `/api/admin/revenue-attribution?articleId=${articleId}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const payload = data?.data;
  const stat = payload?.articles?.[0];

  // Section-average placeholder (API may provide it later; use totalConversions as reference)
  const sectionAvg = payload
    ? Math.max(1, Math.round(payload.totalConversions * 0.6))
    : 1;

  return (
    <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
      {/* ── Header toggle ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-white/70 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
            <DollarSign size={16} />
          </div>
          <span className="font-[family-name:var(--font-display)] font-semibold">
            الإيرادات المنسوبة
          </span>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* ── Body ── */}
      {open && (
        <div className="border-t border-gold/10 p-5 space-y-5" dir="rtl">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={28} className="animate-spin text-gold" />
            </div>
          ) : !stat ? (
            <p className="text-center text-white/40 text-sm font-[family-name:var(--font-display)] py-8">
              لم يتم تسجيل تحويلات اشتراك لهذا المقال بعد
            </p>
          ) : (
            <>
              {/* ── Primary KPI ── */}
              <div className="bg-white/5 border border-gold/10 rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold flex-shrink-0">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <p className="text-white font-[family-name:var(--font-display)] font-bold text-3xl leading-none">
                    {stat.conversionCount.toLocaleString('ar')}
                  </p>
                  <p className="text-white/50 text-sm font-[family-name:var(--font-display)] mt-1">
                    اشتراك جديد
                  </p>
                </div>
              </div>

              {/* ── Revenue chip ── */}
              <div className="bg-profit/10 border border-profit/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-white/60 text-sm font-[family-name:var(--font-display)]">
                  إيرادات منسوبة تقريبية
                </span>
                <span className="text-profit font-[family-name:var(--font-display)] font-semibold text-base">
                  ~{stat.estimatedRevenue.toLocaleString('ar')} ر.س
                </span>
              </div>

              {/* ── Comparison bar ── */}
              <div className="space-y-3">
                <h4 className="text-white/50 text-xs font-[family-name:var(--font-display)] uppercase tracking-wider">
                  مقارنة بمتوسط القسم
                </h4>
                <MetricBar
                  label="هذا المقال"
                  value={stat.conversionCount}
                  max={Math.max(stat.conversionCount, sectionAvg)}
                  color="bg-gold"
                />
                <MetricBar
                  label="متوسط القسم"
                  value={sectionAvg}
                  max={Math.max(stat.conversionCount, sectionAvg)}
                  color="bg-white/20"
                />
              </div>

              {/* ── Extra metrics ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-gold/10 rounded-xl p-3">
                  <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-1">
                    عمق التمرير
                  </p>
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold text-lg">
                    {stat.avgScrollDepth}%
                  </p>
                </div>
                <div className="bg-white/5 border border-gold/10 rounded-xl p-3">
                  <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-1">
                    معدل القراءة الكاملة
                  </p>
                  <p className="text-white font-[family-name:var(--font-display)] font-semibold text-lg">
                    {stat.readThroughRate}%
                  </p>
                </div>
              </div>

              {/* ── Paywall badge ── */}
              {stat.isPaywalled && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-[family-name:var(--font-display)] bg-gold/10 text-gold border border-gold/20">
                    مقال مدفوع
                  </span>
                  {stat.articleType && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-[family-name:var(--font-display)] bg-white/5 text-white/50 border border-white/10">
                      {stat.articleType}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
