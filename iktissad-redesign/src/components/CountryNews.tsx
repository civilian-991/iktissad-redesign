'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ArrowUpLeft, Loader2 } from 'lucide-react';
import { useTranslation, useFormatters } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse, Country as DBCountry } from '@/types';

const REGION_ORDER = ['gulf', 'mashreq', 'northafrica', 'world'];

interface RegionGroup {
  id: string;
  name: string;
  countries: ViewCountry[];
}
interface ViewCountry {
  slug: string;
  name: string;
  flag: string;
}

function CountryContent({ country }: { country: ViewCountry }) {
  const { t } = useTranslation();
  const { fmtDate } = useFormatters();
  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    `/api/articles?country=${encodeURIComponent(country.slug)}&status=published&pageSize=4`,
    swrFetcher
  );
  const articles = data?.data ?? [];
  const featured = articles[0];
  const rest = articles.slice(1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="text-gold animate-spin" size={32} />
      </div>
    );
  }

  if (!featured) {
    return (
      <div className="text-center py-16">
        <p className="text-charcoal/50 font-[family-name:var(--font-display)]">{t('components.countryNews.noNews')}</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-px bg-sand/40 border border-sand/40">
      {/* Featured */}
      <a href={`/${featured.slug}`} className="relative overflow-hidden group block" style={{ minHeight: '18rem' }}>
        {featured.featuredImage ? (
          <img src={featured.featuredImage} alt={featured.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0" style={{ background: 'var(--color-brand-800)' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(12,30,42,0.88) 0%, rgba(12,30,42,0.2) 60%, transparent 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            {country.flag && <span aria-hidden className="text-lg leading-none">{country.flag}</span>}
            <span className="text-white/70 font-[family-name:var(--font-display)] text-xs">{country.name}</span>
          </div>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-white text-base leading-snug line-clamp-3 group-hover:text-gold-light transition-colors duration-300 mb-2">
            {featured.title}
          </h3>
          {featured.publishedAt && (
            <span className="text-white/50 text-xs flex items-center gap-1 font-[family-name:var(--font-display)]">
              <Clock size={10} />
              {fmtDate(featured.publishedAt, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </a>

      <div className="bg-paper flex flex-col divide-y divide-sand">
        {rest.map((article) => (
          <a key={article.id} href={`/${article.slug}`} className="group flex gap-4 p-4 hover:bg-cream transition-colors flex-1">
            {article.featuredImage && (
              <div className="flex-shrink-0 overflow-hidden" style={{ width: '4.5rem', height: '3.25rem' }}>
                <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <h4 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-sm leading-snug line-clamp-2 group-hover:text-gold transition-colors duration-300">
                {article.title}
              </h4>
              {article.publishedAt && (
                <span className="text-charcoal/40 text-xs flex items-center gap-1 mt-1 font-[family-name:var(--font-display)]">
                  <Clock size={9} />
                  {fmtDate(article.publishedAt, { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </a>
        ))}
        <a href={`/countries/${country.slug}`} className="flex items-center justify-center gap-1 py-3 text-gold text-xs font-bold font-[family-name:var(--font-display)] hover:bg-cream transition-colors">
          {t('components.countryNews.viewAllNews', { country: country.name })}
          <ArrowUpLeft size={13} />
        </a>
      </div>
    </div>
  );
}

export default function CountryNews() {
  const { t, locale } = useTranslation();
  const { data: countriesResp } = useSWR<ApiResponse<DBCountry[]>>(
    '/api/countries', swrFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 }
  );

  const regions: RegionGroup[] = useMemo(() => {
    const all = countriesResp?.data ?? [];
    const byRegion: Record<string, ViewCountry[]> = {};
    for (const c of all) {
      // Hide countries with no published articles — /api/countries returns
      // articleCount (published, non-archived) per country.
      if (!c.articleCount) continue;
      const region = c.region || 'world';
      if (!byRegion[region]) byRegion[region] = [];
      byRegion[region].push({
        slug: c.slug,
        name: locale === 'ar' ? c.name : (c.nameEn || c.name),
        flag: c.flag || '',
      });
    }
    // Order known regions first, then any extras the DB has (alphabetical)
    const known = new Set(REGION_ORDER);
    const extras = Object.keys(byRegion).filter(r => !known.has(r)).sort();
    return [...REGION_ORDER, ...extras]
      .filter(r => byRegion[r] && byRegion[r].length > 0)
      .map(r => ({
        id: r,
        name: t(`components.countryNews.regions.${r}`) || r,
        countries: byRegion[r],
      }));
  }, [countriesResp, locale, t]);

  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [activeCountrySlug, setActiveCountrySlug] = useState<string | null>(null);

  // Initialise / re-sync selection once the data arrives
  useEffect(() => {
    if (regions.length === 0) return;
    if (!activeRegionId || !regions.find(r => r.id === activeRegionId)) {
      setActiveRegionId(regions[0].id);
      setActiveCountrySlug(regions[0].countries[0]?.slug ?? null);
    }
  }, [regions, activeRegionId]);

  const activeRegion = regions.find(r => r.id === activeRegionId) ?? regions[0];
  const activeCountry =
    activeRegion?.countries.find(c => c.slug === activeCountrySlug) ?? activeRegion?.countries[0];

  function handleRegionChange(region: RegionGroup) {
    setActiveRegionId(region.id);
    setActiveCountrySlug(region.countries[0]?.slug ?? null);
  }

  if (regions.length === 0 || !activeRegion || !activeCountry) {
    return (
      <section className="bg-paper py-8 border-t border-charcoal/10">
        <div className="container-editorial">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-gold animate-spin" size={28} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-paper py-8 border-t border-charcoal/10">
      <div className="container-editorial">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gold" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-obsidian text-base">
              {t('components.countryNews.title')}
            </h2>
          </div>
          <Link
            href="/countries"
            className="text-gold text-sm font-[family-name:var(--font-display)] font-semibold flex items-center gap-1 hover:underline"
          >
            {t('common.actions.viewMore')}
            <ArrowUpLeft size={13} />
          </Link>
        </div>

        <div className="flex flex-wrap gap-0 border-b border-sand mb-4">
          {regions.map((region) => (
            <button
              key={region.id}
              onClick={() => handleRegionChange(region)}
              className={`px-5 py-2.5 font-[family-name:var(--font-display)] font-bold text-sm transition-all duration-200 border-b-2 -mb-px ${
                activeRegion.id === region.id
                  ? 'text-gold border-gold'
                  : 'text-charcoal/50 border-transparent hover:text-obsidian hover:border-sand'
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRegion.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-wrap gap-2 mb-5"
          >
            {activeRegion.countries.map((country) => (
              <button
                key={country.slug}
                onClick={() => setActiveCountrySlug(country.slug)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-[family-name:var(--font-display)] border transition-all duration-200 ${
                  activeCountry.slug === country.slug
                    ? 'bg-obsidian text-white border-obsidian'
                    : 'bg-paper text-charcoal/60 border-sand hover:border-charcoal/30 hover:text-obsidian'
                }`}
              >
                {country.flag && <span aria-hidden className="text-base leading-none">{country.flag}</span>}
                {country.name}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeCountry.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CountryContent country={activeCountry} />
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
