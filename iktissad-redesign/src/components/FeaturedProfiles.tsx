'use client';

import { motion } from 'motion/react';
import { Building2, ArrowUpLeft, Loader2, Globe, Factory, Landmark } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Profile, ApiResponse } from '@/types';

const TYPE_ICONS: Record<string, React.ElementType> = {
  corporation: Building2,
  government: Landmark,
  ngo: Globe,
  individual: Factory,
};

const TYPE_LABELS: Record<string, string> = {
  corporation: 'شركة',
  government: 'جهة حكومية',
  ngo: 'منظمة',
  individual: 'شخصية',
};

export default function FeaturedProfiles() {
  const { t } = useTranslation();

  const { data, isLoading } = useSWR<ApiResponse<Profile[]>>(
    '/api/profiles?pageSize=4',
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {profiles.map((profile, index) => {
              const Icon = TYPE_ICONS[profile.type] ?? Building2;
              const typeLabel = TYPE_LABELS[profile.type] ?? profile.type;

              return (
                <motion.a
                  key={profile.id}
                  href={`/profiles/${profile.id}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="group relative"
                >
                  <div className="relative bg-paper overflow-hidden shadow-card border border-sand">
                    {/* Logo / Image area */}
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-obsidian to-brand-darker flex items-center justify-center">
                      {profile.logo ? (
                        <img
                          src={profile.logo}
                          alt={profile.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <Icon className="text-gold/40" size={64} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-light/60 via-transparent to-transparent" />

                      {/* Type Badge */}
                      <span className="absolute top-4 right-4 px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-[family-name:var(--font-display)] font-semibold rounded-full">
                        {typeLabel}
                      </span>

                      {/* Icon overlay on hover */}
                      <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Icon size={18} className="text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 relative">
                      <div className="absolute top-0 right-5 w-12 h-1 bg-gradient-to-l from-gold to-transparent -translate-y-0.5" />

                      <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-1 group-hover:text-gold transition-colors duration-300 line-clamp-1">
                        {profile.name}
                      </h3>
                      {profile.sector && (
                        <p className="text-sm text-slate mb-3">{profile.sector}</p>
                      )}
                      {profile.description && (
                        <p className="text-xs text-charcoal leading-relaxed line-clamp-2">
                          {profile.description}
                        </p>
                      )}
                    </div>

                    <div className="absolute inset-0 border border-transparent group-hover:border-gold transition-colors duration-300 pointer-events-none" />
                  </div>

                  <div className="absolute -bottom-3 left-3 right-3 h-6 bg-obsidian/8 -z-10 blur-md" />
                </motion.a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
