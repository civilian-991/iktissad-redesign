'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, ChevronRight, ChevronLeft, Loader2, UserCircle2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';

const PAGE_SIZE = 24;

export default function ProfilesPageClient() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    `/api/articles?tag=profile&status=published&sortFeaturedFirst=true&pageSize=${PAGE_SIZE}&page=${page}`,
    swrFetcher
  );

  const profiles = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;

  const filtered = searchQuery
    ? profiles.filter(p => p.title.includes(searchQuery))
    : profiles;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-20 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider">
                شخصيات مؤثرة
              </span>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-4">
                {t('pages.profiles.title')}
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                {t('pages.profiles.subtitle')}
              </p>
              {total > 0 && (
                <p className="text-gold/80 text-sm mt-3 font-[family-name:var(--font-display)]">
                  {total} شخصية
                </p>
              )}
            </motion.div>
          </div>
        </section>

        {/* Search */}
        <section className="py-6 bg-ivory sticky top-[var(--header-offset-public)] z-20 border-b border-sand">
          <div className="container-luxury">
            <div className="relative w-full md:w-96 mx-auto">
              <input
                type="text"
                placeholder={t('common.actions.search')}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full px-4 py-3 pr-12 bg-white shadow-sm font-[family-name:var(--font-display)] text-navy placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-gold/30 rounded-lg"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gold" size={20} />
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="py-12">
          <div className="container-luxury">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="text-gold animate-spin" size={40} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-slate font-[family-name:var(--font-display)]">
                  لم يتم العثور على نتائج
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((profile, index) => (
                  <motion.a
                    key={profile.id}
                    href={`/${profile.slug}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.4) }}
                    whileHover={{ y: -6 }}
                    className="group"
                  >
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col">
                      {/* Image */}
                      <div className="relative h-64 overflow-hidden flex-shrink-0">
                        {profile.featuredImage ? (
                          <img
                            src={profile.featuredImage}
                            alt={profile.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-navy to-navy-light flex items-center justify-center">
                            <UserCircle2 className="text-white/30" size={64} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-transparent opacity-70" />
                      </div>

                      {/* Content */}
                      <div className="p-5 relative flex-1 flex flex-col">
                        <div className="absolute top-0 right-5 w-12 h-1 bg-gradient-to-l from-gold to-transparent -translate-y-0.5" />
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-base mb-2 group-hover:text-gold transition-colors line-clamp-2">
                          {profile.title}
                        </h3>
                        {profile.excerpt && (
                          <p className="text-xs text-charcoal leading-relaxed line-clamp-3 mt-auto">
                            {profile.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !searchQuery && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 border border-sand hover:border-gold text-graphite hover:text-gold flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
                <span className="text-sm text-graphite font-[family-name:var(--font-display)]">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 border border-sand hover:border-gold text-graphite hover:text-gold flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
