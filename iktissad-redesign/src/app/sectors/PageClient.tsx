'use client';

import { motion } from 'motion/react';
import {
  TrendingUp,
  Building2,
  Fuel,
  Plane,
  Cpu,
  Car,
  Leaf,
  Home,
  Heart,
  GraduationCap,
  ArrowUpLeft,
  Loader2
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse, Sector } from '@/types';

// Fallback icon map for sectors fetched from the API (keyed by slug)
const sectorIconMap: Record<string, React.ElementType> = {
  economy:      TrendingUp,
  finance:      Building2,
  energy:       Fuel,
  'oil-gas':    Fuel,
  tourism:      Plane,
  technology:   Cpu,
  automotive:   Car,
  'real-estate': Home,
  environment:  Leaf,
  health:       Heart,
  education:    GraduationCap,
};

const sectorColorMap: Record<string, { color: string; bgColor: string }> = {
  economy:       { color: 'from-emerald-500 to-emerald-700', bgColor: 'bg-emerald-50' },
  finance:       { color: 'from-blue-500 to-blue-700',       bgColor: 'bg-blue-50' },
  energy:        { color: 'from-amber-500 to-amber-700',     bgColor: 'bg-amber-50' },
  'oil-gas':     { color: 'from-orange-500 to-orange-700',   bgColor: 'bg-orange-50' },
  tourism:       { color: 'from-sky-500 to-sky-700',         bgColor: 'bg-sky-50' },
  technology:    { color: 'from-purple-500 to-purple-700',   bgColor: 'bg-purple-50' },
  automotive:    { color: 'from-red-500 to-red-700',         bgColor: 'bg-red-50' },
  'real-estate': { color: 'from-slate-500 to-slate-700',     bgColor: 'bg-slate-50' },
  environment:   { color: 'from-green-500 to-green-700',     bgColor: 'bg-green-50' },
  health:        { color: 'from-rose-500 to-rose-700',       bgColor: 'bg-rose-50' },
  education:     { color: 'from-indigo-500 to-indigo-700',   bgColor: 'bg-indigo-50' },
};

const DEFAULT_COLOR    = 'from-navy to-navy-light';
const DEFAULT_BG_COLOR = 'bg-cream';
const DEFAULT_ICON     = TrendingUp;

export default function SectorsPageClient() {
  const { t } = useTranslation();

  const { data, isLoading, error } = useSWR<ApiResponse<Sector[]>>(
    '/api/sectors',
    swrFetcher
  );

  const sectors = data?.data ?? [];

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
                تغطية شاملة
              </span>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-4">
                {t('pages.sectors.title')}
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                تغطية متخصصة لجميع القطاعات الاقتصادية الرئيسية في العالم العربي
              </p>
            </motion.div>
          </div>
        </section>

        {/* Sectors Grid */}
        <section className="py-16">
          <div className="container-luxury">
            {isLoading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="text-gold animate-spin" size={40} />
              </div>
            )}

            {error && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg">تعذّر تحميل القطاعات. حاول مجدداً.</p>
              </div>
            )}

            {!isLoading && !error && sectors.length === 0 && (
              <div className="text-center py-24">
                <p className="text-charcoal text-lg">لا توجد قطاعات حتى الآن.</p>
              </div>
            )}

            {sectors.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sectors.map((sector, index) => {
                  const IconComponent = sectorIconMap[sector.slug] ?? DEFAULT_ICON;
                  const { color, bgColor } = sectorColorMap[sector.slug] ?? {
                    color: DEFAULT_COLOR,
                    bgColor: DEFAULT_BG_COLOR,
                  };

                  return (
                    <motion.a
                      key={sector.slug}
                      href={`/sectors/${sector.slug}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -8 }}
                      className="group"
                    >
                      <div className={`${bgColor} rounded-2xl p-6 transition-all duration-500 group-hover:shadow-xl relative overflow-hidden`}>
                        {/* Decorative gradient */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />

                        <div className="relative">
                          {/* Icon */}
                          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
                            <IconComponent className="text-white" size={28} />
                          </div>

                          {/* Content */}
                          <h3 className="font-[family-name:var(--font-display)] font-bold text-xl text-navy mb-2 group-hover:text-gold transition-colors">
                            {sector.name}
                          </h3>
                          <p className="text-slate text-sm mb-4">
                            {sector.description}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate font-[family-name:var(--font-display)]">
                              {sector.articleCount.toLocaleString('ar-SA-u-ca-gregory')} مقال
                            </span>
                            <span className="flex items-center gap-1 text-gold text-sm font-[family-name:var(--font-display)] font-semibold group-hover:gap-2 transition-all">
                              استكشف
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
