'use client';

import { motion } from 'motion/react';
import { Clock, ArrowUpLeft, Flame, Loader2, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

export default function Hero() {
  const { t } = useTranslation();

  const { data: featuredData } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?status=published&pageSize=4',
    swrFetcher
  );

  const articles = featuredData?.data ?? [];
  const [main, ...rest] = articles;

  return (
    <section className="bg-paper py-8">
      <div className="container-editorial">

        {/* Section label */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gold" />
            <span className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm uppercase tracking-widest">
              {t('common.labels.latestNews')}
            </span>
          </div>
        </div>

        {!main ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="text-gold animate-spin" size={32} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-px bg-charcoal/10 border border-charcoal/10">

            {/* Main featured article */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-7 bg-paper group"
            >
              <a href={`/news/${main.id}`} className="block">
                {/* Image */}
                {main.featuredImage && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={main.featuredImage}
                      alt={main.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                )}
                <div className="p-5 lg:p-6">
                  {/* Meta */}
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
                  {/* Title */}
                  <h2 className="!text-xl md:!text-2xl font-[family-name:var(--font-display)] !font-bold text-obsidian !leading-snug mb-2 group-hover:text-gold transition-colors">
                    {main.title}
                  </h2>
                  {/* Excerpt */}
                  {main.excerpt && (
                    <p className="text-charcoal/70 text-sm leading-relaxed line-clamp-2">
                      {main.excerpt}
                    </p>
                  )}
                </div>
              </a>
            </motion.div>

            {/* Secondary articles */}
            <div className="lg:col-span-5 flex flex-col bg-paper">
              {/* Sidebar header */}
              <div className="bg-obsidian px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={14} className="text-gold" />
                  <span className="font-[family-name:var(--font-display)] font-bold text-white text-sm">
                    {t('common.labels.featuredNews')}
                  </span>
                </div>
                <a href="/search" className="text-gold text-xs flex items-center gap-1 hover:underline font-[family-name:var(--font-display)]">
                  {t('common.actions.viewMore')}
                  <ArrowUpLeft size={11} />
                </a>
              </div>

              {rest.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="text-gold animate-spin" size={24} />
                </div>
              ) : (
                rest.map((article, i) => (
                  <motion.a
                    key={article.id}
                    href={`/news/${article.id}`}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className={`flex-1 flex gap-3 p-4 hover:bg-gold/5 transition-colors group ${
                      i !== rest.length - 1 ? 'border-b border-charcoal/10' : ''
                    }`}
                  >
                    {/* Thumb */}
                    {article.featuredImage && (
                      <div className="w-20 h-16 flex-shrink-0 overflow-hidden">
                        <img
                          src={article.featuredImage}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {article.sector && (
                            <span className="text-gold text-xs font-bold font-[family-name:var(--font-display)]">
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
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm leading-snug line-clamp-2 group-hover:text-gold transition-colors">
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
                  </motion.a>
                ))
              )}
            </div>

          </div>
        )}
      </div>
    </section>
  );
}
