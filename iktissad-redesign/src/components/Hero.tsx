'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ArrowUpLeft, Flame, Loader2, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

export default function Hero() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const { data: featuredData } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?status=published&featured=true&pageSize=5',
    swrFetcher
  );

  const articles = featuredData?.data ?? [];

  const next = useCallback(() => {
    if (articles.length === 0) return;
    setActive(prev => (prev + 1) % articles.length);
  }, [articles.length]);

  useEffect(() => {
    if (!isAutoPlaying || articles.length === 0) return;
    const id = setInterval(next, 6000);
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
            <Flame size={15} className="text-gold" />
            <span className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm uppercase tracking-widest">
              أبرز المقالات
            </span>
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
                        <span className="bg-gold/15 text-gold-dark px-2.5 py-0.5 text-xs font-bold font-[family-name:var(--font-display)] uppercase">
                          {main.sector}
                        </span>
                      )}
                      {main.publishedAt && (
                        <span className="text-charcoal/50 text-xs flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(main.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
                            month: 'short', day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <h2 className="!text-xl md:!text-2xl font-[family-name:var(--font-display)] !font-bold text-obsidian !leading-snug mb-2 group-hover:text-gold transition-colors">
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

            {/* All 5 articles list — active one highlighted */}
            <div className="lg:col-span-5 flex flex-col bg-paper">
              <div className="bg-obsidian px-4 py-3 flex items-center justify-end">
                <a href="/search" className="text-gold text-xs flex items-center gap-1 hover:underline font-[family-name:var(--font-display)]">
                  {t('common.actions.viewMore')}
                  <ArrowUpLeft size={11} />
                </a>
              </div>

              {articles.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="text-gold animate-spin" size={24} />
                </div>
              ) : (
                articles.map((article, i) => (
                  <button
                    key={article.id}
                    onClick={() => setActive(i)}
                    className={`flex-1 flex gap-3 p-4 text-start transition-colors group w-full ${
                      i !== articles.length - 1 ? 'border-b border-charcoal/10' : ''
                    } ${i === active ? 'bg-gold/8 border-r-2 border-r-gold' : 'hover:bg-gold/5'}`}
                  >
                    {/* Thumb */}
                    {article.featuredImage && (
                      <div className="w-20 h-16 flex-shrink-0 overflow-hidden">
                        <img
                          src={article.featuredImage}
                          alt={article.title}
                          className={`w-full h-full object-cover transition-all duration-300 ${
                            i === active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                          }`}
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {article.sector && (
                            <span className={`text-xs font-bold font-[family-name:var(--font-display)] ${i === active ? 'text-gold' : 'text-gold/70'}`}>
                              {article.sector}
                            </span>
                          )}
                          {article.views > 1000 && (
                            <span className="flex items-center gap-0.5 text-profit text-xs font-semibold">
                              <TrendingUp size={10} />
                              {t('common.labels.trending')}
                            </span>
                          )}
                        </div>
                        <h3 className={`font-[family-name:var(--font-display)] font-bold text-sm leading-snug line-clamp-2 transition-colors ${
                          i === active ? 'text-gold' : 'text-obsidian group-hover:text-gold'
                        }`}>
                          {article.title}
                        </h3>
                      </div>
                      {article.publishedAt && (
                        <span className="text-charcoal/40 text-xs flex items-center gap-1 mt-1">
                          <Clock size={10} />
                          {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
                            month: 'short', day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>

                    {/* Active indicator */}
                    {i === active && (
                      <div className="flex-shrink-0 self-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

          </div>
        )}
      </div>
    </section>
  );
}
