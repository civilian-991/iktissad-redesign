'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Clock, Loader2, FolderOpen, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { ArticleSeries, ApiResponse } from '@/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ─── Article row inside the dossier ──────────────────────────────────────────

function DossierArticleCard({
  article,
  index,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  article: any;
  index: number;
}) {
  return (
    <motion.a
      href={`/${article.slug}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="group flex gap-4 bg-white border border-charcoal/10 hover:border-navy/25 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative w-32 flex-shrink-0 overflow-hidden" style={{ minHeight: '100px' }}>
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy/10 to-navy/25 flex items-center justify-center">
            <FolderOpen className="text-ink/30" size={20} />
          </div>
        )}
        <span className="absolute top-2 start-2 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold font-[family-name:var(--font-display)] flex items-center justify-center">
          {index + 1}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col justify-center py-4 pe-5 gap-1.5 flex-1 min-w-0">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-ink text-base leading-snug line-clamp-2 group-hover:text-ink transition-colors duration-200">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-charcoal/55 text-sm leading-relaxed line-clamp-1 font-[family-name:var(--font-display)]">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {article.publishedAt && (
            <span className="text-charcoal/40 text-xs flex items-center gap-1 font-[family-name:var(--font-display)]">
              <Clock size={10} />
              {formatDate(article.publishedAt)}
            </span>
          )}
          <span className="text-gold text-xs font-[family-name:var(--font-display)] font-semibold ms-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            اقرأ المقال
            <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </motion.a>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DossierPageClient({ slug }: { slug: string }) {
  const { data, isLoading } = useSWR<ApiResponse<ArticleSeries>>(
    `/api/series/${slug}`,
    swrFetcher
  );

  const series = data?.data;
  const articles = (series?.articles ?? []) as any[];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F7F7F7]">

        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy overflow-hidden">
          {series?.coverImage && (
            <img
              src={series.coverImage}
              alt={series.title}
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
          )}
          <div className="absolute inset-0 star-pattern opacity-10" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-editorial relative py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link
                href="/reports"
                className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-[family-name:var(--font-display)] mb-6 transition-colors"
              >
                <ArrowRight size={14} />
                الملفات
              </Link>
              <span className="text-gold font-[family-name:var(--font-display)] text-xs font-bold tracking-[0.2em] uppercase block mb-3">
                ملف تحريري
              </span>
              {isLoading ? (
                <div className="h-12 w-64 bg-white/10 animate-pulse rounded" />
              ) : (
                <h1 className="text-3xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-4 leading-snug">
                  {series?.title}
                </h1>
              )}
              {series?.description && (
                <p className="text-white/60 text-base max-w-2xl font-[family-name:var(--font-display)] leading-relaxed">
                  {series.description}
                </p>
              )}
              {series && (
                <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/10">
                  {articles.length > 0 && (
                    <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                      {articles.length} مقال
                    </span>
                  )}
                  <span className="text-white/30 text-sm font-[family-name:var(--font-display)] flex items-center gap-1.5">
                    <Clock size={12} />
                    {formatDate(series.createdAt)}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* ── Articles ── */}
        <section className="py-12">
          <div className="container-editorial max-w-3xl">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="text-ink animate-spin" size={36} />
              </div>
            ) : !series ? (
              <div className="text-center py-24">
                <FolderOpen className="mx-auto text-charcoal/20 mb-4" size={48} />
                <p className="text-charcoal/60 text-lg font-[family-name:var(--font-display)]">
                  لم يتم العثور على هذا الملف.
                </p>
                <Link
                  href="/reports"
                  className="mt-3 inline-block text-ink text-sm font-[family-name:var(--font-display)] hover:underline"
                >
                  العودة إلى الملفات
                </Link>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-24">
                <FolderOpen className="mx-auto text-charcoal/20 mb-4" size={48} />
                <p className="text-charcoal/60 text-lg font-[family-name:var(--font-display)]">
                  لا توجد مقالات في هذا الملف حتى الآن.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((article, i) => (
                  <DossierArticleCard key={article.id} article={article} index={i} />
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
