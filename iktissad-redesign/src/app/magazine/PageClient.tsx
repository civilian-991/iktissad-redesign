'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Eye, Download, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { MagazineIssue, ApiResponse } from '@/types';

export default function MagazinePageClient() {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { data, isLoading, error } = useSWR<ApiResponse<MagazineIssue[]>>(
    '/api/magazines?status=published&pageSize=100',
    swrFetcher
  );

  const magazines = data?.data ?? [];
  const featuredIssue = magazines.find(m => m.featured) ?? magazines[0];

  // Derive year list from actual data
  const years = Array.from(
    new Set(magazines.map(m => new Date(m.publishDate).getFullYear()))
  ).sort((a, b) => b - a);

  const filteredMagazines = selectedYear
    ? magazines.filter(m => new Date(m.publishDate).getFullYear() === selectedYear)
    : magazines;

  const totalPages = Math.ceil(filteredMagazines.length / itemsPerPage);
  const paginatedMagazines = filteredMagazines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
                <BookOpen className="text-gold" size={32} />
                <span className="text-gold font-[family-name:var(--font-display)] font-semibold">
                  أرشيف المجلة
                </span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mb-4">
                {t('pages.magazine.subtitle')}
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                أكثر من 65 عاماً من التميز في الصحافة الاقتصادية العربية. تصفح أعدادنا الرقمية
              </p>
            </motion.div>
          </div>
        </section>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="text-gold animate-spin" size={48} />
          </div>
        )}

        {error && (
          <div className="text-center py-24">
            <p className="text-charcoal text-lg">تعذّر تحميل الأعداد. حاول مجدداً.</p>
          </div>
        )}

        {/* Featured Issue */}
        {!isLoading && featuredIssue && (
          <section className="py-16 bg-ivory">
            <div className="container-luxury">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden"
              >
                <div className="grid lg:grid-cols-2 gap-0">
                  {/* Cover */}
                  <div className="relative bg-gradient-to-br from-navy to-navy-light p-12 flex items-center justify-center">
                    <div className="absolute top-4 right-4 px-4 py-2 bg-gold text-white text-sm font-[family-name:var(--font-display)] font-bold rounded-full">
                      {t('pages.magazine.currentIssue')}
                    </div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-lg" />
                      {featuredIssue.coverImage ? (
                        <img
                          src={featuredIssue.coverImage}
                          alt={featuredIssue.title}
                          className="relative w-64 h-80 object-cover rounded-lg shadow-2xl"
                        />
                      ) : (
                        <div className="relative w-64 h-80 bg-navy-light rounded-lg shadow-2xl flex items-center justify-center">
                          <BookOpen className="text-gold" size={64} />
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* Info */}
                  <div className="p-12 flex flex-col justify-center">
                    <span className="text-gold font-[family-name:var(--font-display)] font-semibold mb-2">
                      {featuredIssue.subtitle || new Date(featuredIssue.publishDate).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long' })}
                    </span>
                    <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                      {featuredIssue.title}
                    </h2>

                    <div className="flex items-center gap-6 mb-6 text-slate">
                      {featuredIssue.pages > 0 && (
                        <span className="flex items-center gap-2">
                          <BookOpen size={18} />
                          {featuredIssue.pages} صفحة
                        </span>
                      )}
                      {featuredIssue.views > 0 && (
                        <span className="flex items-center gap-2">
                          <Eye size={18} />
                          {featuredIssue.views.toLocaleString()} قراءة
                        </span>
                      )}
                    </div>

                    {featuredIssue.highlights?.length > 0 && (
                      <div className="mb-8">
                        <h4 className="font-[family-name:var(--font-display)] font-bold text-navy mb-3">
                          في هذا العدد:
                        </h4>
                        <ul className="space-y-2">
                          {featuredIssue.highlights.map((highlight, i) => (
                            <li key={i} className="flex items-center gap-2 text-charcoal">
                              <div className="w-2 h-2 rounded-full bg-gold" />
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <a
                        href={`/magazine/${featuredIssue.id}/browse`}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gold text-white rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-gold-dark transition-colors"
                      >
                        <BookOpen size={20} />
                        {t('pages.magazine.browse')}
                      </a>
                      {featuredIssue.pdfUrl && (
                        <a
                          href={featuredIssue.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-navy text-navy rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-navy hover:text-white transition-colors"
                        >
                          <Download size={20} />
                          {t('pages.magazine.download')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Archive */}
        {!isLoading && magazines.length > 0 && (
          <section className="py-16">
            <div className="container-luxury">
              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
                <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy">
                  {t('pages.magazine.pastIssues')}
                </h2>

                {years.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate" />
                    <span className="text-slate text-sm ml-2">فلترة حسب السنة:</span>
                    <button
                      onClick={() => { setSelectedYear(null); setCurrentPage(1); }}
                      className={`px-4 py-2 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all ${
                        selectedYear === null ? 'bg-navy text-white' : 'bg-white text-slate hover:bg-navy/10'
                      }`}
                    >
                      الكل
                    </button>
                    {years.map(year => (
                      <button
                        key={year}
                        onClick={() => { setSelectedYear(year); setCurrentPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all ${
                          selectedYear === year ? 'bg-navy text-white' : 'bg-white text-slate hover:bg-navy/10'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {paginatedMagazines.map((magazine, index) => (
                  <motion.a
                    key={magazine.id}
                    href={`/magazine/${magazine.id}/browse`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <div className="relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
                      <div className="relative aspect-[3/4] overflow-hidden">
                        {magazine.coverImage ? (
                          <img
                            src={magazine.coverImage}
                            alt={magazine.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full bg-navy-light flex items-center justify-center">
                            <BookOpen className="text-gold" size={40} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="px-6 py-3 bg-gold text-white rounded-lg font-[family-name:var(--font-display)] font-bold flex items-center gap-2">
                            <BookOpen size={18} />
                            تصفح
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-1">
                          {magazine.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gold font-semibold">
                            {magazine.subtitle || new Date(magazine.publishDate).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long' })}
                          </span>
                          {magazine.views > 0 && (
                            <span className="text-slate flex items-center gap-1">
                              <Eye size={14} />
                              {(magazine.views / 1000).toFixed(1)}K
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-navy hover:text-white transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg font-[family-name:var(--font-display)] font-bold transition-all ${
                        currentPage === page ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-navy/10'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-navy hover:text-white transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Subscribe CTA */}
        <section className="py-16 bg-navy">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <BookOpen className="mx-auto text-gold mb-4" size={48} />
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-white mb-4">
                {t('pages.magazine.subscribe')}
              </h2>
              <p className="text-white/70 mb-8">
                احصل على وصول غير محدود لجميع أعداد المجلة الحالية والسابقة
              </p>
              <a
                href="/subscribe"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-white rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-gold-dark transition-colors"
              >
                {t('common.actions.subscribe')}
              </a>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
