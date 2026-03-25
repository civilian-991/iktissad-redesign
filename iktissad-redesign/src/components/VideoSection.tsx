'use client';

import { motion } from 'motion/react';
import { Play, Eye, ArrowUpLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher, articlesKey } from '@/lib/api-client';
import type { ApiResponse, Article } from '@/types';

export default function VideoSection() {
  const { t } = useTranslation();

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    articlesKey({ section: 'videos', status: 'published', pageSize: 6 }),
    swrFetcher
  );

  const articles = data?.data ?? [];
  const featuredVideos = articles.slice(0, 2);
  const regularVideos = articles.slice(2);

  return (
    <section className="py-24 bg-gradient-to-br from-brand-darker via-brand-dark to-brand-darker relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,_var(--color-gold)_1px,_transparent_0)] bg-[length:40px_40px]" />

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />

      <div className="container-editorial relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        >
          <div>
            <span className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold tracking-wider uppercase">
              {t('components.videoSection.watchNow')}
            </span>
            <h2 className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold text-white mt-3 mb-4">
              {t('components.videoSection.title')}
            </h2>
            <div className="h-1 w-24 bg-gradient-to-l from-gold to-copper" />
          </div>

          <a
            href="/videos"
            className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors font-[family-name:var(--font-display)] font-semibold"
          >
            <span>{t('components.videoSection.allVideos')}</span>
            <ArrowUpLeft size={18} />
          </a>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 grid md:grid-cols-2 gap-6">
              {[0, 1].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video bg-white/10" />
                  <div className="mt-4 space-y-2">
                    <div className="h-5 bg-white/10 rounded w-3/4" />
                    <div className="h-4 bg-white/10 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-4 bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="p-4 border-b border-white/10">
                <div className="h-5 bg-white/10 rounded w-1/2 animate-pulse" />
              </div>
              <div className="divide-y divide-white/10">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 p-4 animate-pulse">
                    <div className="w-32 flex-shrink-0 aspect-video bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/10 rounded w-1/3" />
                      <div className="h-4 bg-white/10 rounded w-full" />
                      <div className="h-3 bg-white/10 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-white/50 gap-4">
            <Play size={48} className="opacity-30" />
            <p className="font-[family-name:var(--font-display)] text-lg">
              {t('components.videoSection.noVideos')}
            </p>
          </div>
        )}

        {/* Videos Grid */}
        {!isLoading && articles.length > 0 && (
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Featured Videos - Large */}
            <div className="lg:col-span-8 grid md:grid-cols-2 gap-6">
              {featuredVideos.map((video, index) => (
                <motion.a
                  key={video.id}
                  href={`/${video.slug}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group block"
                >
                  <div className="relative aspect-video overflow-hidden bg-brand">
                    <img
                      src={video.featuredImage}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="w-16 h-16 bg-gold flex items-center justify-center"
                      >
                        <Play className="text-brand-darker fill-brand-darker" size={28} />
                      </motion.div>
                    </div>

                    {/* Category Badge */}
                    {video.section && (
                      <div className="absolute top-3 right-3 bg-gold text-brand-darker text-xs px-2 py-1 font-[family-name:var(--font-display)] font-bold">
                        {video.section}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-white text-lg leading-relaxed group-hover:text-gold transition-colors line-clamp-2">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-white/70 text-sm">
                      <span className="flex items-center gap-1">
                        <Eye size={14} />
                        {video.views.toLocaleString()} {t('components.videoSection.viewsLabel')}
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Regular Videos - Sidebar List */}
            <div className="lg:col-span-4 bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="p-4 border-b border-white/10">
                <h3 className="font-[family-name:var(--font-display)] font-bold text-white">
                  {t('components.videoSection.moreVideos')}
                </h3>
              </div>

              <div className="divide-y divide-white/10">
                {regularVideos.map((video, index) => (
                  <motion.a
                    key={video.id}
                    href={`/${video.slug}`}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex gap-4 p-4 hover:bg-white/10 transition-all duration-300 group"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-32 flex-shrink-0 aspect-video overflow-hidden bg-brand-light">
                      <img
                        src={video.featuredImage}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-8 h-8 bg-gold/90 flex items-center justify-center">
                          <Play className="text-brand-darker fill-brand-darker" size={14} />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {video.section && (
                        <span className="text-gold text-xs font-[family-name:var(--font-display)] font-semibold">
                          {video.section}
                        </span>
                      )}
                      <h4 className="font-[family-name:var(--font-display)] font-semibold text-white text-sm leading-relaxed mt-1 group-hover:text-gold transition-colors line-clamp-2">
                        {video.title}
                      </h4>
                      <span className="text-white/60 text-xs mt-1 flex items-center gap-1">
                        <Eye size={12} />
                        {video.views.toLocaleString()}
                      </span>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
