'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Search, Clock, X, SlidersHorizontal, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

const sortOptions = ['الأحدث', 'الأكثر قراءة'];

export default function SearchPageClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sortBy, setSortBy] = useState('الأحدث');

  // Debounce: only fire search 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Sync URL param
  useEffect(() => {
    if (debouncedQuery) {
      router.replace(`/search?q=${encodeURIComponent(debouncedQuery)}`, { scroll: false });
    }
  }, [debouncedQuery, router]);

  const apiUrl = debouncedQuery.trim()
    ? `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}&pageSize=20`
    : null;

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(apiUrl, swrFetcher);

  let results = data?.data ?? [];

  // Client-side sort
  if (sortBy === 'الأكثر قراءة') {
    results = [...results].sort((a, b) => b.views - a.views);
  }

  const clearQuery = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    router.replace('/search', { scroll: false });
  }, [router]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Search Hero */}
        <section className="bg-gradient-to-br from-navy via-navy-light to-navy py-16">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <h1 className="text-3xl font-[family-name:var(--font-display)] font-bold text-white text-center mb-8">
                {t('pages.search.title')}
              </h1>

              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('pages.search.placeholder')}
                  className="w-full px-6 py-5 pr-14 text-lg bg-white rounded-xl font-[family-name:var(--font-display)] text-navy placeholder:text-slate focus:outline-none focus:ring-4 focus:ring-gold/30 shadow-xl"
                  autoFocus
                />
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gold" size={24} />
                {query && (
                  <button
                    onClick={clearQuery}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate hover:text-navy"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Results */}
        <section className="py-12">
          <div className="container-luxury">
            {/* Results Header */}
            {debouncedQuery && (
              <div className="flex items-center justify-between mb-8">
                <div>
                  {isLoading ? (
                    <span className="text-slate flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      جارٍ البحث...
                    </span>
                  ) : (
                    <span className="text-slate">
                      {results.length} نتيجة
                      <span className="text-navy font-semibold"> لـ &quot;{debouncedQuery}&quot;</span>
                    </span>
                  )}
                </div>

                <div className="hidden md:flex items-center gap-2">
                  <span className="text-slate text-sm">ترتيب:</span>
                  {sortOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSortBy(option)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        sortBy === option
                          ? 'bg-navy text-white'
                          : 'bg-white text-slate hover:bg-navy/10'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results Grid */}
            {!debouncedQuery && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <Search className="mx-auto text-slate mb-4" size={48} />
                <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-navy mb-2">
                  ابدأ بكتابة كلمة للبحث
                </h3>
              </motion.div>
            )}

            {debouncedQuery && !isLoading && results.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <Search className="mx-auto text-slate mb-4" size={48} />
                <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-navy mb-2">
                  {t('pages.search.noResults', { query: debouncedQuery })}
                </h3>
                <p className="text-slate">
                  {t('pages.search.noResultsSuggestion')}
                </p>
              </motion.div>
            )}

            {results.length > 0 && (
              <div className="space-y-6">
                {results.map((result, index) => (
                  <motion.a
                    key={result.id}
                    href={`/news/${result.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex gap-6 bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-all group"
                  >
                    {result.featuredImage && (
                      <div className="w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={result.featuredImage}
                          alt={result.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-2">
                        {result.sector && (
                          <span className="px-3 py-1 bg-gold/20 text-gold text-xs font-[family-name:var(--font-display)] font-semibold rounded">
                            {result.sector}
                          </span>
                        )}
                        {result.publishedAt && (
                          <span className="text-slate text-xs flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(result.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                          </span>
                        )}
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg leading-snug group-hover:text-gold transition-colors mb-2">
                        {result.title}
                      </h3>
                      {result.excerpt && (
                        <p className="text-slate text-sm line-clamp-2">
                          {result.excerpt}
                        </p>
                      )}
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
