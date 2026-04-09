'use client';

import { motion } from 'motion/react';
import { Clock, Loader2, FolderOpen, ChevronDown, ArrowUpLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { swrFetcher } from '@/lib/api-client';
import type { ArticleSeries, ApiResponse } from '@/types';
import { useCallback } from 'react';

const PAGE_SIZE = 12;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ─── Featured dossier card ────────────────────────────────────────────────────

function FeaturedDossierCard({ series }: { series: ArticleSeries }) {
  return (
    <motion.a
      href={`/reports/${series.slug}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white border border-charcoal/10 overflow-hidden hover:shadow-[0_8px_30px_rgba(24,59,78,0.10)] hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative overflow-hidden bg-cream" style={{ minHeight: '300px' }}>
        {series.coverImage ? (
          <img
            src={series.coverImage}
            alt={series.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy/8 to-navy/20 flex items-center justify-center">
            <FolderOpen className="text-navy/20" size={56} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent lg:hidden" />
        <span className="absolute top-4 end-4 px-3 py-1 text-xs font-bold font-[family-name:var(--font-display)] bg-gold text-white">
          ملف
        </span>
      </div>

      <div className="flex flex-col justify-between p-8 lg:p-10 bg-white">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-black text-obsidian text-2xl lg:text-3xl leading-snug group-hover:text-navy transition-colors duration-200 mb-4">
            {series.title}
          </h2>
          {series.description && (
            <p className="text-charcoal/65 text-base leading-relaxed line-clamp-3 font-[family-name:var(--font-display)]">
              {series.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-charcoal/8">
          {series.articleCount !== undefined && series.articleCount > 0 && (
            <span className="text-xs font-[family-name:var(--font-display)] bg-navy/8 text-navy px-2.5 py-1">
              {series.articleCount} مقال
            </span>
          )}
          <span className="flex items-center gap-1.5 text-charcoal/50 text-sm font-[family-name:var(--font-display)]">
            <Clock size={12} />
            {formatDate(series.createdAt)}
          </span>
          <span className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold mr-auto flex items-center gap-1 group-hover:underline">
            تصفح الملف
            <ArrowUpLeft size={14} />
          </span>
        </div>
      </div>
    </motion.a>
  );
}

// ─── Grid dossier card ────────────────────────────────────────────────────────

function DossierCard({ series, index }: { series: ArticleSeries; index: number }) {
  return (
    <motion.a
      href={`/reports/${series.slug}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index % PAGE_SIZE, 11) * 0.04,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group flex flex-col bg-white border border-charcoal/10 overflow-hidden hover:shadow-[0_8px_30px_rgba(24,59,78,0.08)] hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative overflow-hidden bg-cream" style={{ paddingBottom: '58%' }}>
        {series.coverImage ? (
          <img
            src={series.coverImage}
            alt={series.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy/5 to-navy/15 flex items-center justify-center">
            <FolderOpen className="text-navy/20" size={32} />
          </div>
        )}
        <span className="absolute top-3 end-3 bg-gold text-white text-xs font-bold font-[family-name:var(--font-display)] px-2.5 py-1 leading-none">
          ملف
        </span>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-base leading-snug line-clamp-2 group-hover:text-navy transition-colors duration-200 mb-2">
          {series.title}
        </h3>
        {series.description && (
          <p className="text-charcoal/55 text-sm leading-relaxed line-clamp-2 font-[family-name:var(--font-display)] mb-auto">
            {series.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-charcoal/8">
          {series.articleCount !== undefined && series.articleCount > 0 && (
            <span className="text-xs font-[family-name:var(--font-display)] text-navy/60">
              {series.articleCount} مقال
            </span>
          )}
          <span className="flex items-center gap-1 text-charcoal/40 text-xs font-[family-name:var(--font-display)] mr-auto">
            <Clock size={10} />
            {formatDate(series.createdAt)}
          </span>
        </div>
      </div>
    </motion.a>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPageClient() {
  const getKey = useCallback(
    (pageIndex: number, previousPageData: ApiResponse<ArticleSeries[]> | null) => {
      if (previousPageData && !previousPageData.pagination) return null;
      if (
        previousPageData?.pagination &&
        pageIndex + 1 > previousPageData.pagination.totalPages
      ) return null;

      const params = new URLSearchParams({
        status: 'active',
        pageSize: String(PAGE_SIZE),
        page: String(pageIndex + 1),
      });
      return `/api/series?${params.toString()}`;
    },
    []
  );

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<ApiResponse<ArticleSeries[]>>(
    getKey,
    swrFetcher
  );

  const pages = data ?? [];
  const allSeries = pages.flatMap((p) => p.data ?? []);
  const lastPage = pages[pages.length - 1];
  const hasMore = lastPage?.pagination
    ? lastPage.pagination.page < lastPage.pagination.totalPages
    : false;
  const isLoadingMore = isValidating && size > 1;
  const isInitialLoading = isLoading && size === 1;

  const featured = allSeries[0];
  const rest = allSeries.slice(1);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F7F7F7]">

        {/* ── Page header ── */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-14 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="container-editorial relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <span className="text-gold font-[family-name:var(--font-display)] text-xs font-bold tracking-[0.2em] uppercase block mb-3">
                ملفات تحريرية
              </span>
              <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-4">
                الملفات
              </h1>
              <p className="text-white/60 text-base max-w-xl mx-auto font-[family-name:var(--font-display)]">
                ملفات تحريرية معمّقة حول الاقتصاد والأعمال والأسواق المالية
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
            ) : allSeries.length === 0 ? (
              <div className="text-center py-24">
                <FolderOpen className="mx-auto text-charcoal/20 mb-4" size={48} />
                <p className="text-charcoal/60 text-lg font-[family-name:var(--font-display)]">
                  لا توجد ملفات متاحة حالياً.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {featured && <FeaturedDossierCard series={featured} />}

                {rest.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {rest.map((s, i) => (
                      <DossierCard key={s.id} series={s} index={i} />
                    ))}
                  </div>
                )}

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
                          جارٍ التحميل...
                        </>
                      ) : (
                        'تحميل المزيد'
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
