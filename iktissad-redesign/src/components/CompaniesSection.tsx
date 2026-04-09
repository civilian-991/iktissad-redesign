'use client';

import { motion } from 'motion/react';
import { Building2, Clock, ArrowUpLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

export default function CompaniesSection() {
  const { t } = useTranslation();

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?section=companies&status=published&pageSize=6',
    swrFetcher
  );
  const articles = data?.data ?? [];

  if (!isLoading && articles.length === 0) return null;

  return (
    <section className="bg-cream py-8 border-t border-sand">
      <div className="container-editorial">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gold" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-base">
              شركات
            </h2>
          </div>
          <a
            href="/topics/companies"
            className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold flex items-center gap-1 hover:underline"
          >
            {t('common.actions.viewMore')}
            <ArrowUpLeft size={13} />
          </a>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-44">
            <Loader2 className="text-gold animate-spin" size={28} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {articles.map((article, i) => (
              <motion.a
                key={article.id}
                href={`/${article.slug}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative overflow-hidden aspect-[16/9] block"
              >
                {/* Full-bleed image */}
                {article.featuredImage ? (
                  <img
                    src={article.featuredImage}
                    alt={article.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: 'var(--color-brand-800)' }}
                  />
                )}

                {/* Gradient overlay — stronger at bottom */}
                <div
                  className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-90"
                  style={{
                    background: 'linear-gradient(to top, rgba(12,30,42,0.92) 0%, rgba(12,30,42,0.3) 55%, transparent 100%)',
                  }}
                />

                {/* Top sector badge */}
                {article.sector && (
                  <span
                    className="absolute top-3 right-3 px-2 py-0.5 text-xs font-bold font-[family-name:var(--font-display)] uppercase tracking-wide"
                    style={{
                      background: 'var(--color-gold)',
                      color: 'var(--color-brand-darker)',
                    }}
                  >
                    {article.sector}
                  </span>
                )}

                {/* Bottom text */}
                <div className="absolute bottom-0 right-0 left-0 p-3">
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-white text-xs leading-relaxed line-clamp-3 mb-2">
                    {article.title}
                  </h3>
                  {article.publishedAt && (
                    <span className="flex items-center gap-1 text-white/50 font-[family-name:var(--font-display)]" style={{ fontSize: '0.65rem' }}>
                      <Clock size={8} />
                      {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
                        month: 'short', day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </motion.a>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
