'use client';

import { motion } from 'motion/react';
import { Clock, Loader2, ArrowUpLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWRInfinite from 'swr/infinite';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';
import { useSearchParams } from 'next/navigation';

const PAGE_SIZE = 21;

function makeGetKey(featuredOnly: boolean) {
  return function getKey(pageIndex: number, previousPageData: ApiResponse<Article[]> | null) {
    if (previousPageData && !previousPageData.pagination) return null;
    if (
      previousPageData?.pagination &&
      pageIndex + 1 > previousPageData.pagination.totalPages
    ) {
      return null;
    }
    const featured = featuredOnly ? '&featured=true' : '';
    return `/api/articles?status=published${featured}&pageSize=${PAGE_SIZE}&page=${pageIndex + 1}`;
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* ─── Featured (first) card ─── */
function FeaturedCard({ article }: { article: Article }) {
  return (
    <motion.a
      href={`/${article.slug}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white border border-charcoal/10 overflow-hidden hover:shadow-[0_8px_30px_rgba(24,59,78,0.10)] transition-shadow duration-300"
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ minHeight: '320px' }}>
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ position: 'absolute', inset: 0 }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy/10 to-navy/30" />
        )}
        {/* Overlay gradient for text legibility on mobile */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:hidden" />
      </div>

      {/* Content */}
      <div className="flex flex-col justify-between p-8 lg:p-10 bg-white">
        <div>
          {article.sector && (
            <span className="inline-block text-xs font-bold font-[family-name:var(--font-display)] text-gold tracking-widest uppercase mb-4 border-b border-gold pb-1">
              {article.sector}
            </span>
          )}
          <h2 className="font-[family-name:var(--font-display)] font-black text-obsidian text-2xl lg:text-3xl leading-snug group-hover:text-navy transition-colors duration-200 mb-4">
            {article.title}
          </h2>
          {article.excerpt && (
            <p className="text-charcoal/70 text-base leading-relaxed line-clamp-3 font-[family-name:var(--font-display)]">
              {article.excerpt}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-charcoal/10">
          {article.publishedAt && (
            <span className="flex items-center gap-1.5 text-charcoal/50 text-sm font-[family-name:var(--font-display)]">
              <Clock size={12} />
              {formatDate(article.publishedAt)}
            </span>
          )}
          <span className="flex items-center gap-1 text-gold text-sm font-[family-name:var(--font-display)] font-semibold mr-auto group-hover:gap-2 transition-all duration-200">
            اقرأ المزيد
            <ArrowUpLeft size={14} />
          </span>
        </div>
      </div>
    </motion.a>
  );
}

/* ─── Regular article card ─── */
function ArticleCard({ article, index }: { article: Article; index: number }) {
  return (
    <motion.a
      href={`/${article.slug}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index % PAGE_SIZE, 11) * 0.05,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group flex flex-col bg-white border border-charcoal/10 overflow-hidden hover:shadow-[0_8px_30px_rgba(24,59,78,0.10)] hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ paddingBottom: '60%' }}>
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy/5 to-navy/15 flex items-center justify-center">
            <span className="text-navy/20 font-[family-name:var(--font-display)] font-black text-4xl select-none">
              اقتصاد
            </span>
          </div>
        )}
        {/* Category badge over image */}
        {article.sector && (
          <span className="absolute top-3 end-3 bg-gold text-white text-xs font-bold font-[family-name:var(--font-display)] px-2.5 py-1 leading-none">
            {article.sector}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-base leading-snug line-clamp-2 group-hover:text-navy transition-colors duration-200 mb-2">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-charcoal/60 text-sm leading-relaxed line-clamp-2 font-[family-name:var(--font-display)] mb-auto">
            {article.excerpt}
          </p>
        )}
        {article.publishedAt && (
          <div className="flex items-center gap-1.5 text-charcoal/40 text-xs font-[family-name:var(--font-display)] mt-4 pt-4 border-t border-charcoal/8">
            <Clock size={10} />
            {formatDate(article.publishedAt)}
          </div>
        )}
      </div>
    </motion.a>
  );
}

export default function LatestArticlesPageClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const featuredOnly = searchParams.get('featured') === 'true';

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<ApiResponse<Article[]>>(
    makeGetKey(featuredOnly),
    swrFetcher
  );

  const pages = data ?? [];
  const articles = pages.flatMap((p) => p.data ?? []);

  const lastPage = pages[pages.length - 1];
  const hasMore = lastPage?.pagination
    ? lastPage.pagination.page < lastPage.pagination.totalPages
    : false;

  const isLoadingMore = isValidating && size > 1;
  const isInitialLoading = isLoading && size === 1;

  const featuredArticle = articles[0];
  const restArticles = articles.slice(1);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F7F7F7]">

        {/* ── Page header ── */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-14 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <span className="text-gold font-[family-name:var(--font-display)] text-xs font-bold tracking-[0.2em] uppercase block mb-3">
                {featuredOnly ? 'مواضيع رئيسية' : 'آخر الأخبار'}
              </span>
              <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-4">
                {featuredOnly ? 'المواضيع الرئيسية' : 'أحدث المقالات'}
              </h1>
              <p className="text-white/60 text-base max-w-xl mx-auto font-[family-name:var(--font-display)]">
                {featuredOnly
                  ? 'أبرز المقالات والتحليلات الاقتصادية المختارة'
                  : 'تصفح أحدث المقالات والتحليلات الاقتصادية مرتّبةً بحسب تاريخ النشر'}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Content ── */}
        <section className="py-12">
          <div className="container-editorial">

            {isInitialLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="text-gold animate-spin" size={36} />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-charcoal/60 text-lg font-[family-name:var(--font-display)]">
                  لا توجد مقالات حتى الآن.
                </p>
              </div>
            ) : (
              <div className="space-y-8">

                {/* Featured article */}
                {featuredArticle && <FeaturedCard article={featuredArticle} />}

                {/* Articles grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {restArticles.map((article, i) => (
                    <ArticleCard key={article.id} article={article} index={i} />
                  ))}
                </div>

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => setSize(size + 1)}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2 px-10 py-3.5 bg-navy text-white font-[family-name:var(--font-display)] font-semibold text-sm tracking-wide hover:bg-navy/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          {t('common.actions.loadingMore')}
                        </>
                      ) : (
                        t('common.actions.loadMore')
                      )}
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
