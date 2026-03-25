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
          <section className="py-14" style={{ background: '#F5EEDC' }}>
            <div className="container-luxury">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative overflow-hidden rounded-[4px]"
                style={{ background: '#183B4E' }}
              >
                {/* Subtle grain texture overlay */}
                <div
                  className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  }}
                />

                {/* Gold top border accent */}
                <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: 'linear-gradient(to right, transparent, #DDA853 30%, #DDA853 70%, transparent)' }} />

                <div className="relative grid lg:grid-cols-[1fr_420px] gap-0">
                  {/* Info side */}
                  <div className="p-10 lg:p-14 flex flex-col justify-center">
                    {/* Label */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-5 h-[2px]" style={{ background: '#DDA853' }} />
                      <span
                        className="text-xs font-[family-name:var(--font-display)] font-bold tracking-[0.18em] uppercase"
                        style={{ color: '#DDA853' }}
                      >
                        {t('pages.magazine.currentIssue')}
                      </span>
                      <div className="w-5 h-[2px]" style={{ background: '#DDA853' }} />
                    </div>

                    <h2
                      className="text-3xl lg:text-4xl font-[family-name:var(--font-display)] font-black text-white leading-tight mb-3"
                      style={{ letterSpacing: '-0.01em' }}
                    >
                      {featuredIssue.title}
                    </h2>

                    {(featuredIssue.subtitle) && (
                      <p className="text-lg font-[family-name:var(--font-display)] mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {featuredIssue.subtitle}
                      </p>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-6 mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      <span className="text-xs font-[family-name:var(--font-display)]">
                        {new Date(featuredIssue.publishDate).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long' })}
                      </span>
                      {featuredIssue.pages > 0 && (
                        <>
                          <span style={{ color: '#DDA853', opacity: 0.4 }}>·</span>
                          <span className="flex items-center gap-1.5 text-xs font-[family-name:var(--font-display)]">
                            <BookOpen size={13} />
                            {featuredIssue.pages} صفحة
                          </span>
                        </>
                      )}
                      {featuredIssue.views > 0 && (
                        <>
                          <span style={{ color: '#DDA853', opacity: 0.4 }}>·</span>
                          <span className="flex items-center gap-1.5 text-xs font-[family-name:var(--font-display)]">
                            <Eye size={13} />
                            {featuredIssue.views.toLocaleString()} قراءة
                          </span>
                        </>
                      )}
                    </div>

                    {featuredIssue.highlights?.length > 0 && (
                      <div className="mb-10">
                        <p className="text-[11px] font-[family-name:var(--font-display)] font-bold tracking-[0.15em] mb-4" style={{ color: '#DDA853' }}>
                          في هذا العدد
                        </p>
                        <ul className="space-y-2.5">
                          {featuredIssue.highlights.map((highlight, i) => (
                            <li key={i} className="flex items-start gap-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
                              <span
                                className="mt-[7px] flex-shrink-0 w-1 h-1 rounded-full"
                                style={{ background: '#DDA853' }}
                              />
                              <span className="text-sm font-[family-name:var(--font-display)] leading-relaxed">{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-3 flex-wrap">
                      <a
                        href={`/magazine/${featuredIssue.id}/browse`}
                        className="inline-flex items-center gap-2.5 px-7 py-3.5 font-[family-name:var(--font-display)] font-bold text-sm transition-all hover:brightness-110"
                        style={{
                          background: '#DDA853',
                          color: '#183B4E',
                          borderRadius: '3px',
                        }}
                      >
                        <BookOpen size={16} />
                        {t('pages.magazine.browse')}
                      </a>
                      {featuredIssue.pdfUrl && (
                        <a
                          href={featuredIssue.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2.5 px-7 py-3.5 font-[family-name:var(--font-display)] font-bold text-sm transition-all hover:bg-white/10"
                          style={{
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'rgba(255,255,255,0.8)',
                            borderRadius: '3px',
                          }}
                        >
                          <Download size={16} />
                          {t('pages.magazine.download')}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Cover image side */}
                  <div
                    className="relative flex items-center justify-center py-10 lg:py-14 px-10"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  >
                    {/* Ambient glow behind cover */}
                    <div
                      className="absolute inset-0 opacity-30 pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse at center, rgba(221,168,83,0.25) 0%, transparent 70%)',
                      }}
                    />

                    <motion.div
                      initial={{ opacity: 0, y: 16, rotateY: -8 }}
                      animate={{ opacity: 1, y: 0, rotateY: 0 }}
                      transition={{ delay: 0.25, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="relative"
                      style={{ perspective: '900px' }}
                    >
                      {/* Multi-layer book shadow */}
                      <div
                        className="absolute rounded-[2px]"
                        style={{
                          inset: 0,
                          transform: 'translate(6px, 10px)',
                          background: 'rgba(0,0,0,0.5)',
                          filter: 'blur(16px)',
                        }}
                      />
                      <div
                        className="absolute rounded-[2px]"
                        style={{
                          inset: 0,
                          transform: 'translate(2px, 4px)',
                          background: 'rgba(221,168,83,0.15)',
                          filter: 'blur(4px)',
                        }}
                      />

                      {featuredIssue.coverImage ? (
                        <img
                          src={featuredIssue.coverImage}
                          alt={featuredIssue.title}
                          className="relative w-56 lg:w-64 object-contain rounded-[2px]"
                          style={{
                            aspectRatio: '2/3',
                            boxShadow: 'inset -2px 0 0 rgba(221,168,83,0.5), 2px 0 8px rgba(0,0,0,0.4)',
                          }}
                        />
                      ) : (
                        <div
                          className="relative w-56 lg:w-64 flex items-center justify-center rounded-[2px]"
                          style={{
                            aspectRatio: '2/3',
                            background: '#1E4A60',
                            boxShadow: 'inset -2px 0 0 rgba(221,168,83,0.5)',
                          }}
                        >
                          <BookOpen className="text-[#DDA853]" size={48} />
                        </div>
                      )}

                      {/* Issue number overlay on cover */}
                      <div
                        className="absolute bottom-3 left-3 px-2 py-1 text-[10px] font-[family-name:var(--font-display)] font-bold"
                        style={{
                          background: 'rgba(24,59,78,0.85)',
                          color: '#DDA853',
                          borderRadius: '2px',
                          border: '1px solid rgba(221,168,83,0.3)',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        العدد {featuredIssue.issueNumber}
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Gold bottom border accent */}
                <div className="absolute bottom-0 inset-x-0 h-[1px]" style={{ background: 'linear-gradient(to right, transparent, rgba(221,168,83,0.4) 30%, rgba(221,168,83,0.4) 70%, transparent)' }} />
              </motion.div>
            </div>
          </section>
        )}

        {/* Archive */}
        {!isLoading && magazines.length > 0 && (
          <section className="py-16">
            <div className="container-luxury">
              {/* Filters */}
              <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-4 h-[2px] bg-[#DDA853]" />
                    <span className="text-[10px] font-[family-name:var(--font-display)] font-bold tracking-[0.18em] text-[#DDA853] uppercase">
                      أرشيف الأعداد
                    </span>
                  </div>
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-black text-navy">
                    {t('pages.magazine.pastIssues')}
                  </h2>
                </div>

                {years.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Filter size={14} className="text-[#DDA853] opacity-60 ml-1" />
                    <button
                      onClick={() => { setSelectedYear(null); setCurrentPage(1); }}
                      className="px-3.5 py-1.5 text-xs font-[family-name:var(--font-display)] font-bold transition-all rounded-[3px]"
                      style={selectedYear === null
                        ? { background: '#183B4E', color: '#DDA853', border: '1px solid rgba(221,168,83,0.4)' }
                        : { background: 'white', color: '#548490', border: '1px solid rgba(24,59,78,0.12)' }
                      }
                    >
                      الكل
                    </button>
                    {years.map(year => (
                      <button
                        key={year}
                        onClick={() => { setSelectedYear(year); setCurrentPage(1); }}
                        className="px-3.5 py-1.5 text-xs font-[family-name:var(--font-display)] font-bold transition-all rounded-[3px]"
                        style={selectedYear === year
                          ? { background: '#183B4E', color: '#DDA853', border: '1px solid rgba(221,168,83,0.4)' }
                          : { background: 'white', color: '#548490', border: '1px solid rgba(24,59,78,0.12)' }
                        }
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 lg:gap-7">
                {paginatedMagazines.map((magazine, index) => (
                  <motion.a
                    key={magazine.id}
                    href={`/magazine/${magazine.id}/browse`}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="group relative block"
                  >
                    {/* Book depth shadow layers */}
                    <div
                      className="absolute inset-0 rounded-[3px] translate-x-[3px] translate-y-[4px]"
                      style={{ background: 'rgba(24,59,78,0.22)', filter: 'blur(6px)' }}
                    />
                    <div
                      className="absolute inset-0 rounded-[3px] translate-x-[1px] translate-y-[2px]"
                      style={{ background: 'rgba(221,168,83,0.12)', filter: 'blur(2px)' }}
                    />

                    {/* Card body */}
                    <div
                      className="relative overflow-hidden rounded-[3px]"
                      style={{
                        boxShadow: '2px 2px 0 rgba(221,168,83,0.25), inset -1px 0 0 rgba(221,168,83,0.4)',
                      }}
                    >
                      {/* Cover image */}
                      <div className="aspect-[2/3] overflow-hidden" style={{ background: '#0e2a38' }}>
                        {magazine.coverImage ? (
                          <img
                            src={magazine.coverImage}
                            alt={magazine.title}
                            className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#183B4E] flex flex-col items-center justify-center gap-3">
                            <BookOpen className="text-[#DDA853]" size={36} />
                            <span className="text-[#DDA853]/60 text-xs font-[family-name:var(--font-display)]">
                              العدد {magazine.issueNumber}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Gold spine accent (right edge — RTL front cover) */}
                      <div
                        className="absolute inset-y-0 right-0 w-[3px]"
                        style={{
                          background: 'linear-gradient(to bottom, rgba(221,168,83,0.7) 0%, rgba(221,168,83,0.4) 40%, rgba(221,168,83,0.15) 100%)',
                        }}
                      />

                      {/* Issue number badge — top left */}
                      <div
                        className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-[family-name:var(--font-display)] font-bold tracking-wide"
                        style={{
                          background: 'rgba(24,59,78,0.82)',
                          color: '#DDA853',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '2px',
                          border: '1px solid rgba(221,168,83,0.3)',
                        }}
                      >
                        #{magazine.issueNumber}
                      </div>

                      {/* Always-visible date strip */}
                      <div
                        className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 py-2"
                        style={{
                          background: 'linear-gradient(to top, rgba(24,59,78,0.95) 0%, rgba(24,59,78,0.75) 100%)',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        <span
                          className="text-[11px] font-[family-name:var(--font-display)] font-semibold leading-none"
                          style={{ color: '#DDA853' }}
                        >
                          {new Date(magazine.publishDate).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'short' })}
                        </span>
                        {magazine.pages > 0 && (
                          <span className="text-white/40 text-[10px] font-[family-name:var(--font-display)]">
                            {magazine.pages}ص
                          </span>
                        )}
                      </div>

                      {/* Hover overlay — slides up from bottom */}
                      <div
                        className="absolute inset-0 flex flex-col justify-end p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500"
                        style={{
                          background: 'linear-gradient(to top, rgba(24,59,78,0.97) 0%, rgba(24,59,78,0.88) 60%, rgba(24,59,78,0.55) 100%)',
                          backdropFilter: 'blur(2px)',
                          transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        }}
                      >
                        {/* Gold divider */}
                        <div className="w-8 h-[2px] bg-[#DDA853] mb-3 mr-auto" />
                        <h3
                          className="font-[family-name:var(--font-display)] font-bold text-white text-sm leading-snug mb-1.5 line-clamp-3"
                        >
                          {magazine.title}
                        </h3>
                        <p className="text-[#DDA853] text-[11px] font-[family-name:var(--font-display)] mb-4">
                          {magazine.subtitle || new Date(magazine.publishDate).toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long' })}
                        </p>
                        <div
                          className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--font-display)] font-bold"
                          style={{ color: '#DDA853' }}
                        >
                          <BookOpen size={12} />
                          <span>تصفح العدد</span>
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
