'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Clock, ArrowUpLeft, Loader2, Newspaper } from 'lucide-react';
import { useTranslation, useFormatters } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

export default function LatestNews() {
  const { t } = useTranslation();
  const { fmtDate } = useFormatters();

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?status=published&featured=false&pageSize=6',
    swrFetcher
  );
  const articles = data?.data ?? [];

  return (
    <section className="bg-paper py-8 border-t border-charcoal/10">
      <div className="container-editorial">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gold" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-base">
              آخر الأخبار
            </h2>
          </div>
          <Link
            href="/articles"
            className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold flex items-center gap-1 hover:underline"
          >
            {t('common.actions.viewMore')}
            <ArrowUpLeft size={13} />
          </Link>
        </div>

        {/* Articles */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="text-gold animate-spin" size={28} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article, i) => (
              <motion.a
                key={article.id}
                href={`/${article.slug}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="group relative bg-paper border border-sand hover:border-gold/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md flex flex-col overflow-hidden"
              >
                {/* Image with sector badge overlay */}
                <div className="relative aspect-[16/9] overflow-hidden flex-shrink-0 bg-cream">
                  {article.featuredImage ? (
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="text-sand" size={28} />
                    </div>
                  )}
                  {/* Sector badge on image */}
                  {article.sector && (
                    <span
                      className="absolute bottom-0 start-0 px-2.5 py-1 text-xs font-bold font-[family-name:var(--font-display)] uppercase tracking-wide"
                      style={{
                        background: 'var(--color-gold)',
                        color: 'var(--color-brand-darker)',
                      }}
                    >
                      {article.sector}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col justify-between flex-1 p-4 gap-3">
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm leading-relaxed line-clamp-2 group-hover:text-gold transition-colors duration-300">
                    {article.title}
                  </h3>
                  {article.publishedAt && (
                    <span className="text-charcoal/40 text-xs flex items-center gap-1 font-[family-name:var(--font-display)]">
                      <Clock size={10} />
                      {fmtDate(article.publishedAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                {/* Bottom gold line reveal */}
                <div
                  className="absolute bottom-0 inset-x-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-[inline-start]"
                  style={{ background: 'var(--color-gold)' }}
                />
              </motion.a>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
