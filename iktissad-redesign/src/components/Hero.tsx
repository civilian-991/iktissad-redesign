'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ArrowUpLeft, Loader2, TrendingUp } from 'lucide-react';
import { useTranslation, useFormatters } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import { HOMEPAGE_FEATURED_SLOTS } from '@/lib/homepage-featured-slots';
import type { Article, ApiResponse } from '@/types';

const ROTATE_MS = 6000;

export default function Hero() {
  const { t } = useTranslation();
  const { fmtDate } = useFormatters();
  const [active, setActive] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const { data: featuredData } = useSWR<ApiResponse<Article[]>>(
    `/api/articles?status=published&featured=true&pageSize=${HOMEPAGE_FEATURED_SLOTS}&sortBy=homepage`,
    swrFetcher
  );

  const articles = featuredData?.data ?? [];

  const next = useCallback(() => {
    if (articles.length === 0) return;
    setActive(prev => (prev + 1) % articles.length);
  }, [articles.length]);

  useEffect(() => {
    if (!isAutoPlaying || articles.length === 0) return;
    const id = setInterval(next, ROTATE_MS);
    return () => clearInterval(id);
  }, [isAutoPlaying, next, articles.length]);

  useEffect(() => { setActive(0); }, [articles.length]);

  const main = articles[active];

  return (
    <section
      className="bg-paper py-8"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="container-editorial">

        {/* Section label */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gold" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-ink text-base">
              {t('components.hero.sectionTitle')}
            </h2>
          </div>
          {/* Progress dots */}
          {articles.length > 1 && (
            <div className="flex items-center gap-1.5">
              {articles.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === active ? 'w-5 h-1.5 bg-gold' : 'w-1.5 h-1.5 bg-charcoal/20 hover:bg-gold/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {!main ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="text-gold animate-spin" size={32} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-px bg-charcoal/10 border border-charcoal/10">

            {/* Main featured article */}
            <div className="lg:col-span-7 bg-paper">
              <AnimatePresence mode="wait">
                <motion.a
                  key={main.id}
                  href={`/${main.slug}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="block group"
                >
                  {/* Image */}
                  {main.featuredImage && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <motion.img
                        key={main.id + '-img'}
                        initial={{ scale: 1.04 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.6 }}
                        src={main.featuredImage}
                        alt={main.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <div className="p-5 lg:p-6">
                    <div className="flex items-center gap-3 mb-3">
                      {main.sector && (
                        <span className="bg-gold/15 text-gold-dark px-2.5 py-0.5 text-sm font-bold font-[family-name:var(--font-display)] uppercase">
                          {main.sector}
                        </span>
                      )}
                      {main.publishedAt && (
                        <span className="text-charcoal/50 text-sm flex items-center gap-1">
                          <Clock size={11} />
                          {fmtDate(main.publishedAt, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <h2 className="!text-xl md:!text-2xl font-[family-name:var(--font-display)] !font-bold text-ink !leading-snug mb-2 group-hover:text-gold transition-colors">
                      {main.title}
                    </h2>
                    {main.excerpt && (
                      <p className="text-charcoal/70 text-sm leading-relaxed line-clamp-2">
                        {main.excerpt}
                      </p>
                    )}
                  </div>
                </motion.a>
              </AnimatePresence>
            </div>

            {/* Every featured article — the one in the main panel is highlighted */}
            <div className="lg:col-span-5 flex flex-col bg-paper">
              <div className="bg-obsidian px-4 py-3 flex items-center justify-end">
                <Link href="/articles?featured=true" className="text-gold text-sm flex items-center gap-1 hover:underline font-[family-name:var(--font-display)]">
                  {t('common.actions.viewMore')}
                  <ArrowUpLeft size={11} />
                </Link>
              </div>

              {articles.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="text-gold animate-spin" size={24} />
                </div>
              ) : (
                articles.map((article, i) => {
                  const isActive = i === active;
                  return (
                    <button
                      key={article.id}
                      onClick={() => setActive(i)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`relative flex-1 flex items-center gap-3 px-4 py-3 text-start transition-colors group w-full border-s-2 ${
                        i !== articles.length - 1 ? 'border-b border-b-charcoal/10' : ''
                      } ${isActive ? 'bg-gold/10 border-s-gold' : 'border-s-transparent hover:bg-gold/5'}`}
                    >
                      {/* Thumb */}
                      {article.featuredImage && (
                        <div className="w-20 h-14 flex-shrink-0 overflow-hidden">
                          <img
                            src={article.featuredImage}
                            alt=""
                            className={`w-full h-full object-cover transition-opacity duration-300 ${
                              isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                            }`}
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 text-xs">
                          {article.sector && (
                            <span className={`font-bold font-[family-name:var(--font-display)] ${isActive ? 'text-gold-dark' : 'text-gold'}`}>
                              {article.sector}
                            </span>
                          )}
                          {article.publishedAt && (
                            <span className="text-charcoal/40 flex items-center gap-1">
                              <Clock size={10} />
                              {fmtDate(article.publishedAt, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {article.views > 1000 && (
                            <span className="flex items-center gap-0.5 text-profit font-semibold">
                              <TrendingUp size={10} />
                              {t('common.labels.trending')}
                            </span>
                          )}
                        </div>
                        <h3 className={`font-[family-name:var(--font-display)] font-bold text-sm leading-snug line-clamp-2 transition-colors ${
                          isActive ? 'text-ink' : 'text-ink/80 group-hover:text-gold'
                        }`}>
                          {article.title}
                        </h3>
                      </div>

                      {/* Time until the carousel moves on */}
                      {isActive && isAutoPlaying && articles.length > 1 && (
                        <motion.span
                          key={`progress-${active}`}
                          aria-hidden
                          className="absolute bottom-0 start-0 h-0.5 bg-gold"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: ROTATE_MS / 1000, ease: 'linear' }}
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>

          </div>
        )}
      </div>
    </section>
  );
}
