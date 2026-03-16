'use client';

import { use } from 'react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Clock, ChevronLeft, ChevronRight, Filter, Grid3X3, List, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, Sector, ApiResponse } from '@/types';

type SectorWithArticles = Sector & { articles: Article[] };

const PAGE_SIZE = 7; // 1 featured + 6 grid

export default function SectorPageClient({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = useTranslation();
  const { slug } = use(params);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, error, isLoading } = useSWR<ApiResponse<SectorWithArticles>>(
    `/api/sectors/${slug}`,
    swrFetcher
  );

  const sector = data?.data;
  const articles = sector?.articles ?? [];
  const featuredArticle = articles[0];
  const regularArticles = articles.slice(1);

  const totalPages = Math.ceil(regularArticles.length / (PAGE_SIZE - 1)) || 1;

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
                  {isLoading ? '...' : sector?.name ?? slug}
                </h1>
                {sector?.description && (
                  <p className="text-white/80 text-lg">{sector.description}</p>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container-luxury">
            {isLoading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="text-gold animate-spin" size={40} />
              </div>
            )}

            {error && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg">تعذّر تحميل المقالات. حاول مجدداً.</p>
              </div>
            )}

            {!isLoading && !error && articles.length === 0 && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg">لا توجد مقالات في هذا القطاع حتى الآن.</p>
              </div>
            )}

            {/* Featured Article */}
            {featuredArticle && (
              <motion.a
                href={`/news/${featuredArticle.id}`}
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
                    {articles.length} مقال
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
                  href={`/news/${article.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-navy hover:bg-gold hover:text-white transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg font-[family-name:var(--font-display)] font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-gold text-white'
                        : 'bg-white shadow-sm text-navy hover:bg-gold hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-navy hover:bg-gold hover:text-white transition-colors"
                >
                  <ChevronLeft size={20} />
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
