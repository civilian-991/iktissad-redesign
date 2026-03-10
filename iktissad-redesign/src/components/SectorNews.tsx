'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/lib/i18n';
import {
  Factory, Building2, Plane, Cpu, Car, Leaf, Wheat, ShoppingBag,
  TrendingUp, Shield, Home, Truck, GraduationCap, HeartPulse,
  Lightbulb, Gem, Coins, ArrowUpLeft, Clock, ChevronLeft, ChevronRight,
  Loader2, Briefcase, Globe
} from 'lucide-react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

// Map Arabic sector names to icons
const SECTOR_ICONS: Record<string, React.ElementType> = {
  'مال ومصارف': Building2,
  'تكنولوجيا': Cpu,
  'طاقة': Lightbulb,
  'طاقة متجددة': Leaf,
  'نفط وغاز': Factory,
  'كهرباء': Lightbulb,
  'عقار وإنشاءات': Home,
  'سيارات ومحركات': Car,
  'سياحة وطيران': Plane,
  'منتجات الرفاهية': Gem,
  'ساعات ورفاهية': Gem,
  'اقتصاد عام': TrendingUp,
  'النقل واللوجستيات': Truck,
  'شركات': Briefcase,
  'رجال وأعمال': Briefcase,
  'مجتمع': Globe,
  'صحة': HeartPulse,
  'تعليم': GraduationCap,
  'بيئة': Leaf,
};

interface Sector { id: string; name: string; slug: string; }

function SectorCard({ sector }: { sector: Sector }) {
  const { t } = useTranslation();
  const Icon = SECTOR_ICONS[sector.name] ?? TrendingUp;

  const { data } = useSWR<ApiResponse<Article[]>>(
    `/api/articles?sector=${sector.slug}&status=published&pageSize=4`,
    swrFetcher
  );
  const articles = data?.data ?? [];
  const featured = articles[0];
  const rest = articles.slice(1, 3);

  return (
    <div className="bg-paper border border-sand hover:border-gold/50 hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-obsidian to-brand-darker p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold/20 border border-gold/30 flex items-center justify-center">
            <Icon className="text-gold" size={20} />
          </div>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-white text-lg">
            {sector.name}
          </h3>
        </div>
        <a
          href={`/sectors/${sector.slug}`}
          className="text-white/70 hover:text-white transition-colors flex items-center gap-1 text-xs font-[family-name:var(--font-display)]"
        >
          {t('common.actions.viewMore')}
          <ArrowUpLeft size={14} />
        </a>
      </div>

      {/* Featured Article */}
      {!data ? (
        <div className="h-52 flex items-center justify-center bg-cream">
          <Loader2 className="text-gold animate-spin" size={24} />
        </div>
      ) : featured ? (
        <a href={`/news/${featured.id}`} className="block relative h-52 overflow-hidden group/featured">
          {featured.featuredImage ? (
            <img
              src={featured.featuredImage}
              alt={featured.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-obsidian to-brand-darker" />
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/5 backdrop-blur-md border-t border-white/10">
            <h4 className="font-[family-name:var(--font-display)] font-bold text-white text-sm leading-relaxed line-clamp-2 mb-2">
              {featured.title}
            </h4>
            {featured.publishedAt && (
              <span className="text-white/60 text-xs flex items-center gap-1.5">
                <Clock size={12} />
                {new Date(featured.publishedAt).toLocaleDateString('ar-SA')}
              </span>
            )}
          </div>
        </a>
      ) : (
        <div className="h-52 flex items-center justify-center bg-cream">
          <p className="text-graphite text-sm">لا توجد مقالات</p>
        </div>
      )}

      {/* Article List */}
      <div className="divide-y divide-sand">
        {rest.map((article, index) => (
          <a
            key={article.id}
            href={`/news/${article.id}`}
            className="flex items-start gap-3 p-4 hover:bg-cream transition-colors group/item"
          >
            <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-obsidian to-brand-darker text-white text-xs flex items-center justify-center font-[family-name:var(--font-display)] font-bold">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <h5 className="font-[family-name:var(--font-display)] font-semibold text-sm text-obsidian leading-relaxed line-clamp-2 group-hover/item:text-gold transition-colors duration-300">
                {article.title}
              </h5>
              {article.publishedAt && (
                <span className="text-graphite text-xs mt-1.5 flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(article.publishedAt).toLocaleDateString('ar-SA')}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

const SECTORS_PER_PAGE = 6;

export default function SectorNews() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);

  const { data: sectorsData } = useSWR<ApiResponse<Sector[]>>(
    '/api/sectors?pageSize=50',
    swrFetcher
  );
  const sectors = sectorsData?.data ?? [];
  const totalPages = Math.ceil(sectors.length / SECTORS_PER_PAGE);
  const visibleSectors = sectors.slice(currentPage * SECTORS_PER_PAGE, (currentPage + 1) * SECTORS_PER_PAGE);

  return (
    <section className="py-24 bg-paper relative overflow-hidden">
      <div className="absolute inset-0 pattern-grid" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

      <div className="container-editorial relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        >
          <div>
            <span className="section-label">{t('components.sectorNews.subtitle')}</span>
            <h2 className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold text-obsidian mt-3 mb-4">
              {t('components.sectorNews.title')}
            </h2>
            <div className="divider-editorial max-w-xs">
              <div className="diamond-accent" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setCurrentPage(p => (p - 1 + totalPages) % totalPages)}
                  className="w-10 h-10 border border-sand hover:border-gold text-graphite hover:text-gold flex items-center justify-center transition-colors"
                >
                  <ChevronRight size={18} />
                </motion.button>
                <span className="text-sm text-graphite font-[family-name:var(--font-display)] min-w-[60px] text-center">
                  {currentPage + 1} / {totalPages}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setCurrentPage(p => (p + 1) % totalPages)}
                  className="w-10 h-10 border border-sand hover:border-gold text-graphite hover:text-gold flex items-center justify-center transition-colors"
                >
                  <ChevronLeft size={18} />
                </motion.button>
              </div>
            )}
            <a href="/sectors" className="btn-outline inline-flex items-center gap-2">
              <span>{t('components.sectorNews.allSectors')}</span>
              <ArrowUpLeft size={16} />
            </a>
          </div>
        </motion.div>

        {/* Grid */}
        {sectors.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-gold animate-spin" size={40} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {visibleSectors.map((sector, i) => (
                <motion.div
                  key={sector.slug}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <SectorCard sector={sector} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Page Indicators */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentPage ? 'w-8 bg-gold' : 'w-2 bg-sand hover:bg-stone'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
