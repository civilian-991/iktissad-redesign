'use client';

import { use } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, ArrowUpLeft, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, Section, ApiResponse } from '@/types';

type SectionWithArticles = Section & { articles: Article[] };

export default function SectionPageClient({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = useTranslation();
  const { slug } = use(params);

  const { data, error, isLoading } = useSWR<ApiResponse<SectionWithArticles>>(
    `/api/sections/${slug}`,
    swrFetcher
  );

  const section = data?.data;
  const articles = section?.articles ?? [];
  const featuredArticle = articles[0];
  const restArticles = articles.slice(1);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-20 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <a href="/sections" className="text-gold/70 hover:text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider transition-colors">
                {t('pages.sections.title')}
              </a>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-4">
                {isLoading ? '...' : section?.name ?? slug}
              </h1>
              {section?.description && (
                <p className="text-white/70 text-lg max-w-2xl mx-auto">
                  {section.description}
                </p>
              )}
            </motion.div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-16">
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
                <p className="text-charcoal text-lg">لا توجد مقالات في هذا القسم حتى الآن.</p>
              </div>
            )}

            {/* Featured Article */}
            {featuredArticle && (
              <motion.a
                href={`/news/${featuredArticle.slug}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="block mb-12 group"
              >
                <div className="grid lg:grid-cols-2 gap-8 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  {featuredArticle.featuredImage && (
                    <div className="aspect-[16/10] lg:aspect-auto overflow-hidden">
                      <img
                        src={featuredArticle.featuredImage}
                        alt={featuredArticle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-4 text-sm text-slate mb-4">
                      {featuredArticle.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(featuredArticle.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4 group-hover:text-gold transition-colors">
                      {featuredArticle.title}
                    </h2>
                    {featuredArticle.excerpt && (
                      <p className="text-charcoal leading-relaxed mb-6">
                        {featuredArticle.excerpt}
                      </p>
                    )}
                    <span className="flex items-center gap-2 text-gold font-[family-name:var(--font-display)] font-semibold">
                      {t('components.articleCard.readMore')}
                      <ArrowUpLeft size={18} className="group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </motion.a>
            )}

            {/* Articles Grid */}
            {restArticles.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restArticles.map((article, index) => (
                  <motion.a
                    key={article.id}
                    href={`/news/${article.slug}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                      {article.featuredImage && (
                        <div className="aspect-[16/10] overflow-hidden">
                          <img
                            src={article.featuredImage}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-3 text-xs text-slate mb-3">
                          {article.publishedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                            </span>
                          )}
                        </div>
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-2 line-clamp-2 group-hover:text-gold transition-colors">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-slate text-sm line-clamp-2">
                            {article.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
