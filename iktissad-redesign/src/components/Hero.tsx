'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Clock, TrendingUp, ArrowUpLeft, Flame, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

export default function Hero() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Latest articles for slider (with featured image)
  const { data: featuredData } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?status=published&pageSize=5',
    swrFetcher
  );

  // Most-viewed articles for sidebar
  const { data: sideData } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?status=published&pageSize=4&sort=views',
    swrFetcher
  );

  const featuredNews = (featuredData?.data ?? []).filter(a => a.featuredImage);
  const sideNews = sideData?.data ?? [];

  const nextSlide = useCallback(() => {
    if (featuredNews.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % featuredNews.length);
  }, [featuredNews.length]);

  const prevSlide = useCallback(() => {
    if (featuredNews.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + featuredNews.length) % featuredNews.length);
  }, [featuredNews.length]);

  useEffect(() => {
    if (!isAutoPlaying || featuredNews.length === 0) return;
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide, featuredNews.length]);

  // Reset slide index when data loads
  useEffect(() => {
    setCurrentSlide(0);
  }, [featuredNews.length]);

  const current = featuredNews[currentSlide];

  return (
    <section className="bg-paper py-8">
      <div className="container-editorial">
        <div className="grid lg:grid-cols-12 gap-6">

          {/* Main Featured Slider */}
          <div
            className="lg:col-span-8 relative group"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            <div className="relative aspect-[16/10] lg:aspect-[16/9] overflow-hidden bg-charcoal">
              {!current ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="text-gold animate-spin" size={40} />
                </div>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7 }}
                      className="absolute inset-0"
                    >
                      <img
                        src={current.featuredImage!}
                        alt={current.title}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  </AnimatePresence>

                  <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-brand-darker/75 via-brand-darker/40 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8 bg-white/5 backdrop-blur-md border-t border-white/10">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          {current.sector && (
                            <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 text-xs font-semibold font-[family-name:var(--font-display)]">
                              {current.sector}
                            </span>
                          )}
                        </div>

                        <a href={`/news/${current.id}`}>
                          <h2 className="!text-xl md:!text-2xl font-[family-name:var(--font-display)] !font-bold text-white !leading-tight mb-3 hover:text-gold transition-colors">
                            {current.title}
                          </h2>
                        </a>

                        <div className="flex items-center gap-4 text-white/80 text-sm">
                          {current.publishedAt && (
                            <span className="flex items-center gap-2">
                              <Clock size={14} />
                              {new Date(current.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Navigation Controls */}
                  {featuredNews.length > 1 && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 flex justify-between pointer-events-none">
                      <motion.button
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={prevSlide}
                        className="w-12 h-12 bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-gold hover:text-obsidian transition-all pointer-events-auto"
                      >
                        <ChevronRight size={24} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={nextSlide}
                        className="w-12 h-12 bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-gold hover:text-obsidian transition-all pointer-events-auto"
                      >
                        <ChevronLeft size={24} />
                      </motion.button>
                    </div>
                  )}

                  {/* Slide Indicators */}
                  {featuredNews.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                      {featuredNews.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentSlide(index)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            index === currentSlide ? 'w-8 bg-gold' : 'w-3 bg-white/40 hover:bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Gold corner accent */}
              <div className="absolute top-0 right-0 w-20 h-20">
                <div className="absolute top-0 right-0 w-full h-1 bg-gold" />
                <div className="absolute top-0 right-0 w-1 h-full bg-gold" />
              </div>
            </div>
          </div>

          {/* Side Panel - Most Read */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-obsidian text-white px-4 py-3 mb-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={15} className="text-gold" />
                  <h2 className="font-[family-name:var(--font-display)] font-bold text-sm">
                    {t('common.labels.mostRead')}
                  </h2>
                </div>
                <a href="/search" className="text-gold text-xs font-[family-name:var(--font-display)] hover:underline flex items-center gap-1">
                  {t('common.actions.viewMore')}
                  <ArrowUpLeft size={12} />
                </a>
              </div>
            </div>

            <div className="bg-cream border border-charcoal/10 flex-1 flex flex-col">
              {sideNews.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="text-gold animate-spin" size={24} />
                </div>
              ) : (
                sideNews.map((news, index) => (
                  <motion.a
                    key={news.id}
                    href={`/news/${news.id}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className={`flex-1 flex items-center px-4 py-3 hover:bg-gold/10 transition-colors group ${
                      index !== sideNews.length - 1 ? 'border-b border-charcoal/10' : ''
                    }`}
                  >
                    <div className="flex gap-3 w-full">
                      <span className="font-[family-name:var(--font-accent)] text-2xl font-bold text-gold/60 group-hover:text-gold transition-colors leading-none">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {news.sector && (
                            <span className="text-gold text-xs font-[family-name:var(--font-display)] font-bold">
                              {news.sector}
                            </span>
                          )}
                          {news.views > 1000 && (
                            <span className="flex items-center gap-1 text-profit text-xs font-semibold">
                              <TrendingUp size={12} />
                              {t('common.labels.trending')}
                            </span>
                          )}
                        </div>
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-charcoal text-sm leading-snug group-hover:text-gold transition-colors line-clamp-2">
                          {news.title}
                        </h3>
                      </div>
                    </div>
                  </motion.a>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
