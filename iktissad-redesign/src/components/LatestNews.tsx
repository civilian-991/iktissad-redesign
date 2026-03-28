'use client';

import { motion } from 'motion/react';
import { Clock, ArrowUpLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWRInfinite from 'swr/infinite';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

const PAGE_SIZE = 12;

function getKey(pageIndex: number, previousPageData: ApiResponse<Article[]> | null) {
  // Stop fetching when there are no more pages
  if (previousPageData && !previousPageData.pagination) return null;
  if (
    previousPageData?.pagination &&
    pageIndex + 1 > previousPageData.pagination.totalPages
  ) {
    return null;
  }
  return `/api/articles?status=published&featured=false&pageSize=${PAGE_SIZE}&page=${pageIndex + 1}`;
}

export default function LatestNews() {
  const { t } = useTranslation();

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<ApiResponse<Article[]>>(
    getKey,
    swrFetcher
  );

  const pages = data ?? [];
  const articles = pages.flatMap((p) => p.data ?? []);

  const lastPage = pages[pages.length - 1];
  const hasMore =
    lastPage?.pagination
      ? lastPage.pagination.page < lastPage.pagination.totalPages
      : false;

  const isLoadingMore = isValidating && size > 1;
  const isInitialLoading = isLoading && size === 1;

  return (
    <section className="bg-cream py-10 border-t border-charcoal/10">
      <div className="container-editorial">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gold" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-lg uppercase tracking-widest">
              احدث المقالات
            </h2>
          </div>
          <a
            href="/articles"
            className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold flex items-center gap-1 hover:underline"
          >
            {t('common.actions.viewMore')}
            <ArrowUpLeft size={13} />
          </a>
        </div>

        {isInitialLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="text-gold animate-spin" size={28} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-charcoal/10 border border-charcoal/10">
              {articles.map((article, i) => (
                <motion.a
                  key={article.id}
                  href={`/${article.slug}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 11) * 0.04 }}
                  className="bg-cream hover:bg-paper group flex gap-4 p-4 transition-colors"
                >
                  {/* Thumb */}
                  {article.featuredImage && (
                    <div className="w-24 h-18 flex-shrink-0 overflow-hidden" style={{ height: '4.5rem' }}>
                      <img
                        src={article.featuredImage}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {article.sector && (
                        <span className="text-gold text-sm font-bold font-[family-name:var(--font-display)] block mb-1">
                          {article.sector}
                        </span>
                      )}
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm leading-snug line-clamp-2 group-hover:text-gold transition-colors">
                        {article.title}
                      </h3>
                    </div>
                    {article.publishedAt && (
                      <span className="text-charcoal/40 text-sm flex items-center gap-1 mt-2">
                        <Clock size={10} />
                        {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setSize(size + 1)}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-8 py-3 bg-navy text-white font-[family-name:var(--font-display)] font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('common.actions.loadingMore')}
                    </>
                  ) : (
                    t('common.actions.loadMore')
                  )}
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </section>
  );
}
