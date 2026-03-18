'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, TrendingUp, Users, DollarSign, ChevronLeft, ChevronRight, Grid3X3, List, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, Country, ApiResponse } from '@/types';

type CountryWithArticles = Country & { articles: Article[] };

export default function CountryPageClient() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, error, isLoading } = useSWR<ApiResponse<CountryWithArticles>>(
    slug ? `/api/countries/${slug}` : null,
    swrFetcher
  );

  const country = data?.data;
  const articles = country?.articles ?? [];
  const featuredArticle = articles[0];
  const regularArticles = articles.slice(1);
  const ki = country?.keyIndicators ?? {};

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-24 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-10" />
          <div className="absolute bottom-0 left-0 right-0 pb-12">
            <div className="container-luxury">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-4">
                    <Loader2 className="text-gold animate-spin" size={36} />
                    <span className="text-white/50 text-2xl">جارٍ التحميل...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 mb-4">
                    {country?.flag && (
                      <span className="text-6xl">{country.flag}</span>
                    )}
                    <div>
                      <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white">
                        {country?.name ?? slug}
                      </h1>
                      {country?.economicOverview && (
                        <p className="text-white/70 text-lg mt-2 max-w-2xl">
                          {country.economicOverview}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        {country && (
          <section className="bg-navy py-6">
            <div className="container-luxury">
              <div className="grid grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-gold mb-1">
                    <TrendingUp size={18} />
                    <span className="font-[family-name:var(--font-display)] text-sm">{t('pages.countries.indicatorGDP')}</span>
                  </div>
                  <span className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
                    {ki.gdp ?? '—'}
                  </span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-gold mb-1">
                    <DollarSign size={18} />
                    <span className="font-[family-name:var(--font-display)] text-sm">نمو الناتج</span>
                  </div>
                  <span className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
                    {ki.gdpGrowth ?? '—'}
                  </span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-gold mb-1">
                    <Users size={18} />
                    <span className="font-[family-name:var(--font-display)] text-sm">{t('pages.countries.population')}</span>
                  </div>
                  <span className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
                    {ki.population ?? '—'}
                  </span>
                </motion.div>
              </div>
            </div>
          </section>
        )}

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
                <p className="text-charcoal text-lg">تعذّر تحميل البيانات. حاول مجدداً.</p>
              </div>
            )}

            {!isLoading && !error && articles.length === 0 && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg">لا توجد مقالات لهذا البلد حتى الآن.</p>
              </div>
            )}

            {/* Featured Article */}
            {featuredArticle && (
              <motion.a
                href={`/news/${featuredArticle.slug}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="block mb-12"
              >
                <div className="relative h-[400px] rounded-2xl overflow-hidden group">
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
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    {featuredArticle.sector && (
                      <span className="news-tag mb-4">{featuredArticle.sector}</span>
                    )}
                    <h2 className="text-2xl lg:text-3xl font-[family-name:var(--font-display)] font-bold text-white leading-tight mb-4 group-hover:text-gold transition-colors">
                      {featuredArticle.title}
                    </h2>
                    {featuredArticle.publishedAt && (
                      <span className="text-white/60 text-sm flex items-center gap-2">
                        <Clock size={16} />
                        {new Date(featuredArticle.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                      </span>
                    )}
                  </div>
                </div>
              </motion.a>
            )}

            {/* Toolbar */}
            {regularArticles.length > 0 && (
              <div className="flex items-center justify-between mb-8">
                <span className="text-slate text-sm">{articles.length} مقال</span>
                <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gold text-white' : 'text-slate'}`}
                  >
                    <Grid3X3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-gold text-white' : 'text-slate'}`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Articles Grid */}
            <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {regularArticles.map((article, index) => (
                <motion.a
                  key={article.id}
                  href={`/news/${article.slug}`}
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
                          {article.sector && (
                            <span className="absolute top-3 right-3 px-3 py-1 bg-gold text-white text-xs font-[family-name:var(--font-display)] font-semibold rounded">
                              {article.sector}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy leading-snug line-clamp-2 group-hover:text-gold transition-colors mb-3">
                          {article.title}
                        </h3>
                        {article.publishedAt && (
                          <span className="text-slate text-sm flex items-center gap-1">
                            <Clock size={14} />
                            {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {article.featuredImage && (
                        <div className="w-40 h-28 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={article.featuredImage}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        {article.sector && (
                          <span className="text-gold text-xs font-[family-name:var(--font-display)] font-semibold">
                            {article.sector}
                          </span>
                        )}
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy group-hover:text-gold transition-colors mb-2">
                          {article.title}
                        </h3>
                        {article.publishedAt && (
                          <span className="text-slate text-sm flex items-center gap-1">
                            <Clock size={14} />
                            {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </motion.a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
