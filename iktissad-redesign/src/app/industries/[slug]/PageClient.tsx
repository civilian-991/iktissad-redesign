'use client';

import { use } from 'react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Clock, Grid3X3, List, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWRInfinite from 'swr/infinite';
import { swrFetcher } from '@/lib/api-client';
import type { Article, Sector, ApiResponse } from '@/types';

const PAGE_SIZE = 12;

type SectorPage = Sector & { articles: Article[] };

export default function SectorPageClient({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = useTranslation();
  const { slug } = use(params);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  function getKey(pageIndex: number, previousPageData: ApiResponse<SectorPage> | null) {
    if (previousPageData && !previousPageData.pagination) return null;
    if (
      previousPageData?.pagination &&
      pageIndex + 1 > previousPageData.pagination.totalPages
    ) {
      return null;
    }
    return `/api/sectors/${slug}?page=${pageIndex + 1}&pageSize=${PAGE_SIZE}`;
  }

  const { data, size, setSize, isLoading, isValidating, error } = useSWRInfinite<ApiResponse<SectorPage>>(
    getKey,
    swrFetcher
  );

  const pages = data ?? [];
  const sectorMeta = pages[0]?.data;
  const allArticles: Article[] = pages.flatMap((p) => p.data?.articles ?? []);
  const featuredArticle = allArticles[0];
  const regularArticles = allArticles.slice(1);

  const lastPage = pages[pages.length - 1];
  const hasMore =
    lastPage?.pagination
      ? lastPage.pagination.page < lastPage.pagination.totalPages
      : false;

  const isLoadingMore = isValidating && size > 1;
  const isInitialLoading = isLoading && size === 1;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-16 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />
          </div>

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <TrendingUp className="text-white" size={40} />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-2">
                  {isInitialLoading ? '...' : sectorMeta?.name ?? slug}
                </h1>
                {sectorMeta?.description && (
                  <p className="text-white/80 text-lg">{sectorMeta.description}</p>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container-luxury">
            {isInitialLoading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="text-gold animate-spin" size={40} />
              </div>
            )}

            {error && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg">تعذّر تحميل المقالات. حاول مجدداً.</p>
              </div>
            )}

            {!isInitialLoading && !error && allArticles.length === 0 && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg">لا توجد مقالات في هذا القطاع حتى الآن.</p>
              </div>
            )}

            {/* Featured Article */}
            {featuredArticle && (
              <motion.a
                href={`/${featuredArticle.slug}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="block mb-12"
              >
                <div className="relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden group">
                  {featuredArticle.featuredImage ? (
                    <img
                      src={featuredArticle.featuredImage}
                      alt={featuredArticle.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-navy-light" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12">
                    <span className="news-tag mb-4">{t('common.labels.featured')}</span>
                    <h2 className="text-2xl lg:text-4xl font-[family-name:var(--font-display)] font-bold text-white leading-tight mb-4 group-hover:text-gold transition-colors">
                      {featuredArticle.title}
                    </h2>
                    <div className="flex items-center gap-6 text-white/60 text-sm">
                      {featuredArticle.publishedAt && (
                        <span className="flex items-center gap-2">
                          <Clock size={16} />
                          {new Date(featuredArticle.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                        </span>
                      )}
                      {featuredArticle.views > 0 && (
                        <span>{featuredArticle.views.toLocaleString()} مشاهدة</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.a>
            )}

            {/* Toolbar */}
            {regularArticles.length > 0 && (
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <span className="text-slate text-sm">
                    {allArticles.length} مقال
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gold text-white' : 'text-slate hover:text-navy'}`}
                  >
                    <Grid3X3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-gold text-white' : 'text-slate hover:text-navy'}`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Articles Grid/List */}
            <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {regularArticles.map((article, index) => (
                <motion.a
                  key={article.id}
                  href={`/${article.slug}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index % PAGE_SIZE, 11) * 0.05 }}
                  className={`group ${viewMode === 'list' ? 'flex gap-6 bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-shadow' : ''}`}
                >
                  {viewMode === 'grid' ? (
                    <div className="card-luxury">
                      {article.featuredImage && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={article.featuredImage}
                            alt={article.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy leading-snug line-clamp-2 group-hover:text-gold transition-colors mb-3">
                          {article.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm text-slate">
                          {article.publishedAt && (
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                            </span>
                          )}
                          {article.views > 0 && <span>{article.views.toLocaleString()} مشاهدة</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {article.featuredImage && (
                        <div className="w-40 h-28 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={article.featuredImage}
                            alt={article.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-center">
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy leading-snug group-hover:text-gold transition-colors mb-2">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slate">
                          {article.publishedAt && (
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                            </span>
                          )}
                          {article.views > 0 && <span>{article.views.toLocaleString()} مشاهدة</span>}
                        </div>
                      </div>
                    </>
                  )}
                </motion.a>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-12">
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
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
