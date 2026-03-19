'use client';

/**
 * ContentGapWidget — Dashboard widget showing content coverage gaps.
 * Three tabs: section coverage | geographic coverage | story ideas.
 *
 * Fetches: GET /api/admin/content-gap
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Loader2, MapPin, Lightbulb, BarChart2, Plus } from 'lucide-react';
import Link from 'next/link';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'low';

interface SectionCoverage {
  sectionName: string;
  articleCount: number;
  targetCount: number;
  gapPercentage: number;
}

interface CountryCoverage {
  country: string;
  articleCount: number;
  lastArticleDate: string | null;
}

interface StoryIdea {
  topic: string;
  topicAr: string;
  reason: string;
  targetSection: string;
  priority: Priority;
}

interface ContentGapData {
  coverageBySection: SectionCoverage[];
  coverageByCountry: CountryCoverage[];
  underperformingArticles: Array<{
    id: string;
    title: string;
    views: number;
    avgScrollDepth: number;
    sectionAvgViews: number;
    performanceRatio: number;
    suggestions: string[];
  }>;
  suggestedStoryIdeas: StoryIdea[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  'السعودية': '🇸🇦',
  'الإمارات': '🇦🇪',
  'قطر': '🇶🇦',
  'الكويت': '🇰🇼',
  'البحرين': '🇧🇭',
  'عُمان': '🇴🇲',
  'مصر': '🇪🇬',
  'الأردن': '🇯🇴',
  'العراق': '🇮🇶',
  'لبنان': '🇱🇧',
  'المغرب': '🇲🇦',
  'تونس': '🇹🇳',
  'ليبيا': '🇱🇾',
  'الجزائر': '🇩🇿',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-gold/10 text-gold border border-gold/20',
  medium: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  low: 'bg-white/5 text-white/50 border border-white/10',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'أولوية عالية',
  medium: 'أولوية متوسطة',
  low: 'أولوية منخفضة',
};

type Tab = 'section' | 'geo' | 'ideas';

// ── Tab: Section Coverage ──────────────────────────────────────────────────

function SectionCoverageTab({ sections }: { sections: SectionCoverage[] }) {
  if (sections.length === 0) {
    return (
      <p className="text-center text-white/40 text-sm font-[family-name:var(--font-display)] py-10">
        لا توجد بيانات للتغطية القسمية.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((s) => {
        const pct =
          s.targetCount > 0
            ? Math.min(100, Math.round((s.articleCount / s.targetCount) * 100))
            : 0;
        const barColor =
          s.gapPercentage > 30
            ? 'bg-loss'
            : s.gapPercentage > 10
            ? 'bg-amber-400'
            : 'bg-profit';

        return (
          <div key={s.sectionName}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/80 text-sm font-[family-name:var(--font-display)]">
                {s.sectionName}
              </span>
              <span className="text-white/50 text-xs font-[family-name:var(--font-display)]">
                {s.articleCount}/{s.targetCount} مقال
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {s.gapPercentage > 0 && (
              <p className="text-xs font-[family-name:var(--font-display)] text-white/30 mt-1">
                فجوة {Math.round(s.gapPercentage)}%
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Geographic Coverage ───────────────────────────────────────────────

function GeoCoverageTab({ countries }: { countries: CountryCoverage[] }) {
  const sorted = [...countries].sort((a, b) => a.articleCount - b.articleCount);

  if (sorted.length === 0) {
    return (
      <p className="text-center text-white/40 text-sm font-[family-name:var(--font-display)] py-10">
        لا توجد بيانات للتغطية الجغرافية.
      </p>
    );
  }

  const maxCount = Math.max(...sorted.map((c) => c.articleCount), 1);

  return (
    <div className="space-y-2">
      {sorted.map((c) => {
        const flag = COUNTRY_FLAGS[c.country] ?? '🌍';
        const pct = Math.round((c.articleCount / maxCount) * 100);
        const dateLabel = c.lastArticleDate
          ? new Date(c.lastArticleDate).toLocaleDateString('ar-SA', {
              day: 'numeric',
              month: 'short',
            })
          : 'لا توجد مقالات';

        return (
          <div
            key={c.country}
            className="bg-white/5 border border-gold/10 rounded-xl px-4 py-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{flag}</span>
                <span className="text-white/80 text-sm font-[family-name:var(--font-display)]">
                  {c.country}
                </span>
              </div>
              <div className="text-left">
                <span className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
                  {c.articleCount.toLocaleString('ar')}
                </span>
                <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">
                  {dateLabel}
                </p>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500/70 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Story Ideas ───────────────────────────────────────────────────────

function StoryIdeasTab({ ideas }: { ideas: StoryIdea[] }) {
  if (ideas.length === 0) {
    return (
      <p className="text-center text-white/40 text-sm font-[family-name:var(--font-display)] py-10">
        لا توجد أفكار مقترحة حالياً.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ideas.map((idea, i) => (
        <div
          key={i}
          className="bg-white/5 border border-gold/10 rounded-xl p-4 space-y-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white font-[family-name:var(--font-display)] font-semibold text-sm leading-snug">
                {idea.topicAr}
              </p>
              <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mt-0.5">
                {idea.targetSection}
              </p>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-[family-name:var(--font-display)] flex-shrink-0 ${PRIORITY_STYLES[idea.priority]}`}
            >
              {PRIORITY_LABELS[idea.priority]}
            </span>
          </div>
          <p className="text-white/50 text-xs font-[family-name:var(--font-display)] leading-relaxed">
            {idea.reason}
          </p>
          <div className="pt-1">
            <Link
              href="/admin/articles/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold text-xs font-[family-name:var(--font-display)] hover:bg-gold/20 transition-colors border border-gold/20"
            >
              <Plus size={12} />
              إنشاء مقال
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'section', label: 'التغطية بالقسم', icon: <BarChart2 size={14} /> },
  { id: 'geo', label: 'التغطية الجغرافية', icon: <MapPin size={14} /> },
  { id: 'ideas', label: 'أفكار مقترحة', icon: <Lightbulb size={14} /> },
];

export default function ContentGapWidget() {
  const [activeTab, setActiveTab] = useState<Tab>('section');

  const { data, isLoading } = useSWR<ApiResponse<ContentGapData>>(
    '/api/admin/content-gap',
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const payload = data?.data;

  return (
    <div
      className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden"
      dir="rtl"
    >
      {/* ── Widget header ── */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
          <BarChart2 size={16} />
        </div>
        <h3 className="text-white font-[family-name:var(--font-display)] font-semibold">
          فجوات التغطية
        </h3>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-gold/10 px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-[family-name:var(--font-display)] border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-gold text-gold'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="p-5">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={28} className="animate-spin text-gold" />
          </div>
        ) : !payload ? (
          <p className="text-center text-white/40 text-sm font-[family-name:var(--font-display)] py-8">
            تعذّر تحميل البيانات. حاول مرة أخرى.
          </p>
        ) : (
          <>
            {activeTab === 'section' && (
              <SectionCoverageTab sections={payload.coverageBySection} />
            )}
            {activeTab === 'geo' && (
              <GeoCoverageTab countries={payload.coverageByCountry} />
            )}
            {activeTab === 'ideas' && (
              <StoryIdeasTab ideas={payload.suggestedStoryIdeas} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
