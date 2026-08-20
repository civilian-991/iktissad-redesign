'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpLeft, Loader2, UserCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

export default function FeaturedProfiles() {
  const { t } = useTranslation();

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?tag=profile&featured=true&status=published&pageSize=6',
    swrFetcher
  );
  const profiles = data?.data ?? [];

  if (!isLoading && profiles.length === 0) return null;

  return (
    <section className="bg-cream py-8 border-t border-sand">
      <div className="container-editorial">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gold" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-ink text-base">
              {t('components.featuredProfiles.sectionTitle')}
            </h2>
          </div>
          <Link
            href="/profiles"
            className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold flex items-center gap-1 hover:underline"
          >
            {t('common.actions.viewMore')}
            <ArrowUpLeft size={13} />
          </Link>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-44">
            <Loader2 className="text-gold animate-spin" size={28} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {profiles.map((profile, i) => (
              <motion.a
                key={profile.id}
                href={`/${profile.slug}`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group flex flex-col overflow-hidden bg-paper border border-sand hover:border-gold/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Photo */}
                <div className="aspect-[3/4] overflow-hidden bg-cream relative flex-shrink-0">
                  {profile.featuredImage ? (
                    <img
                      src={profile.featuredImage}
                      alt={profile.title}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: 'var(--color-brand-800)' }}
                    >
                      <UserCircle2 size={40} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                  )}
                  {/* Subtle bottom gradient */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-12"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)' }}
                  />
                </div>

                {/* Name */}
                <div className="p-3 flex flex-col gap-1">
                  <p className="font-[family-name:var(--font-display)] font-bold text-ink text-sm leading-snug line-clamp-2 group-hover:text-gold transition-colors duration-300 text-center">
                    {profile.title}
                  </p>
                  {profile.sector && (
                    <p className="font-[family-name:var(--font-display)] text-xs text-charcoal/50 text-center line-clamp-1">
                      {profile.sector}
                    </p>
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
