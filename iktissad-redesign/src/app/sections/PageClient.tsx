'use client';

import { motion } from 'motion/react';
import {
  TrendingUp,
  Building2,
  BarChart3,
  Cpu,
  Zap,
  MessageSquare,
  FolderOpen,
  Play,
  ArrowUpLeft,
  Loader2
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse, Section } from '@/types';

// Fallback icon map for sections fetched from the API (keyed by slug)
const sectionIconMap: Record<string, React.ElementType> = {
  economy: TrendingUp,
  companies: Building2,
  markets: BarChart3,
  technology: Cpu,
  'energy-innovation': Zap,
  opinion: MessageSquare,
  files: FolderOpen,
  video: Play,
};

const sectionColorMap: Record<string, { color: string; bgColor: string }> = {
  economy:          { color: 'from-emerald-500 to-emerald-700', bgColor: 'bg-emerald-50' },
  companies:        { color: 'from-blue-500 to-blue-700',      bgColor: 'bg-blue-50' },
  markets:          { color: 'from-purple-500 to-purple-700',  bgColor: 'bg-purple-50' },
  technology:       { color: 'from-cyan-500 to-cyan-700',      bgColor: 'bg-cyan-50' },
  'energy-innovation': { color: 'from-amber-500 to-amber-700', bgColor: 'bg-amber-50' },
  opinion:          { color: 'from-rose-500 to-rose-700',      bgColor: 'bg-rose-50' },
  files:            { color: 'from-slate-500 to-slate-700',    bgColor: 'bg-slate-50' },
  video:            { color: 'from-red-500 to-red-700',        bgColor: 'bg-red-50' },
};

const DEFAULT_COLOR    = 'from-navy to-navy-light';
const DEFAULT_BG_COLOR = 'bg-cream';
const DEFAULT_ICON     = TrendingUp;

export default function SectionsPageClient() {
  const { t } = useTranslation();

  const { data, isLoading, error } = useSWR<ApiResponse<Section[]>>(
    '/api/sections',
    swrFetcher
  );

  const sections = data?.data ?? [];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-20 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider">
                استكشف المحتوى
              </span>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-4">
                {t('pages.sections.title')}
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                {t('pages.sections.description')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Sections Grid */}
        <section className="py-16">
          <div className="container-luxury">
            {isLoading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="text-gold animate-spin" size={40} />
              </div>
            )}

            {error && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg">تعذّر تحميل الأقسام. حاول مجدداً.</p>
              </div>
            )}

            {!isLoading && !error && sections.length === 0 && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg">لا توجد أقسام حتى الآن.</p>
              </div>
            )}

            {sections.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {sections.map((section, index) => {
                  const IconComponent = sectionIconMap[section.slug] ?? DEFAULT_ICON;
                  const { color, bgColor } = sectionColorMap[section.slug] ?? {
                    color: DEFAULT_COLOR,
                    bgColor: DEFAULT_BG_COLOR,
                  };

                  return (
                    <motion.a
                      key={section.slug}
                      href={`/sections/${section.slug}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -8 }}
                      className="group"
                    >
                      <div className={`${bgColor} rounded-2xl p-6 h-full transition-all duration-500 group-hover:shadow-xl relative overflow-hidden`}>
                        {/* Decorative gradient */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />

                        <div className="relative">
                          {/* Icon */}
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
                            <IconComponent className="text-white" size={24} />
                          </div>

                          {/* Content */}
                          <h3 className="font-[family-name:var(--font-display)] font-bold text-xl text-navy mb-2 group-hover:text-gold transition-colors">
                            {section.name}
                          </h3>
                          <p className="text-slate text-sm mb-4 line-clamp-2">
                            {section.description}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate font-[family-name:var(--font-display)]">
                              {section.articleCount.toLocaleString('ar-SA-u-ca-gregory')} مقال
                            </span>
                            <span className="flex items-center gap-1 text-gold text-sm font-[family-name:var(--font-display)] font-semibold group-hover:gap-2 transition-all">
                              تصفح
                              <ArrowUpLeft size={16} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.a>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
