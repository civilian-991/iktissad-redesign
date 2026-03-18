'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, ArrowUpLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

// Regions are editorial structure — countries mapped to their DB slugs
const regions = [
  {
    id: 'gulf',
    name: 'الخليج',
    countries: [
      { id: 'saudi', name: 'السعودية', slug: 'السعودية', flag: 'https://flagcdn.com/w40/sa.png' },
      { id: 'uae',   name: 'الإمارات', slug: 'الإمارات', flag: 'https://flagcdn.com/w40/ae.png' },
      { id: 'qatar', name: 'قطر',      slug: 'قطر',       flag: 'https://flagcdn.com/w40/qa.png' },
      { id: 'kuwait',  name: 'الكويت',  slug: 'الكويت',   flag: 'https://flagcdn.com/w40/kw.png' },
      { id: 'bahrain', name: 'البحرين', slug: 'البحرين',  flag: 'https://flagcdn.com/w40/bh.png' },
      { id: 'oman',    name: 'عُمان',   slug: 'عُمان',    flag: 'https://flagcdn.com/w40/om.png' },
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
      { id: 'china',  name: 'الصين',  slug: 'الصين',  flag: 'https://flagcdn.com/w40/cn.png' },
      { id: 'india',  name: 'الهند',  slug: 'الهند',  flag: 'https://flagcdn.com/w40/in.png' },
      { id: 'turkey', name: 'تركيا',  slug: 'تركيا',  flag: 'https://flagcdn.com/w40/tr.png' },
    ],
  },
];

type Country = typeof regions[0]['countries'][0];

function CountryContent({ country, regionName }: { country: Country; regionName: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    `/api/articles?country=${encodeURIComponent(country.slug)}&status=published&pageSize=4`,
    swrFetcher
  );
  const articles = data?.data ?? [];
  const featured = articles[0];
  const rest = articles.slice(1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-gold animate-spin" size={40} />
      </div>
    );
  }

  if (!featured) {
    return (
      <div className="text-center py-20">
        <p className="text-white/50 font-[family-name:var(--font-display)]">لا توجد مقالات لهذا البلد حالياً.</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Featured Article */}
      <a href={`/news/${featured.slug}`} className="relative h-96 lg:h-auto min-h-[400px] overflow-hidden group block">
        {featured.featuredImage ? (
          <img
            src={featured.featuredImage}
            alt={featured.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 absolute inset-0"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-navy to-navy-light" />
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-white/5 backdrop-blur-md border-t border-white/10 p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-3">
            <img src={country.flag} alt={country.name} className="w-8 h-5 object-cover rounded-sm" />
            <span className="text-white/70 font-[family-name:var(--font-display)] text-xs">{regionName}</span>
            <span className="text-white/30 text-xs">/</span>
            <span className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">{country.name}</span>
          </div>
          <h3 className="text-xl lg:text-2xl font-[family-name:var(--font-display)] font-bold leading-tight mb-4 text-gold-light">
            {featured.title}
          </h3>
          {featured.publishedAt && (
            <span className="text-white text-sm flex items-center gap-2">
              <Clock size={14} />
              {new Date(featured.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
            </span>
          )}
        </div>
      </a>

      {/* Article List */}
      <div className="space-y-4">
        {rest.map((article, index) => (
          <motion.a
            key={article.id}
            href={`/news/${article.slug}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="block bg-white/5 backdrop-blur-sm p-6 border border-white/10 hover:bg-white/10 hover:border-gold/30 transition-all duration-300 group"
          >
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 w-10 h-10 bg-gold/20 text-gold flex items-center justify-center font-[family-name:var(--font-display)] font-bold">
                {index + 2}
              </span>
              <div className="flex-1">
                <h4 className="font-[family-name:var(--font-display)] font-bold text-white leading-snug group-hover:text-gold transition-colors duration-300">
                  {article.title}
                </h4>
                {article.publishedAt && (
                  <span className="text-white/70 text-sm mt-2 flex items-center gap-2">
                    <Clock size={14} />
                    {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                  </span>
                )}
              </div>
              <ArrowUpLeft size={20} className="text-gold/50 group-hover:text-gold transition-colors duration-300 flex-shrink-0" />
            </div>
          </motion.a>
        ))}

        <a
          href={`/countries/${country.slug}`}
          className="flex items-center justify-center gap-2 w-full py-4 border border-dashed border-gold/30 text-gold font-[family-name:var(--font-display)] font-semibold hover:border-gold hover:bg-gold/10 transition-all duration-300"
        >
          {t('components.countryNews.viewAllNews', { country: country.name })}
          <ArrowUpLeft size={18} />
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
    <section className="py-20 bg-gradient-to-br from-navy via-navy-light to-navy relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

      <div className="container-luxury relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider">
            {t('components.countryNews.subtitle')}
          </span>
          <h2 className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold mt-2 mb-4 text-white">
            {t('components.countryNews.title')}
          </h2>
          <div className="flex items-center justify-center gap-3 text-gold/50">
            <span className="w-16 h-px bg-gradient-to-r from-transparent to-gold/50" />
            <MapPin size={20} className="text-gold" />
            <span className="w-16 h-px bg-gradient-to-l from-transparent to-gold/50" />
          </div>
        </motion.div>

        {/* Region Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {regions.map((region) => (
            <button
              key={region.id}
              onClick={() => handleRegionChange(region)}
              className={`px-6 py-2.5 font-[family-name:var(--font-display)] font-bold text-sm transition-all duration-300 border-b-2 ${
                activeRegion.id === region.id
                  ? 'text-gold border-gold'
                  : 'text-white/60 border-transparent hover:text-white hover:border-white/30'
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>

        <div className="w-full h-px bg-white/10 mb-6" />

        {/* Country Tabs */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRegion.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {activeRegion.countries.map((country) => (
              <motion.button
                key={country.id}
                onClick={() => setActiveCountry(country)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full font-[family-name:var(--font-display)] font-semibold text-sm flex items-center gap-2 transition-all duration-300 ${
                  activeCountry.id === country.id
                    ? 'bg-gold text-navy shadow-gold'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                <img src={country.flag} alt={country.name} className="w-5 h-3.5 object-cover rounded-sm" />
                {country.name}
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Country Articles */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCountry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CountryContent country={activeCountry} regionName={activeRegion.name} />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
