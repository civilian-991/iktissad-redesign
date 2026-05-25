'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Search, Clock, X, Loader2, SlidersHorizontal } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

const PAGE_SIZE = 20;
const sortOptions = ['الأحدث', 'الأكثر قراءة'];

type DateRange = 'week' | 'month' | 'year' | 'all';

interface Section {
  id: string;
  slug: string;
  name: string;
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  week: 'هذا الأسبوع',
  month: 'هذا الشهر',
  year: 'هذه السنة',
  all: 'كل الأوقات',
};

const FALLBACK_SUGGESTIONS = ['اقتصاد', 'أسواق', 'استثمار'];

export default function SearchPageClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sortBy, setSortBy] = useState('الأحدث');
  const [sectionSlug, setSectionSlug] = useState(searchParams.get('sectionSlug') ?? '');
  const [dateRange, setDateRange] = useState<DateRange>(
    (searchParams.get('dateRange') as DateRange) ?? 'all'
  );
  const [showFilters, setShowFilters] = useState(false);

  // Debounce: only fire search 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Sync URL params (shallow — no full page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (sectionSlug) params.set('sectionSlug', sectionSlug);
    if (dateRange !== 'all') params.set('dateRange', dateRange);
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
  }, [debouncedQuery, sectionSlug, dateRange, router]);

  // Fetch sections for the filter dropdown
  const { data: sectionsData } = useSWR<ApiResponse<Section[]>>(
    '/api/sections?pageSize=50',
    swrFetcher
  );
  const sections: Section[] = sectionsData?.data ?? [];

  function buildSearchUrl(pageIndex: number) {
    const params = new URLSearchParams({
      q: debouncedQuery.trim(),
      pageSize: String(PAGE_SIZE),
      page: String(pageIndex + 1),
    });
    if (sectionSlug) params.set('sectionSlug', sectionSlug);
    if (dateRange !== 'all') params.set('dateRange', dateRange);
    return `/api/search?${params.toString()}`;
  }

  function getKey(pageIndex: number, previousPageData: ApiResponse<Article[]> | null) {
    if (!debouncedQuery.trim()) return null;
    if (previousPageData && !previousPageData.pagination) return null;
    if (
      previousPageData?.pagination &&
      pageIndex + 1 > previousPageData.pagination.totalPages
    ) {
      return null;
    }
    return buildSearchUrl(pageIndex);
  }

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<ApiResponse<Article[]>>(
    getKey,
    swrFetcher
  );

  const pages = data ?? [];
  let allResults: Article[] = pages.flatMap((p) => p.data ?? []);

  // Client-side sort
  if (sortBy === 'الأكثر قراءة') {
    allResults = [...allResults].sort((a, b) => b.views - a.views);
  }

  const lastPage = pages[pages.length - 1];
  const hasMore =
    lastPage?.pagination
      ? lastPage.pagination.page < lastPage.pagination.totalPages
      : false;

  const totalCount = lastPage?.pagination?.total ?? allResults.length;
  const isLoadingMore = isValidating && size > 1;
  const isSearching = isLoading && size === 1 && !!debouncedQuery.trim();

  const hasActiveFilters = sectionSlug !== '' || dateRange !== 'all';

  const clearQuery = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setSectionSlug('');
    setDateRange('all');
    router.replace('/search', { scroll: false });
  }, [router]);

  const clearFilters = useCallback(() => {
    setSectionSlug('');
    setDateRange('all');
  }, []);

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
                  className="w-full px-6 py-5 ps-14 text-lg bg-white rounded-xl font-[family-name:var(--font-display)] text-navy placeholder:text-slate focus:outline-none focus:ring-4 focus:ring-gold/30 shadow-xl"
                  autoFocus
                />
                <Search className="absolute start-5 top-1/2 -translate-y-1/2 text-gold" size={24} />
                {query && (
                  <button
                    onClick={clearQuery}
                    className="absolute end-5 top-1/2 -translate-y-1/2 text-slate hover:text-navy"
                    aria-label="مسح البحث"
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

            {/* ── Results Header + Filters ── */}
            {debouncedQuery && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {isSearching ? (
                      <span className="text-slate flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        جارٍ البحث...
                      </span>
                    ) : (
                      <span className="text-slate">
                        {totalCount} نتيجة
                        <span className="text-navy font-semibold"> لـ &quot;{debouncedQuery}&quot;</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Sort options */}
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

                    {/* Filter toggle */}
                    <button
                      onClick={() => setShowFilters((v) => !v)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        showFilters || hasActiveFilters
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-slate border-slate/20 hover:border-navy/40'
                      }`}
                    >
                      <SlidersHorizontal size={14} />
                      {t('pages.search.filters.title')}
                      {hasActiveFilters && (
                        <span className="bg-gold text-navy text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                          {(sectionSlug ? 1 : 0) + (dateRange !== 'all' ? 1 : 0)}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Filter Bar */}
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-slate/10 flex flex-wrap gap-4 items-end"
                  >
                    {/* Section filter */}
                    <div className="flex flex-col gap-1 min-w-[180px]">
                      <label className="text-xs text-slate font-[family-name:var(--font-display)]">
                        {t('pages.search.filters.section')}
                      </label>
                      <select
                        value={sectionSlug}
                        onChange={(e) => setSectionSlug(e.target.value)}
                        className="px-3 py-2 bg-cream border border-slate/20 rounded-lg text-sm text-navy font-[family-name:var(--font-display)] focus:outline-none focus:ring-2 focus:ring-navy/20"
                      >
                        <option value="">{t('pages.search.filters.sectionAll')}</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.slug}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date range filter */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate font-[family-name:var(--font-display)]">
                        {t('pages.search.filters.date')}
                      </label>
                      <div className="flex gap-2">
                        {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((key) => (
                          <button
                            key={key}
                            onClick={() => setDateRange(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-[family-name:var(--font-display)] transition-all border ${
                              dateRange === key
                                ? 'bg-navy text-white border-navy'
                                : 'bg-cream text-slate border-slate/20 hover:border-navy/40'
                            }`}
                          >
                            {DATE_RANGE_LABELS[key]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-xs text-slate hover:text-navy transition-colors mt-auto"
                      >
                        <X size={12} />
                        مسح الفلاتر
                      </button>
                    )}
                  </motion.div>
                )}
              </>
            )}

            {/* Empty state — no query */}
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

            {/* No results */}
            {debouncedQuery && !isSearching && allResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <Search className="mx-auto text-slate mb-4" size={48} />
                <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-navy mb-2">
                  {t('pages.search.no_results')} &ldquo;{debouncedQuery}&rdquo;
                </h3>
                <p className="text-slate mb-6">
                  {t('pages.search.noResultsSuggestion')}
                </p>
                {/* Suggestions */}
                <div className="flex flex-col items-center gap-3">
                  <span className="text-sm text-slate font-[family-name:var(--font-display)]">
                    {t('pages.search.try_instead')}:
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {FALLBACK_SUGGESTIONS.map((term) => (
                      <button
                        key={term}
                        onClick={() => { setQuery(term); setDebouncedQuery(term); }}
                        className="px-4 py-2 bg-white border border-navy/10 text-navy font-[family-name:var(--font-display)] text-sm rounded-full hover:bg-navy hover:text-white hover:border-navy transition-all shadow-sm"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Results Grid */}
            {allResults.length > 0 && (
              <div className="space-y-6">
                {allResults.map((result, index) => (
                  <motion.a
                    key={result.id}
                    href={`/${result.slug}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index % PAGE_SIZE, 19) * 0.04 }}
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
                            {new Date(result.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn')}
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

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-10">
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
