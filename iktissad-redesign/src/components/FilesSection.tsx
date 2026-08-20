'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Clock, ArrowUpLeft, Loader2, FolderOpen } from 'lucide-react';
import { useTranslation, useFormatters } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { ArticleSeries, ApiResponse } from '@/types';

export default function FilesSection() {
  const { t } = useTranslation();
  const { fmtDate } = useFormatters();

  const { data, isLoading } = useSWR<ApiResponse<ArticleSeries[]>>(
    '/api/series?status=active&pageSize=5',
    swrFetcher
  );
  const series = data?.data ?? [];
  const featured = series[0];
  const rest = series.slice(1);

  if (!isLoading && series.length === 0) return null;

  return (
    <section className="bg-[#F7F7F7] py-10 border-t border-charcoal/10">
      <div className="container-editorial">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-navy" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-ink text-lg">
              {t('components.filesSection.title')}
            </h2>
          </div>
          <Link
            href="/reports"
            className="text-ink text-sm font-[family-name:var(--font-display)] font-semibold flex items-center gap-1 hover:underline"
          >
            {t('common.actions.viewMore')}
            <ArrowUpLeft size={13} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-52">
            <Loader2 className="text-ink animate-spin" size={28} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-5">

            {/* Featured dossier — spans 2 cols */}
            {featured && (
              <motion.a
                href={`/reports/${featured.slug}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 group relative overflow-hidden bg-obsidian hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
              >
                {/* Image */}
                <div className="relative overflow-hidden flex-shrink-0" style={{ paddingBottom: '52%' }}>
                  {featured.coverImage ? (
                    <img
                      src={featured.coverImage}
                      alt={featured.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] opacity-75"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-navy to-obsidian" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
                  {/* Badge */}
                  <span className="absolute top-3 end-3 px-3 py-1 text-xs font-bold font-[family-name:var(--font-display)] bg-white/10 border border-white/20 text-white backdrop-blur-sm">
                    {t('components.filesSection.dossierBadge')}
                  </span>
                  {/* Title overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-6">
                    <h3 className="font-[family-name:var(--font-display)] font-black text-white text-xl leading-snug line-clamp-2 group-hover:text-gold/90 transition-colors duration-300 mb-2">
                      {featured.title}
                    </h3>
                    {featured.description && (
                      <p className="text-white/55 text-sm leading-relaxed line-clamp-2 font-[family-name:var(--font-display)]">
                        {featured.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      {featured.articleCount !== undefined && featured.articleCount > 0 && (
                        <span className="text-white/50 text-xs font-[family-name:var(--font-display)]">
                          {t('components.filesSection.articlesCount', { count: featured.articleCount })}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-white/40 text-xs font-[family-name:var(--font-display)]">
                        <Clock size={10} />
                        {fmtDate(featured.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 inset-x-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-[inline-start] bg-gold" />
              </motion.a>
            )}

            {/* Remaining dossiers — stacked */}
            <div className="flex flex-col gap-4">
              {rest.map((s, i) => (
                <motion.a
                  key={s.id}
                  href={`/reports/${s.slug}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06 }}
                  className="group flex gap-3 bg-white border border-charcoal/10 hover:border-navy/30 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="relative w-24 flex-shrink-0 overflow-hidden" style={{ minHeight: '80px' }}>
                    {s.coverImage ? (
                      <img
                        src={s.coverImage}
                        alt={s.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-navy/20 to-navy/40 flex items-center justify-center">
                        <FolderOpen className="text-white/50" size={18} />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col justify-center py-3 pe-4 gap-1 flex-1 min-w-0">
                    <h4 className="font-[family-name:var(--font-display)] font-bold text-ink text-sm leading-snug line-clamp-2 group-hover:text-ink transition-colors duration-300">
                      {s.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      {s.articleCount !== undefined && s.articleCount > 0 && (
                        <span className="text-ink/60 text-xs font-[family-name:var(--font-display)] font-semibold">
                          {t('components.filesSection.articlesCount', { count: s.articleCount })}
                        </span>
                      )}
                      <span className="text-charcoal/40 text-xs flex items-center gap-1 font-[family-name:var(--font-display)]">
                        <Clock size={10} />
                        {fmtDate(s.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}

              <Link
                href="/reports"
                className="flex items-center justify-center gap-2 py-3 border border-dashed border-navy/30 text-ink text-sm font-[family-name:var(--font-display)] font-semibold hover:border-navy hover:bg-navy/5 transition-all duration-200"
              >
                {t('components.filesSection.viewAllFiles')}
                <ArrowUpLeft size={14} />
              </Link>
            </div>

          </div>
        )}

      </div>
    </section>
  );
}
