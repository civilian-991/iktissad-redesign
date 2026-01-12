'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Calendar, Eye, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const magazines = [
  {
    id: 'AR0542',
    title: 'العدد 542',
    subtitle: 'يناير 2026',
    cover: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=560&fit=crop',
    year: 2026,
    month: 'يناير',
    pages: 84,
    views: 12500,
    featured: true,
    highlights: ['توقعات الاقتصاد العربي 2026', 'مقابلة حصرية مع وزير المالية السعودي', 'ملف خاص: مستقبل التقنية المالية']
  },
  {
    id: 'AR0541',
    title: 'العدد 541',
    subtitle: 'ديسمبر 2025',
    cover: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=560&fit=crop',
    year: 2025,
    month: 'ديسمبر',
    pages: 78,
    views: 15200,
    featured: false,
    highlights: ['أفضل 100 شركة عربية', 'قمة المناخ وتأثيرها على الاقتصاد']
  },
  {
    id: 'AR0540',
    title: 'العدد 540',
    subtitle: 'نوفمبر 2025',
    cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=560&fit=crop',
    year: 2025,
    month: 'نوفمبر',
    pages: 72,
    views: 11800,
    featured: false,
    highlights: ['الاستثمار في العقارات', 'أسواق الخليج']
  },
  {
    id: 'AR0539',
    title: 'العدد 539',
    subtitle: 'أكتوبر 2025',
    cover: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=560&fit=crop',
    year: 2025,
    month: 'أكتوبر',
    pages: 80,
    views: 13400,
    featured: false,
    highlights: ['مؤتمر صندوق النقد الدولي', 'البنوك المركزية العربية']
  },
  {
    id: 'AR0538',
    title: 'العدد 538',
    subtitle: 'سبتمبر 2025',
    cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=560&fit=crop',
    year: 2025,
    month: 'سبتمبر',
    pages: 76,
    views: 10200,
    featured: false,
    highlights: ['الطاقة المتجددة', 'رؤية 2030']
  },
  {
    id: 'AR0537',
    title: 'العدد 537',
    subtitle: 'أغسطس 2025',
    cover: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=560&fit=crop',
    year: 2025,
    month: 'أغسطس',
    pages: 68,
    views: 9800,
    featured: false,
    highlights: ['السياحة العربية', 'أسواق العمل']
  },
  {
    id: 'AR0536',
    title: 'العدد 536',
    subtitle: 'يوليو 2025',
    cover: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=560&fit=crop',
    year: 2025,
    month: 'يوليو',
    pages: 74,
    views: 11100,
    featured: false,
    highlights: ['التحول الرقمي', 'الشركات الناشئة']
  },
  {
    id: 'AR0535',
    title: 'العدد 535',
    subtitle: 'يونيو 2025',
    cover: 'https://images.unsplash.com/photo-1553484771-371a605b060b?w=400&h=560&fit=crop',
    year: 2025,
    month: 'يونيو',
    pages: 82,
    views: 12300,
    featured: false,
    highlights: ['النفط والغاز', 'التجارة العربية']
  },
];

const years = [2026, 2025, 2024, 2023, 2022];

export default function MagazinePage() {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredMagazines = selectedYear
    ? magazines.filter(m => m.year === selectedYear)
    : magazines;

  const totalPages = Math.ceil(filteredMagazines.length / itemsPerPage);
  const paginatedMagazines = filteredMagazines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const featuredIssue = magazines.find(m => m.featured);

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
                مجلة الإقتصاد والأعمال
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                أكثر من 65 عاماً من التميز في الصحافة الاقتصادية العربية. تصفح أعدادنا الرقمية
              </p>
            </motion.div>
          </div>
        </section>

        {/* Featured Issue */}
        {featuredIssue && (
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
                      العدد الأخير
                    </div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-lg" />
                      <img
                        src={featuredIssue.cover}
                        alt={featuredIssue.title}
                        className="relative w-64 h-80 object-cover rounded-lg shadow-2xl"
                      />
                    </motion.div>
                  </div>

                  {/* Info */}
                  <div className="p-12 flex flex-col justify-center">
                    <span className="text-gold font-[family-name:var(--font-display)] font-semibold mb-2">
                      {featuredIssue.subtitle}
                    </span>
                    <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                      {featuredIssue.title}
                    </h2>

                    <div className="flex items-center gap-6 mb-6 text-slate">
                      <span className="flex items-center gap-2">
                        <BookOpen size={18} />
                        {featuredIssue.pages} صفحة
                      </span>
                      <span className="flex items-center gap-2">
                        <Eye size={18} />
                        {featuredIssue.views.toLocaleString()} قراءة
                      </span>
                    </div>

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

                    <div className="flex gap-4">
                      <a
                        href={`/magazine/${featuredIssue.id}/browse`}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gold text-white rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-gold-dark transition-colors"
                      >
                        <BookOpen size={20} />
                        تصفح العدد
                      </a>
                      <button className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-navy text-navy rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-navy hover:text-white transition-colors">
                        <Download size={20} />
                        تحميل PDF
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Archive */}
        <section className="py-16">
          <div className="container-luxury">
            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy">
                أرشيف الأعداد
              </h2>

              <div className="flex items-center gap-2">
                <Filter size={18} className="text-slate" />
                <span className="text-slate text-sm ml-2">فلترة حسب السنة:</span>
                <button
                  onClick={() => { setSelectedYear(null); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all ${
                    selectedYear === null
                      ? 'bg-navy text-white'
                      : 'bg-white text-slate hover:bg-navy/10'
                  }`}
                >
                  الكل
                </button>
                {years.map(year => (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-[family-name:var(--font-display)] transition-all ${
                      selectedYear === year
                        ? 'bg-navy text-white'
                        : 'bg-white text-slate hover:bg-navy/10'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
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
                    {/* Cover Image */}
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={magazine.cover}
                        alt={magazine.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="px-6 py-3 bg-gold text-white rounded-lg font-[family-name:var(--font-display)] font-bold flex items-center gap-2">
                          <BookOpen size={18} />
                          تصفح
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-1">
                        {magazine.title}
                      </h3>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gold font-semibold">{magazine.subtitle}</span>
                        <span className="text-slate flex items-center gap-1">
                          <Eye size={14} />
                          {(magazine.views / 1000).toFixed(1)}K
                        </span>
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
                      currentPage === page
                        ? 'bg-navy text-white'
                        : 'bg-white text-navy hover:bg-navy/10'
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
                اشترك للوصول الكامل
              </h2>
              <p className="text-white/70 mb-8">
                احصل على وصول غير محدود لجميع أعداد المجلة الحالية والسابقة
              </p>
              <a
                href="/subscribe"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-white rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-gold-dark transition-colors"
              >
                اشترك الآن
              </a>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
