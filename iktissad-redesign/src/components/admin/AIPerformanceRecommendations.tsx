'use client';

/**
 * AIPerformanceRecommendations — Collapsible panel with AI-generated performance
 * improvement recommendations for a published article.
 *
 * Uses POST /api/ai/performance-recommendations with { articleId } body.
 * Triggered lazily when the panel is opened (not on mount).
 */

import { useState } from 'react';
import {
  Zap,
  ChevronDown,
  ChevronUp,
  Loader2,
  Type,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Search,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type Category = 'headline' | 'internal_links' | 'content_depth' | 'multimedia' | 'seo';
type ImpactLevel = 'high' | 'medium' | 'low';

interface Recommendation {
  category: Category;
  titleAr: string;
  descriptionAr: string;
  impactLevel: ImpactLevel;
  actionable: boolean;
}

interface PerformanceRecommendations {
  articleId: string;
  overallScore: number;
  performanceSummaryAr: string;
  recommendations: Recommendation[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  headline: <Type size={15} className="text-gold" />,
  internal_links: <LinkIcon size={15} className="text-blue-400" />,
  content_depth: <FileText size={15} className="text-purple-400" />,
  multimedia: <ImageIcon size={15} className="text-teal-400" />,
  seo: <Search size={15} className="text-profit" />,
};

const CATEGORY_LABELS: Record<Category, string> = {
  headline: 'العنوان',
  internal_links: 'الروابط الداخلية',
  content_depth: 'عمق المحتوى',
  multimedia: 'الوسائط المتعددة',
  seo: 'السيو',
};

const IMPACT_STYLES: Record<ImpactLevel, string> = {
  high: 'bg-loss/10 text-loss border border-loss/20',
  medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  low: 'bg-white/5 text-white/50 border border-white/10',
};

const IMPACT_LABELS: Record<ImpactLevel, string> = {
  high: 'تأثير عالٍ',
  medium: 'تأثير متوسط',
  low: 'تأثير منخفض',
};

// ── Score circle ───────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const color =
    clamped >= 70
      ? 'text-profit border-profit/40'
      : clamped >= 40
      ? 'text-amber-400 border-amber-400/40'
      : 'text-loss border-loss/40';

  return (
    <div
      className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center flex-shrink-0 ${color}`}
    >
      <span className="font-[family-name:var(--font-display)] font-bold text-xl leading-none">
        {clamped}
      </span>
      <span className="text-white/40 text-[10px] font-[family-name:var(--font-display)] leading-none mt-0.5">
        /100
      </span>
    </div>
  );
}

// ── Recommendation card ────────────────────────────────────────────────────

function RecommendationCard({
  rec,
  onApply,
}: {
  rec: Recommendation;
  onApply: (category: Category) => void;
}) {
  return (
    <div className="bg-white/5 border border-gold/10 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
            {CATEGORY_ICONS[rec.category]}
          </div>
          <div>
            <span className="text-white text-sm font-[family-name:var(--font-display)] font-medium leading-snug">
              {rec.titleAr}
            </span>
            <p className="text-white/30 text-xs font-[family-name:var(--font-display)] mt-0.5">
              {CATEGORY_LABELS[rec.category]}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-[family-name:var(--font-display)] flex-shrink-0 ${IMPACT_STYLES[rec.impactLevel]}`}
        >
          {IMPACT_LABELS[rec.impactLevel]}
        </span>
      </div>
      <p className="text-white/50 text-xs font-[family-name:var(--font-display)] leading-relaxed ps-9">
        {rec.descriptionAr}
      </p>
      {rec.actionable && (
        <div className="pt-1 ps-9">
          <button
            type="button"
            onClick={() => onApply(rec.category)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold text-xs font-[family-name:var(--font-display)] hover:bg-gold/20 transition-colors border border-gold/20"
          >
            تطبيق
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function AIPerformanceRecommendations({
  articleId,
  articleStatus,
}: {
  articleId: string;
  articleStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PerformanceRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);

    // Fetch lazily on first open
    if (next && !data && !isLoading && articleStatus === 'published') {
      setIsLoading(true);
      setFetchError(false);
      try {
        const res = await fetch('/api/ai/performance-recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId }),
        });
        const json = await res.json();
        setData(json.data ?? null);
      } catch {
        setFetchError(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleApply = (category: Category) => {
    // Scroll to the relevant section in the editor
    const sectionMap: Record<Category, string> = {
      headline: 'article-title',
      internal_links: 'rich-text-editor',
      content_depth: 'rich-text-editor',
      multimedia: 'image-uploader',
      seo: 'seo-panel',
    };
    const targetId = sectionMap[category];
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Group recommendations by category for display
  const grouped: Partial<Record<Category, Recommendation[]>> = {};
  if (data) {
    for (const rec of data.recommendations) {
      if (!grouped[rec.category]) grouped[rec.category] = [];
      grouped[rec.category]!.push(rec);
    }
  }

  return (
    <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
      {/* ── Header toggle ── */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-5 text-white/70 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
            <Zap size={16} />
          </div>
          <span className="font-[family-name:var(--font-display)] font-semibold">
            توصيات تحسين الأداء
          </span>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* ── Body ── */}
      {open && (
        <div className="border-t border-gold/10 p-5 space-y-5" dir="rtl">
          {articleStatus !== 'published' ? (
            <p className="text-center text-white/40 text-sm font-[family-name:var(--font-display)] py-8">
              متاح للمقالات المنشورة فقط
            </p>
          ) : isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={28} className="animate-spin text-gold" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-white/40 text-sm font-[family-name:var(--font-display)]">
                تعذّر تحميل التوصيات.
              </p>
              <button
                type="button"
                onClick={() => {
                  setData(null);
                  handleToggle();
                }}
                className="text-gold text-xs font-[family-name:var(--font-display)] underline underline-offset-2"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : !data ? null : data.recommendations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 rounded-full bg-profit/10 flex items-center justify-center">
                <Zap size={22} className="text-profit" />
              </div>
              <p className="text-profit text-sm font-[family-name:var(--font-display)] font-medium">
                أداء ممتاز! لا توجد توصيات حالياً.
              </p>
            </div>
          ) : (
            <>
              {/* ── Score + summary ── */}
              <div className="flex items-center gap-4 bg-white/5 border border-gold/10 rounded-xl p-4">
                <ScoreCircle score={data.overallScore} />
                <p className="text-white/70 text-sm font-[family-name:var(--font-display)] leading-relaxed">
                  {data.performanceSummaryAr}
                </p>
              </div>

              {/* ── Recommendations ── */}
              <div className="space-y-3">
                <h4 className="text-white/50 text-xs font-[family-name:var(--font-display)] uppercase tracking-wider">
                  التوصيات ({data.recommendations.length})
                </h4>
                {data.recommendations.map((rec, i) => (
                  <RecommendationCard key={i} rec={rec} onApply={handleApply} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
