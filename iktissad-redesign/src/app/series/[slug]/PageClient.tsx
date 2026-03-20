'use client';

import { use, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Loader2,
  BookOpen,
  Lock,
  Calendar,
  ArrowUpLeft,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { ArticleSeries, SeriesArticle, ApiResponse } from '@/types';
import type { TranslationFunction } from '@/lib/i18n';

export default function SeriesPageClient({ params }: { params: Promise<{ slug: string }> }) {
  const { t, locale } = useTranslation();
  const { slug } = use(params);

  // Auth state — check if user is logged in
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  // Series metadata
  const { data: seriesRes, error: seriesError, isLoading: seriesLoading } =
    useSWR<ApiResponse<ArticleSeries>>(`/api/series/${slug}`, swrFetcher);

  // Series episodes
  const { data: episodesRes, error: episodesError, isLoading: episodesLoading } =
    useSWR<ApiResponse<SeriesArticle[]>>(`/api/series/${slug}/articles`, swrFetcher);

  const series = seriesRes?.data;
  const episodes = episodesRes?.data ?? [];
  const isLoading = seriesLoading || episodesLoading;
  const hasError = seriesError || episodesError;

  const dateLocale = locale === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-20 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row items-center gap-10"
            >
              {/* Cover image */}
              {series?.coverImage && (
                <div className="w-48 h-64 lg:w-56 lg:h-72 rounded-xl overflow-hidden shadow-dramatic shrink-0 border border-gold/20">
                  <img
                    src={series.coverImage}
                    alt={series.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Meta */}
              <div className="text-center lg:text-start flex-1">
                <div className="inline-flex items-center gap-2 text-gold/80 font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider mb-3">
                  <Layers size={14} />
                  {t('series.episodes')}
                </div>

                <h1 className="text-3xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-4">
                  {isLoading ? (
                    <span className="opacity-30">...</span>
                  ) : (
                    series?.title ?? slug
                  )}
                </h1>

                {series?.description && (
                  <p className="text-white/70 text-base lg:text-lg max-w-2xl leading-relaxed mb-6">
                    {series.description}
                  </p>
                )}

                {series?.articleCount !== undefined && (
                  <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm text-white/80 font-[family-name:var(--font-display)]">
                    <BookOpen size={14} />
                    {series.articleCount} {t('series.episodes')}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Episodes list */}
        <section className="py-16">
          <div className="container-luxury">
            {isLoading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="text-gold animate-spin" size={40} />
              </div>
            )}

            {hasError && !isLoading && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg font-[family-name:var(--font-display)]">
                  {t('series.errorLoad')}
                </p>
              </div>
            )}

            {!isLoading && !hasError && episodes.length === 0 && (
              <div className="text-center py-24">
                <BookOpen size={48} className="text-sand mx-auto mb-4" />
                <p className="text-charcoal text-lg font-[family-name:var(--font-display)]">
                  {t('series.noEpisodes')}
                </p>
              </div>
            )}

            {episodes.length > 0 && (
              <div className="max-w-3xl mx-auto">
                {/* Section heading */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-gold" />
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy">
                    {t('series.episodes')}
                  </h2>
                </div>

                <div className="space-y-4">
                  {episodes.map((ep, index) => {
                    const article = ep.article;
                    // Treat article as paywalled if it has no slug (placeholder / access gated)
                    const isLocked = !article?.slug;

                    return (
                      <motion.div
                        key={ep.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index, 14) * 0.04 }}
                      >
                        {isLocked ? (
                          /* Locked episode — no link */
                          <div className="flex items-start gap-4 p-5 bg-white/60 rounded-xl border border-sand/60 opacity-70 cursor-not-allowed">
                            <PartBadge index={index} t={t} />
                            <div className="flex-1 min-w-0">
                              <p className="font-[family-name:var(--font-display)] font-bold text-navy text-base line-clamp-2">
                                {article?.title ?? `${t('series.part')} ${index + 1}`}
                              </p>
                            </div>
                            <Lock size={16} className="text-slate shrink-0 mt-0.5" aria-label={t('series.locked')} />
                          </div>
                        ) : (
                          /* Accessible episode */
                          <Link
                            href={`/${article!.slug}`}
                            className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-sand/60 hover:border-gold/40 hover:shadow-lg transition-all duration-300"
                          >
                            <PartBadge index={index} t={t} />
                            <div className="flex-1 min-w-0">
                              <p className="font-[family-name:var(--font-display)] font-bold text-navy text-base line-clamp-2 group-hover:text-gold transition-colors">
                                {article!.title}
                              </p>
                              {article!.publishedAt && (
                                <span className="flex items-center gap-1 text-slate text-xs mt-1.5">
                                  <Calendar size={11} />
                                  {new Date(article!.publishedAt).toLocaleDateString(dateLocale)}
                                </span>
                              )}
                              {article!.excerpt && (
                                <p className="text-slate text-sm mt-2 line-clamp-2">
                                  {article!.excerpt}
                                </p>
                              )}
                            </div>
                            <ArrowUpLeft
                              size={16}
                              className="text-gold shrink-0 mt-0.5 group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform"
                            />
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subscribe CTA — show when user is not logged in */}
            {!isLoading && isLoggedIn === false && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto mt-16 text-center"
              >
                <div className="bg-gradient-to-br from-navy to-navy-light rounded-2xl p-10 border border-gold/20">
                  <BookOpen size={40} className="text-gold mx-auto mb-4" />
                  <h3 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-3">
                    {t('series.subscribe_cta')}
                  </h3>
                  <p className="text-white/70 mb-6 font-[family-name:var(--font-display)]">
                    {t('common.brand.description')}
                  </p>
                  <Link
                    href="/subscribe"
                    className="btn-gold inline-flex items-center gap-2"
                  >
                    {t('common.actions.subscribe')}
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/** Small part-number badge */
function PartBadge({ index, t }: { index: number; t: TranslationFunction }) {
  return (
    <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex flex-col items-center justify-center shrink-0 text-gold">
      <span className="text-[9px] font-[family-name:var(--font-display)] font-semibold leading-none opacity-70">
        {t('series.part')}
      </span>
      <span className="text-sm font-[family-name:var(--font-display)] font-black leading-none">
        {index + 1}
      </span>
    </div>
  );
}
