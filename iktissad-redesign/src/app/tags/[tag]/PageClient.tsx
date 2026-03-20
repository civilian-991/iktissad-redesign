'use client';

import { use, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Loader2, Tag, ArrowUpLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

const PAGE_SIZE = 12;

export default function TagPageClient({ params }: { params: Promise<{ tag: string }> }) {
  const { t } = useTranslation();
  const { tag } = use(params);
  const decoded = decodeURIComponent(tag);

  const [page, setPage] = useState(1);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const url = `/api/articles?tag=${encodeURIComponent(decoded)}&pageSize=${PAGE_SIZE}&page=1`;

  const { data, error, isLoading } = useSWR<ApiResponse<Article[]>>(
    url,
    swrFetcher,
    {
      onSuccess(res) {
        setAllArticles(res.data ?? []);
        const total = res.pagination?.total ?? 0;
        setHasMore(total > PAGE_SIZE);
        setPage(1);
      },
    }
  );

  // Load-more state
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/articles?tag=${encodeURIComponent(decoded)}&pageSize=${PAGE_SIZE}&page=${nextPage}`
      );
      const json: ApiResponse<Article[]> = await res.json();
      const newArticles = json.data ?? [];
      setAllArticles((prev) => [...prev, ...newArticles]);
      setPage(nextPage);
      const total = json.pagination?.total ?? 0;
      setHasMore(nextPage * PAGE_SIZE < total);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }

  const articles = allArticles.length > 0 ? allArticles : (data?.data ?? []);
  const totalCount = data?.pagination?.total ?? 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-16 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 text-gold/80 font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider mb-3">
                <Tag size={14} />
                {t('tags.heading')}
              </div>
              <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-3">
                {decoded}
              </h1>
              {!isLoading && totalCount > 0 && (
                <p className="text-white/60 font-[family-name:var(--font-display)] text-sm">
                  {(t('tags.articleCount') as string).replace('{count}', String(totalCount))}
                </p>
              )}
            </motion.div>
          </div>
        </section>

        {/* Articles */}
        <section className="py-16">
          <div className="container-luxury">
            {isLoading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="text-gold animate-spin" size={40} />
              </div>
            )}

            {error && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg">{t('common.errors.general')}</p>
              </div>
            )}

            {!isLoading && !error && articles.length === 0 && (
              <div className="text-center py-24">
                <Tag size={48} className="text-sand mx-auto mb-4" />
                <p className="text-charcoal text-lg font-[family-name:var(--font-display)]">
                  {t('tags.empty')}
                </p>
              </div>
            )}

            {articles.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article, index) => (
                  <motion.a
                    key={article.id}
                    href={`/${article.slug}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 11) * 0.04 }}
                    className="group"
                  >
                    <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                      {article.featuredImage && (
                        <div className="aspect-[16/10] overflow-hidden shrink-0">
                          <img
                            src={article.featuredImage}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-center gap-3 text-xs text-slate mb-3">
                          {article.publishedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                            </span>
                          )}
                        </div>
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-2 line-clamp-2 group-hover:text-gold transition-colors flex-1">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-slate text-sm line-clamp-2 mb-3">
                            {article.excerpt}
                          </p>
                        )}
                        <span className="flex items-center gap-1.5 text-gold text-sm font-[family-name:var(--font-display)] font-semibold mt-auto">
                          {t('components.articleCard.readMore')}
                          <ArrowUpLeft size={14} className="group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && articles.length > 0 && (
              <div className="flex justify-center mt-12">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-gold flex items-center gap-2 disabled:opacity-60"
                >
                  {loadingMore ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  {t('tags.loadMore')}
                </motion.button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
