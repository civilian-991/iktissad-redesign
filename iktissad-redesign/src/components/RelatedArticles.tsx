'use client';

import React, { Suspense } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { Clock, BookOpen, Sparkles } from 'lucide-react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import { useTranslation, useFormatters } from '@/lib/i18n';
import type { Article, ApiResponse } from '@/types';

interface RelatedArticlesProps {
  articleId: string;
  sectionSlug?: string;
  limit?: number;
}

function RelatedArticlesContent({ articleId, sectionSlug, limit = 5 }: RelatedArticlesProps) {
  const { t } = useTranslation();
  const { fmtDate } = useFormatters();

  // Try AI-based recommendations first
  const { data: similarData, error: similarError } = useSWR<ApiResponse<Article[]>>(
    `/api/search/similar?articleId=${articleId}&limit=${limit}`,
    swrFetcher
  );

  const hasSimilar = !similarError && (similarData?.data?.length ?? 0) > 0;

  // Fallback to same-section articles
  const { data: sectionData } = useSWR<ApiResponse<Article[]>>(
    !hasSimilar && sectionSlug
      ? `/api/articles?section=${sectionSlug}&status=published&pageSize=${limit + 1}`
      : null,
    swrFetcher
  );

  const articles: Article[] = hasSimilar
    ? (similarData!.data as unknown as Article[]).filter((a) => a.id !== articleId).slice(0, limit)
    : (sectionData?.data ?? []).filter((a) => a.id !== articleId).slice(0, limit);

  const isAiPowered = hasSimilar;

  if (articles.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-sand/60">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-[3px] h-6 bg-gold flex-shrink-0" />
        <h2 className="text-[15px] font-[family-name:var(--font-display)] font-black text-ink tracking-wide">
          {t('engagement.related.title')}
        </h2>
        {isAiPowered && (
          <span className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-display)] text-gold/60">
            <Sparkles size={10} />
            {t('engagement.related.ai_powered')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/${article.slug || article.id}`}
            className="group block"
          >
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-obsidian/[0.04] mb-3">
              {article.featuredImage ? (
                <NextImage
                  src={article.featuredImage}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen size={24} className="text-charcoal/15" />
                </div>
              )}
            </div>

            {/* Section badge */}
            {(article.sector || article.section) && (
              <span className="text-[9px] font-[family-name:var(--font-display)] font-black text-gold uppercase tracking-widest block mb-1.5">
                {article.sector || article.section}
              </span>
            )}

            <h3 className="text-[13px] font-[family-name:var(--font-display)] font-bold text-ink leading-snug line-clamp-3 group-hover:text-gold transition-colors mb-2">
              {article.title}
            </h3>

            {article.publishedAt && (
              <span className="flex items-center gap-1 text-[10px] text-charcoal/30">
                <Clock size={9} />
                {fmtDate(article.publishedAt, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function RelatedArticles(props: RelatedArticlesProps) {
  return (
    <Suspense fallback={
      <div className="mt-12 pt-8 border-t border-sand/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full aspect-[16/10] bg-sand/40 mb-3" />
              <div className="h-2 w-12 bg-sand/40 mb-2" />
              <div className="h-3 w-full bg-sand/40 mb-1" />
              <div className="h-3 w-2/3 bg-sand/40" />
            </div>
          ))}
        </div>
      </div>
    }>
      <RelatedArticlesContent {...props} />
    </Suspense>
  );
}
