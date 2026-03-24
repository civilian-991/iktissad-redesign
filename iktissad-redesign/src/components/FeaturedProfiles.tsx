'use client';

import { motion } from 'motion/react';
import { ArrowUpLeft, Loader2, UserCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

export default function FeaturedProfiles() {
  const { t } = useTranslation();

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?tag=profile&featured=true&status=published&pageSize=8',
    swrFetcher
  );
  const profiles = data?.data ?? [];

  return (
    <section className="py-20 bg-cream relative overflow-hidden">
      <div className="absolute inset-0 geometric-pattern opacity-30" />

      <div className="container-luxury relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        >
          <div>
            <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider">
              {t('components.featuredProfiles.subtitle')}
            </span>
            <h2 className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold text-navy mt-2">
              {t('components.featuredProfiles.sectionTitle')}
            </h2>
            <p className="text-slate mt-2 max-w-lg">
              {t('components.featuredProfiles.description')}
            </p>
          </div>
          <a
            href="/profiles"
            className="btn-navy flex items-center gap-2 self-start"
          >
            <span>{t('components.featuredProfiles.viewAllProfiles')}</span>
            <ArrowUpLeft size={18} />
          </a>
        </motion.div>

        {/* Profiles Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-gold animate-spin" size={40} />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate font-[family-name:var(--font-display)]">لا توجد ملفات تعريفية متاحة حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {profiles.map((profile, index) => (
              <motion.a
                key={profile.id}
                href={`/${profile.slug}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -6 }}
                className="group flex flex-col items-center text-center gap-3"
              >
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-sand group-hover:border-gold transition-colors duration-300 flex-shrink-0 bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
                  {profile.featuredImage ? (
                    <img
                      src={profile.featuredImage}
                      alt={profile.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle2 className="text-white/40" size={40} />
                  )}
                </div>
                {/* Name */}
                <p className="font-[family-name:var(--font-display)] font-semibold text-navy text-sm group-hover:text-gold transition-colors duration-300 leading-snug line-clamp-2">
                  {profile.title}
                </p>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
