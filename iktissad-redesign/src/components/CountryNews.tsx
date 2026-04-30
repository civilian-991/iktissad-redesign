'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, ArrowUpLeft, Loader2 } from 'lucide-react';
import { useTranslation, useFormatters } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

const regions = [
  {
    id: 'gulf',
    name: 'الخليج',
    countries: [
      { id: 'saudi',   name: 'السعودية', slug: 'السعودية', flag: 'https://flagcdn.com/w40/sa.png' },
      { id: 'uae',     name: 'الإمارات', slug: 'الإمارات', flag: 'https://flagcdn.com/w40/ae.png' },
      { id: 'qatar',   name: 'قطر',      slug: 'قطر',      flag: 'https://flagcdn.com/w40/qa.png' },
      { id: 'kuwait',  name: 'الكويت',   slug: 'الكويت',   flag: 'https://flagcdn.com/w40/kw.png' },
      { id: 'bahrain', name: 'البحرين',  slug: 'البحرين',  flag: 'https://flagcdn.com/w40/bh.png' },
      { id: 'oman',    name: 'عُمان',    slug: 'عُمان',    flag: 'https://flagcdn.com/w40/om.png' },
    ],
  },
  {
    id: 'mashreq',
    name: 'المشرق',
    countries: [
      { id: 'lebanon', name: 'لبنان',  slug: 'لبنان',  flag: 'https://flagcdn.com/w40/lb.png' },
      { id: 'syria',   name: 'سوريا',  slug: 'سوريا',  flag: 'https://flagcdn.com/w40/sy.png' },
      { id: 'jordan',  name: 'الأردن', slug: 'الأردن', flag: 'https://flagcdn.com/w40/jo.png' },
      { id: 'iraq',    name: 'العراق', slug: 'العراق', flag: 'https://flagcdn.com/w40/iq.png' },
    ],
  },
  {
    id: 'northafrica',
    name: 'شمال أفريقيا',
    countries: [
      { id: 'egypt',   name: 'مصر',     slug: 'مصر',     flag: 'https://flagcdn.com/w40/eg.png' },
      { id: 'morocco', name: 'المغرب',  slug: 'المغرب',  flag: 'https://flagcdn.com/w40/ma.png' },
      { id: 'algeria', name: 'الجزائر', slug: 'الجزائر', flag: 'https://flagcdn.com/w40/dz.png' },
      { id: 'tunisia', name: 'تونس',    slug: 'تونس',    flag: 'https://flagcdn.com/w40/tn.png' },
      { id: 'libya',   name: 'ليبيا',   slug: 'ليبيا',   flag: 'https://flagcdn.com/w40/ly.png' },
    ],
  },
  {
    id: 'world',
    name: 'العالم',
    countries: [
      { id: 'usa',    name: 'أمريكا', slug: 'الولايات-المتحدة', flag: 'https://flagcdn.com/w40/us.png' },
      { id: 'china',  name: 'الصين',  slug: 'الصين',            flag: 'https://flagcdn.com/w40/cn.png' },
      { id: 'india',  name: 'الهند',  slug: 'الهند',            flag: 'https://flagcdn.com/w40/in.png' },
      { id: 'turkey', name: 'تركيا',  slug: 'تركيا',            flag: 'https://flagcdn.com/w40/tr.png' },
    ],
  },
];

type Country = typeof regions[0]['countries'][0];

function CountryContent({ country }: { country: Country }) {
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
        <p className="text-charcoal/50 font-[family-name:var(--font-display)]">لا توجد مقالات لهذا البلد حالياً.</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-px bg-sand/40 border border-sand/40">
      {/* Featured — full bleed image with overlay */}
      <a
        href={`/${featured.slug}`}
        className="relative overflow-hidden group block"
        style={{ minHeight: '18rem' }}
      >
        {featured.featuredImage ? (
          <img
            src={featured.featuredImage}
            alt={featured.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: 'var(--color-brand-800)' }} />
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(12,30,42,0.88) 0%, rgba(12,30,42,0.2) 60%, transparent 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Image src={country.flag} alt={country.name} width={24} height={16} className="object-cover" />
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

      {/* Article list */}
      <div className="bg-paper flex flex-col divide-y divide-sand">
        {rest.map((article) => (
          <a
            key={article.id}
            href={`/${article.slug}`}
            className="group flex gap-4 p-4 hover:bg-cream transition-colors flex-1"
          >
            {article.featuredImage && (
              <div className="flex-shrink-0 overflow-hidden" style={{ width: '4.5rem', height: '3.25rem' }}>
                <img
                  src={article.featuredImage}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
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
        <a
          href={`/countries/${country.slug}`}
          className="flex items-center justify-center gap-1 py-3 text-gold text-xs font-bold font-[family-name:var(--font-display)] hover:bg-cream transition-colors"
        >
          {t('components.countryNews.viewAllNews', { country: country.name })}
          <ArrowUpLeft size={13} />
        </a>
      </div>
    </div>
  );
}

export default function CountryNews() {
  const { t } = useTranslation();
  const [activeRegion, setActiveRegion] = useState(regions[0]);
  const [activeCountry, setActiveCountry] = useState(regions[0].countries[0]);

  function handleRegionChange(region: typeof regions[0]) {
    setActiveRegion(region);
    setActiveCountry(region.countries[0]);
  }

  return (
    <section className="bg-paper py-8 border-t border-charcoal/10">
      <div className="container-editorial">

        {/* Header */}
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

        {/* Region tabs */}
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

        {/* Country pills */}
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
                key={country.id}
                onClick={() => setActiveCountry(country)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-[family-name:var(--font-display)] border transition-all duration-200 ${
                  activeCountry.id === country.id
                    ? 'bg-obsidian text-white border-obsidian'
                    : 'bg-paper text-charcoal/60 border-sand hover:border-charcoal/30 hover:text-obsidian'
                }`}
              >
                <Image src={country.flag} alt={country.name} width={20} height={14} className="object-cover" />
                {country.name}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Articles */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCountry.id}
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
