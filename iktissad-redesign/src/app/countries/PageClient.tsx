'use client';

import { motion } from 'motion/react';
import { MapPin, ArrowUpLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse, Country } from '@/types';
import type { CountryRegion } from '@/lib/countries';

interface CountriesPageClientProps {
  /** Scope the page to one region of جغرافيا الاقتصاد. Omitted = all countries. */
  region?: CountryRegion;
}

export default function CountriesPageClient({ region }: CountriesPageClientProps = {}) {
  const { t } = useTranslation();

  const { data, isLoading } = useSWR<ApiResponse<Country[]>>(
    region ? `/api/countries?region=${region}` : '/api/countries',
    swrFetcher
  );

  // Only show countries that have published articles (articleCount comes from
  // /api/countries — published, non-archived). Hides the bulk of the full
  // ISO-3166 list that has no coverage yet, and the 'world' placeholder row.
  const countries = (data?.data ?? []).filter(
    (c) => (c.articleCount ?? 0) > 0 && c.slug !== 'world'
  );

  const heading = region ? t(`nav.regions.${region}`) : t('pages.countries.title');

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
              <div className="flex items-center justify-center gap-3 mb-4">
                <MapPin className="text-gold" size={24} />
                <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider">
                  {t('nav.main.geography')}
                </span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-4">
                {heading}
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                تغطية اقتصادية شاملة للدول العربية والشرق الأوسط
              </p>
            </motion.div>
          </div>
        </section>

        {/* Countries Grid */}
        <section className="py-16">
          <div className="container-luxury">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-80 rounded-2xl bg-white/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {countries.map((country, index) => (
                    <motion.a
                      key={country.slug}
                      href={`/countries/${country.slug}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -8 }}
                      className="group relative rounded-2xl overflow-hidden h-80 bg-gradient-to-br from-navy via-navy-light to-navy"
                    >
                      {/* Decorative pattern + bottom gradient for text contrast */}
                      <div className="absolute inset-0 star-pattern opacity-20" />
                      <div className="absolute -top-10 -right-10 w-48 h-48 bg-gold/10 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125" />
                      <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/50 to-transparent" />

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-xl text-white mb-2 group-hover:text-gold transition-colors">
                          {country.name}
                        </h3>
                        {country.economicOverview && (
                          <p className="text-white/70 text-sm mb-4 line-clamp-2">
                            {country.economicOverview}
                          </p>
                        )}

                        {/* Article Count */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                          <span className="text-white/60 text-sm font-[family-name:var(--font-display)]">
                            {(country.articleCount ?? 0).toLocaleString('ar-SA-u-ca-gregory-nu-latn')} مقال
                          </span>
                          <span className="flex items-center gap-1 text-gold text-sm font-[family-name:var(--font-display)] font-semibold">
                            استكشف
                            <ArrowUpLeft size={16} />
                          </span>
                        </div>
                      </div>
                    </motion.a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Map Section (Decorative) */}
        <section className="py-16 bg-ivory">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-ink mb-4">
                تغطيتنا الجغرافية
              </h2>
              <p className="text-slate max-w-2xl mx-auto">
                نغطي أخبار الاقتصاد والأعمال من جميع أنحاء العالم العربي والشرق الأوسط
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {countries.slice(0, 10).map((country, index) => (
                <motion.a
                  key={country.slug}
                  href={`/countries/${country.slug}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-lg transition-all text-center"
                >
                  <span className="font-[family-name:var(--font-display)] font-semibold text-ink text-sm">
                    {country.name}
                  </span>
                </motion.a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
