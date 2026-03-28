'use client';

/**
 * SeriesNav — Reading navigation widget for individual article pages.
 *
 * Shows "هذا المقال جزء من ملف: [Series Title]" with previous/next
 * navigation and a link to view all parts of the dossier.
 *
 * Usage:
 *   <SeriesNav articleId="<uuid>" />
 *
 * The component fetches series membership for the article from
 * /api/series/by-article?articleId=... (falls back gracefully if the
 * article is not in any series).
 */

import Link from 'next/link';
import useSWR from 'swr';
import { FolderOpen, ChevronRight, ChevronLeft, BookOpen, Loader2 } from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeriesNavArticle {
  id: string;
  title: string;
  slug: string;
  orderIndex: number;
}

interface SeriesNavData {
  seriesTitle: string;
  seriesSlug: string;
  currentIndex: number;   // 0-based
  totalCount: number;
  prev: SeriesNavArticle | null;
  next: SeriesNavArticle | null;
  articles: SeriesNavArticle[];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SeriesNavProps {
  articleId: string;
  /** Optional className for the outer wrapper */
  className?: string;
}

export default function SeriesNav({ articleId, className = '' }: SeriesNavProps) {
  const { data, isLoading } = useSWR<ApiResponse<SeriesNavData>>(
    articleId ? `/api/series/by-article?articleId=${articleId}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // Not in any series — render nothing
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-white/30 text-sm ${className}`} dir="rtl">
        <Loader2 size={14} className="animate-spin" />
        <span className="font-[family-name:var(--font-display)]">جارٍ التحقق...</span>
      </div>
    );
  }

  const nav = data?.data;
  if (!nav) return null;

  const partNumber = nav.currentIndex + 1;

  return (
    <aside
      className={`bg-midnight/60 backdrop-blur-sm border border-gold/20 rounded-2xl overflow-hidden ${className}`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gold/10 bg-gold/5">
        <FolderOpen size={18} className="text-gold flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white/50 text-xs font-[family-name:var(--font-display)] mb-0.5">
            هذا المقال جزء من ملف
          </p>
          <Link
            href={`/files/${nav.seriesSlug}`}
            className="text-white font-[family-name:var(--font-display)] font-bold text-sm hover:text-gold transition-colors line-clamp-1"
          >
            {nav.seriesTitle}
          </Link>
        </div>
        <span className="flex-shrink-0 text-xs text-white/40 font-[family-name:var(--font-display)] bg-white/5 px-2.5 py-1 rounded-full">
          {partNumber} / {nav.totalCount}
        </span>
      </div>

      {/* Prev / Next navigation */}
      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gold/10">
        {/* Previous */}
        <div className="p-4">
          {nav.prev ? (
            <Link
              href={`/${nav.prev.slug}`}
              className="group flex flex-col gap-1"
            >
              <span className="flex items-center gap-1 text-xs text-white/40 font-[family-name:var(--font-display)]">
                <ChevronRight size={12} />
                السابق — الجزء {nav.prev.orderIndex + 1}
              </span>
              <span className="text-white/80 group-hover:text-gold text-sm font-[family-name:var(--font-display)] font-semibold transition-colors line-clamp-2">
                {nav.prev.title}
              </span>
            </Link>
          ) : (
            <p className="text-white/20 text-xs font-[family-name:var(--font-display)] pt-1">
              هذا هو الجزء الأول
            </p>
          )}
        </div>

        {/* Next */}
        <div className="p-4">
          {nav.next ? (
            <Link
              href={`/${nav.next.slug}`}
              className="group flex flex-col gap-1 items-end text-right"
            >
              <span className="flex items-center gap-1 text-xs text-white/40 font-[family-name:var(--font-display)]">
                التالي — الجزء {nav.next.orderIndex + 1}
                <ChevronLeft size={12} />
              </span>
              <span className="text-white/80 group-hover:text-gold text-sm font-[family-name:var(--font-display)] font-semibold transition-colors line-clamp-2">
                {nav.next.title}
              </span>
            </Link>
          ) : (
            <p className="text-white/20 text-xs font-[family-name:var(--font-display)] text-left pt-1">
              هذا هو الجزء الأخير
            </p>
          )}
        </div>
      </div>

      {/* View all link */}
      <div className="px-5 py-3 border-t border-gold/10 bg-white/2">
        <Link
          href={`/files/${nav.seriesSlug}`}
          className="flex items-center justify-center gap-2 text-gold/80 hover:text-gold text-sm font-[family-name:var(--font-display)] font-semibold transition-colors"
        >
          <BookOpen size={14} />
          عرض جميع أجزاء الملف ({nav.totalCount})
        </Link>
      </div>
    </aside>
  );
}
