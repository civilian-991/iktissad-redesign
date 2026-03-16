'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Clock, ArrowUpLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

export default function Hero() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const { data: featuredData } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?status=published&pageSize=5',
    swrFetcher
  );

  const featuredNews = (featuredData?.data ?? []).filter(a => a.featuredImage);

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

  useEffect(() => {
    setCurrentSlide(0);
  }, [featuredNews.length]);

  const current = featuredNews[currentSlide];

  return (
    <section
      className="relative w-full overflow-hidden bg-obsidian"
      style={{ minHeight: '72vh' }}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background image layer */}
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img
              src={current.featuredImage!}
              alt={current.title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="text-gold animate-spin" size={48} />
          </div>
        )}
      </AnimatePresence>

      {/* Gradient overlays */}
      {current && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian/40 via-transparent to-transparent" />
        </>
      )}

      {/* Gold top bar */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gold z-10" />

      {/* Main content */}
      {current && (
        <div className="relative z-10 h-full flex flex-col justify-end" style={{ minHeight: '72vh' }}>
          <div className="container-editorial pb-0">
            <div className="grid lg:grid-cols-12 gap-0 items-end">

              {/* Article info — left/main column */}
              <div className="lg:col-span-8 pb-10 lg:pb-14">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.55, delay: 0.15 }}
                  >
                    {/* Category + trending badge */}
                    <div className="flex items-center gap-3 mb-5">
                      {current.sector && (
                        <span className="bg-gold text-obsidian px-3 py-1 text-xs font-bold font-[family-name:var(--font-display)] uppercase tracking-wider">
                          {current.sector}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-white/60 text-xs">
                        <Clock size={12} />
                        {current.publishedAt &&
                          new Date(current.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                      </span>
                    </div>

                    {/* Title */}
                    <a href={`/news/${current.id}`}>
                      <h1 className="!text-2xl md:!text-4xl lg:!text-5xl font-[family-name:var(--font-display)] !font-bold text-white !leading-tight mb-4 hover:text-gold transition-colors duration-200 max-w-3xl">
                        {current.title}
                      </h1>
                    </a>

                    {/* Excerpt */}
                    {current.excerpt && (
                      <p className="text-white/70 text-sm md:text-base leading-relaxed max-w-2xl mb-6 line-clamp-2">
                        {current.excerpt}
                      </p>
                    )}

                    {/* Read more */}
                    <a
                      href={`/news/${current.id}`}
                      className="inline-flex items-center gap-2 bg-gold text-obsidian text-sm font-bold font-[family-name:var(--font-display)] px-5 py-2.5 hover:bg-amber-400 transition-colors"
                    >
                      {t('common.actions.readMore')}
                      <ArrowUpLeft size={14} />
                    </a>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slide counter — right column */}
              {featuredNews.length > 1 && (
                <div className="hidden lg:flex lg:col-span-4 pb-14 justify-end items-end">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-baseline gap-1 font-[family-name:var(--font-accent)]"
                    >
                      <span className="text-gold text-5xl font-bold leading-none">
                        {String(currentSlide + 1).padStart(2, '0')}
                      </span>
                      <span className="text-white/30 text-2xl font-bold">/</span>
                      <span className="text-white/30 text-2xl font-bold">
                        {String(featuredNews.length).padStart(2, '0')}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail strip + nav */}
          {featuredNews.length > 1 && (
            <div className="relative z-10 border-t border-white/10 bg-obsidian/80 backdrop-blur-md">
              <div className="container-editorial">
                <div className="flex items-stretch">

                  {/* Thumbnails */}
                  <div className="flex-1 flex overflow-hidden">
                    {featuredNews.map((article, index) => (
                      <button
                        key={article.id}
                        onClick={() => setCurrentSlide(index)}
                        className={`group flex-1 flex items-center gap-3 px-4 py-3 text-start transition-all duration-300 border-r border-white/10 last:border-r-0 ${
                          index === currentSlide
                            ? 'bg-gold/15 border-t-2 border-t-gold'
                            : 'border-t-2 border-t-transparent hover:bg-white/5'
                        }`}
                      >
                        {/* Thumb image */}
                        <div className="w-12 h-9 flex-shrink-0 overflow-hidden hidden md:block">
                          {article.featuredImage && (
                            <img
                              src={article.featuredImage}
                              alt={article.title}
                              className={`w-full h-full object-cover transition-opacity duration-300 ${
                                index === currentSlide ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'
                              }`}
                            />
                          )}
                        </div>
                        {/* Title */}
                        <p
                          className={`text-xs font-[family-name:var(--font-display)] font-semibold leading-snug line-clamp-2 transition-colors duration-200 ${
                            index === currentSlide ? 'text-gold' : 'text-white/50 group-hover:text-white/80'
                          }`}
                        >
                          {article.title}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Arrow controls */}
                  <div className="flex items-center border-r border-white/10 flex-shrink-0">
                    <button
                      onClick={prevSlide}
                      className="w-11 h-full flex items-center justify-center text-white/50 hover:text-gold hover:bg-white/5 transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="w-11 h-full flex items-center justify-center text-white/50 hover:text-gold hover:bg-white/5 transition-all border-r border-white/10"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
