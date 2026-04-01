'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ArrowUpLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher, articlesKey } from '@/lib/api-client';
import type { ApiResponse, Article } from '@/types';

const SLIDE_SIZE = 3;

export default function VideoSection() {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    articlesKey({ section: 'videos', status: 'published', pageSize: 6 }),
    swrFetcher
  );

  const articles = data?.data ?? [];
  const totalSlides = Math.ceil(articles.length / SLIDE_SIZE);
  const visibleVideos = articles.slice(slide * SLIDE_SIZE, slide * SLIDE_SIZE + SLIDE_SIZE);

  const next = useCallback(() => setSlide(s => (s + 1) % totalSlides), [totalSlides]);
  const prev = useCallback(() => setSlide(s => (s - 1 + totalSlides) % totalSlides), [totalSlides]);

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [isPaused, totalSlides, next]);

  return (
    <section
      className="py-16 bg-gradient-to-br from-brand-darker via-brand-dark to-brand-darker relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,_var(--color-gold)_1px,_transparent_0)] bg-[length:40px_40px]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />

      <div className="container-editorial relative">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gold" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-white text-base">
              {t('components.videoSection.title')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {totalSlides > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={next}
                  className="w-7 h-7 border border-white/20 hover:border-gold text-white/60 hover:text-gold flex items-center justify-center transition-colors"
                  aria-label="السابق"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={prev}
                  className="w-7 h-7 border border-white/20 hover:border-gold text-white/60 hover:text-gold flex items-center justify-center transition-colors"
                  aria-label="التالي"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            )}
            <a
              href="/topics/videos"
              className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold flex items-center gap-1 hover:text-gold-light transition-colors"
            >
              <span>{t('components.videoSection.allVideos')}</span>
              <ArrowUpLeft size={13} />
            </a>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="aspect-video bg-white/10 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/50 gap-4">
            <Play size={48} className="opacity-30" />
            <p className="font-[family-name:var(--font-display)] text-lg">
              {t('components.videoSection.noVideos')}
            </p>
          </div>
        )}

        {/* Carousel */}
        {!isLoading && articles.length > 0 && (
          <>
            <div className="overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={slide}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {visibleVideos.map((video) => (
                    <a
                      key={video.id}
                      href={`/${video.slug}`}
                      className="group relative aspect-video overflow-hidden block"
                    >
                      {/* Image */}
                      <img
                        src={video.featuredImage}
                        alt={video.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />

                      {/* Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent group-hover:from-black/90 transition-all duration-500" />

                      {/* Category badge */}
                      {video.section && (
                        <div
                          className="absolute top-3 right-3 px-2 py-0.5 text-xs font-bold font-[family-name:var(--font-display)]"
                          style={{ background: 'var(--color-gold)', color: 'var(--color-brand-darker)' }}
                        >
                          {video.section}
                        </div>
                      )}

                      {/* Play button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-2 border-white/60 group-hover:border-gold flex items-center justify-center backdrop-blur-sm bg-black/30 group-hover:bg-gold/20 transition-all duration-300 group-hover:scale-110">
                          <Play
                            className="text-white group-hover:text-gold fill-white group-hover:fill-gold transition-colors duration-300"
                            size={18}
                            style={{ marginRight: '-2px' }}
                          />
                        </div>
                      </div>

                      {/* Title */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-white text-sm leading-relaxed line-clamp-2 group-hover:text-gold transition-colors duration-300">
                          {video.title}
                        </h3>
                      </div>
                    </a>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dot indicators */}
            {totalSlides > 1 && (
              <div className="flex items-center justify-center gap-2 mt-5">
                {Array.from({ length: totalSlides }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === slide ? 'w-6 h-1.5 bg-gold' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </section>
  );
}
