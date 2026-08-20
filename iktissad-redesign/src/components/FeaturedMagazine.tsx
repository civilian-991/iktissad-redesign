'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { BookOpen, Eye, ArrowLeft, ArrowUpLeft, Sparkles, Loader2 } from 'lucide-react';
import { useTranslation, useFormatters } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { MagazineIssue, ApiResponse } from '@/types';

export default function FeaturedMagazine() {
  const { t } = useTranslation();
  const { fmtDate, fmtNumber } = useFormatters();

  const { data } = useSWR<ApiResponse<MagazineIssue[]>>(
    '/api/magazines?status=published&pageSize=4',
    swrFetcher
  );
  const issues = data?.data ?? [];
  const latestIssue = issues[0];
  const recentIssues = issues.slice(1, 4);

  return (
    <section className="py-20 bg-cream relative overflow-hidden">
      <div className="absolute inset-0 pattern-grid opacity-30" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />

      <div className="container-editorial relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gold" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-ink text-base">
              {t('nav.group.magazine')}
            </h2>
          </div>
          <Link href="/magazine" className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold flex items-center gap-1 hover:underline">
            <span>{t('pages.magazine.allIssues')}</span>
            <ArrowUpLeft size={13} />
          </Link>
        </div>

        {!data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-gold animate-spin" size={40} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Latest Issue */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2"
            >
              {latestIssue && (
                <div className="bg-paper border border-sand p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="text-gold" size={20} />
                    <span className="text-gold font-[family-name:var(--font-display)] font-semibold">
                      {t('components.featuredMagazine.latestIssue')}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Cover */}
                    <motion.a
                      href={`/magazine/${latestIssue.id}/browse`}
                      whileHover={{ scale: 1.02 }}
                      className="relative group flex-shrink-0"
                    >
                      <div className="absolute inset-0 bg-gold/30 blur-2xl rounded-lg opacity-50 group-hover:opacity-70 transition-opacity" />
                      {latestIssue.coverImage ? (
                        <img
                          src={latestIssue.coverImage}
                          alt={latestIssue.title}
                          className="relative w-48 md:w-56 h-64 md:h-72 object-cover shadow-2xl"
                        />
                      ) : (
                        <div className="relative w-48 md:w-56 h-64 md:h-72 bg-obsidian shadow-2xl flex items-center justify-center">
                          <BookOpen className="text-gold" size={48} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-light/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                        <span className="px-4 py-2 bg-gold text-ink font-[family-name:var(--font-display)] font-bold text-sm flex items-center gap-2">
                          <BookOpen size={16} />
                          {t('components.featuredMagazine.browseNow')}
                        </span>
                      </div>
                    </motion.a>

                    {/* Info */}
                    <div className="flex-1">
                      {latestIssue.subtitle && (
                        <span className="text-gold font-[family-name:var(--font-display)]">
                          {latestIssue.subtitle}
                        </span>
                      )}
                      <h3 className="text-xl md:text-2xl font-[family-name:var(--font-display)] font-bold text-ink mt-1 mb-4">
                        {latestIssue.title}
                      </h3>

                      <div className="flex items-center gap-6 mb-6 text-graphite text-sm">
                        {latestIssue.pages > 0 && (
                          <span className="flex items-center gap-2">
                            <BookOpen size={16} />
                            {latestIssue.pages} {t('components.featuredMagazine.pages')}
                          </span>
                        )}
                        {latestIssue.views > 0 && (
                          <span className="flex items-center gap-2">
                            <Eye size={16} />
                            {fmtNumber(latestIssue.views)} {t('components.featuredMagazine.reads')}
                          </span>
                        )}
                      </div>

                      {latestIssue.highlights?.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-charcoal font-[family-name:var(--font-display)] font-semibold mb-3 text-sm">
                            {t('components.featuredMagazine.inThisIssue')}
                          </h4>
                          <ul className="space-y-2">
                            {latestIssue.highlights.map((highlight, i) => (
                              <li key={i} className="flex items-center gap-3 text-charcoal">
                                <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                                {highlight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Link
                          href={`/magazine/${latestIssue.id}/browse`}
                          className="flex items-center gap-2 px-6 py-3 bg-gold text-ink font-[family-name:var(--font-display)] font-bold hover:bg-gold-dark transition-colors"
                        >
                          <BookOpen size={18} />
                          {t('components.featuredMagazine.browseIssue')}
                        </Link>
                        <Link
                          href="/magazine"
                          className="flex items-center gap-2 px-6 py-3 border border-obsidian text-ink font-[family-name:var(--font-display)] font-semibold hover:bg-obsidian hover:text-white transition-colors"
                        >
                          {t('components.featuredMagazine.archive')}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Recent Issues */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h4 className="text-ink font-[family-name:var(--font-display)] font-semibold mb-4">
                {t('pages.magazine.pastIssues')}
              </h4>

              {recentIssues.map((issue, index) => (
                <motion.a
                  key={issue.id}
                  href={`/magazine/${issue.id}/browse`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: -5 }}
                  className="flex items-center gap-4 p-3 bg-obsidian/5 backdrop-blur-sm border border-obsidian/10 hover:bg-obsidian/10 hover:border-gold/30 transition-all duration-300 group"
                >
                  {issue.coverImage ? (
                    <div className="relative w-16 h-20 shadow-lg shrink-0">
                      <Image src={issue.coverImage} alt={issue.title} fill className="object-cover" sizes="64px" />
                    </div>
                  ) : (
                    <div className="w-16 h-20 bg-obsidian flex items-center justify-center shadow-lg">
                      <BookOpen className="text-gold" size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                    <h5 className="font-[family-name:var(--font-display)] font-bold text-ink group-hover:text-gold transition-colors">
                      {issue.title}
                    </h5>
                    {issue.subtitle && <p className="text-graphite text-sm">{issue.subtitle}</p>}
                    {issue.publishDate && (
                      <p className="text-graphite text-xs">
                        {fmtDate(issue.publishDate, { year: 'numeric', month: 'long' })}
                      </p>
                    )}
                  </div>
                  <ArrowLeft size={18} className="text-sand group-hover:text-gold transition-colors" />
                </motion.a>
              ))}

              <Link href="/magazine" className="block text-center py-3 text-gold hover:text-gold-dark font-[family-name:var(--font-display)] font-semibold transition-colors">
                {t('components.featuredMagazine.viewAllIssues')}
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}
