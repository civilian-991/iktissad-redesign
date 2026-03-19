'use client';

/**
 * PaywallOptimizer — Collapsible panel with AI paywall optimization suggestions.
 * Only active for published articles.
 *
 * Fetches: GET /api/ai/paywall-suggestions?articleId=[articleId]  (lazy on expand)
 */

import { useState } from 'react';
import useSWR from 'swr';
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  TrendingUp,
  Sparkles,
  Share2,
} from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

type SuggestionType = 'gate' | 'meter' | 'optimize' | 'promote';
type Priority = 'high' | 'medium' | 'low';
type ArticleStatus = 'draft' | 'review' | 'scheduled' | 'published';

interface PaywallSuggestion {
  type: SuggestionType;
  priority: Priority;
  titleAr: string;
  descriptionAr: string;
  dataPoint: string;
}

interface PaywallSuggestionData {
  articleId: string;
  currentStatus: 'free' | 'paywalled';
  engagementScore: number;
  suggestions: PaywallSuggestion[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const SUGGESTION_ICONS: Record<SuggestionType, React.ReactNode> = {
  gate: <Lock size={15} className="text-gold" />,
  meter: <TrendingUp size={15} className="text-blue-400" />,
  optimize: <Sparkles size={15} className="text-purple-400" />,
  promote: <Share2 size={15} className="text-profit" />,
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-loss/10 text-loss border border-loss/20',
  medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  low: 'bg-white/5 text-white/50 border border-white/10',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

// ── Sub-components ─────────────────────────────────────────────────────────

function EngagementBar({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const color =
    clamped >= 70 ? 'bg-profit' : clamped >= 40 ? 'bg-amber-400' : 'bg-loss';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/50 text-xs font-[family-name:var(--font-display)]">
          درجة التفاعل
        </span>
        <span className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
          {clamped}/100
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: PaywallSuggestion }) {
  return (
    <div className="bg-white/5 border border-gold/10 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
            {SUGGESTION_ICONS[suggestion.type]}
          </div>
          <span className="text-white text-sm font-[family-name:var(--font-display)] font-medium leading-snug">
            {suggestion.titleAr}
          </span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-[family-name:var(--font-display)] flex-shrink-0 ${PRIORITY_STYLES[suggestion.priority]}`}
        >
          {PRIORITY_LABELS[suggestion.priority]}
        </span>
      </div>
      <p className="text-white/50 text-xs font-[family-name:var(--font-display)] leading-relaxed pr-9">
        {suggestion.descriptionAr}
      </p>
      <p className="text-gold/70 text-xs font-[family-name:var(--font-display)] pr-9 italic">
        {suggestion.dataPoint}
      </p>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function PaywallOptimizer({
  articleId,
  articleStatus,
}: {
  articleId: string;
  articleStatus: ArticleStatus;
}) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useSWR<ApiResponse<PaywallSuggestionData>>(
    open && articleStatus === 'published'
      ? `/api/ai/paywall-suggestions?articleId=${articleId}`
      : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const payload = data?.data;

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
            <ShieldCheck size={16} />
          </div>
          <span className="font-[family-name:var(--font-display)] font-semibold">
            تحسين جدار الدفع
          </span>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* ── Body ── */}
      {open && (
        <div className="border-t border-gold/10 p-5 space-y-4" dir="rtl">
          {articleStatus !== 'published' ? (
            <p className="text-center text-white/40 text-sm font-[family-name:var(--font-display)] py-8">
              متاح للمقالات المنشورة فقط
            </p>
          ) : isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={28} className="animate-spin text-gold" />
            </div>
          ) : !payload ? (
            <p className="text-center text-white/40 text-sm font-[family-name:var(--font-display)] py-8">
              تعذّر تحميل الاقتراحات. حاول مرة أخرى.
            </p>
          ) : (
            <>
              {/* ── Status chip ── */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-[family-name:var(--font-display)] border ${
                    payload.currentStatus === 'paywalled'
                      ? 'bg-gold/10 text-gold border-gold/20'
                      : 'bg-white/5 text-white/50 border-white/10'
                  }`}
                >
                  <Lock size={11} />
                  {payload.currentStatus === 'paywalled' ? 'مقال مدفوع' : 'مقال مجاني'}
                </span>
              </div>

              {/* ── Engagement bar ── */}
              <EngagementBar score={payload.engagementScore} />

              {/* ── Suggestions ── */}
              {payload.suggestions.length === 0 ? (
                <p className="text-center text-white/40 text-sm font-[family-name:var(--font-display)] py-6">
                  لا توجد اقتراحات في الوقت الحالي.
                </p>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-white/50 text-xs font-[family-name:var(--font-display)] uppercase tracking-wider">
                    الاقتراحات ({payload.suggestions.length})
                  </h4>
                  {payload.suggestions.map((s, i) => (
                    <SuggestionCard key={i} suggestion={s} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
