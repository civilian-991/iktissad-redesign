'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpLeft, Loader2, UserCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

export default function OpinionSection() {
  const { t } = useTranslation();

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?section=opinion&status=published&pageSize=4',
    swrFetcher
  );
  const articles = data?.data ?? [];

  if (!isLoading && articles.length === 0) return null;

  return (
    <section className="bg-paper py-8 border-t border-sand">
      <div className="container-editorial">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gold" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-base">
              رأي
            </h2>
          </div>
          <Link
            href="/topics/opinion"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-sand/40 border border-sand/40">
            {articles.map((article, i) => (
              <motion.a
                key={article.id}
                href={`/${article.slug}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="group bg-paper hover:bg-cream transition-colors duration-200 flex flex-col items-center text-center p-6 gap-4 relative"
              >
                {/* Large decorative quote mark */}
                <span
                  className="absolute top-3 left-4 font-[family-name:var(--font-display)] font-bold leading-none select-none pointer-events-none"
                  style={{ fontSize: '4rem', color: 'var(--color-gold)', opacity: 0.08 }}
                >
                  &ldquo;
                </span>

                {/* Author avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-16 h-16 rounded-full overflow-hidden border-2 border-sand group-hover:border-gold transition-colors duration-300 flex items-center justify-center"
                    style={{ background: 'var(--color-cream)' }}
                  >
                    {article.author?.avatar ? (
                      <img
                        src={article.author.avatar}
                        alt={article.author.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCircle2 size={32} style={{ color: 'var(--color-sand)' }} />
                    )}
                  </div>
                  {/* Gold ring on hover */}
                  <div className="absolute inset-0 rounded-full border-2 border-gold scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Author name */}
                {article.author?.name && (
                  <div>
                    <p className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm group-hover:text-gold transition-colors duration-300">
                      {article.author.name}
                    </p>
                    <div className="w-8 h-px bg-gold/40 mx-auto mt-2 group-hover:w-12 group-hover:bg-gold transition-all duration-300" />
                  </div>
                )}

                {/* Title */}
                <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm leading-relaxed line-clamp-3 group-hover:text-gold transition-colors duration-300">
                  {article.title}
                </h3>
              </motion.a>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
