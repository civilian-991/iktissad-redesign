'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Clock, ArrowUpLeft, Loader2 } from 'lucide-react';
import { useTranslation, useFormatters } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse, Section } from '@/types';

// Sections already represented by dedicated homepage components — everything
// else with published articles gets an auto-generated block below, so new
// sections created in the admin appear on the homepage without code changes.
const HARDCODED_SECTION_SLUGS = new Set(['companies', 'videos', 'opinion', 'files']);

function SectionBlock({ section, alt }: { section: Section; alt: boolean }) {
  const { t, locale } = useTranslation();
  const { fmtDate } = useFormatters();

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    `/api/articles?section=${section.slug}&status=published&pageSize=4`,
    swrFetcher
  );
  const articles = data?.data ?? [];

  if (!isLoading && articles.length === 0) return null;

  const title = locale === 'ar' ? section.name : (section.nameEn || section.name);

  return (
    <section className={`${alt ? 'bg-cream' : 'bg-white'} py-8 border-t border-sand`}>
      <div className="container-editorial">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gold" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-ink text-base">
              {title}
            </h2>
          </div>
          <Link
            href={`/topics/${section.slug}`}
            className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold flex items-center gap-1 hover:underline"
          >
            {t('common.actions.viewMore')}
            <ArrowUpLeft size={13} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-44">
            <Loader2 className="text-gold animate-spin" size={28} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                {/* Bottom text */}
                <div className="absolute bottom-0 inset-x-0 p-3">
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-white text-xs leading-relaxed line-clamp-3 mb-2">
                    {article.title}
                  </h3>
                  {article.publishedAt && (
                    <span className="flex items-center gap-1 text-white/50 font-[family-name:var(--font-display)]" style={{ fontSize: '0.65rem' }}>
                      <Clock size={8} />
                      {fmtDate(article.publishedAt, { month: 'short', day: 'numeric' })}
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

export default function HomeSectionBlocks() {
  const { data } = useSWR<ApiResponse<Section[]>>('/api/sections', swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });

  const sections = (data?.data ?? []).filter(
    (s) => !HARDCODED_SECTION_SLUGS.has(s.slug) && (s.articleCount ?? 0) > 0
  );

  return (
    <>
      {sections.map((s, i) => (
        <SectionBlock key={s.slug} section={s} alt={i % 2 === 1} />
      ))}
    </>
  );
}
