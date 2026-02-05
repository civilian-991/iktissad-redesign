'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, TrendingUp, Building2, Users, ChevronLeft, ChevronRight, Filter, Grid3X3, List } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const countriesData: Record<string, { name: string; flag: string; image: string; description: string; gdp: string; capital: string; population: string }> = {
  saudi: { name: 'المملكة العربية السعودية', flag: '🇸🇦', image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1200&h=600&fit=crop', description: 'أخبار الاقتصاد السعودي ورؤية 2030', gdp: '1.1 تريليون دولار', capital: 'الرياض', population: '35 مليون' },
  uae: { name: 'الإمارات العربية المتحدة', flag: '🇦🇪', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&h=600&fit=crop', description: 'مركز الأعمال والسياحة في المنطقة', gdp: '507 مليار دولار', capital: 'أبوظبي', population: '10 مليون' },
  egypt: { name: 'جمهورية مصر العربية', flag: '🇪🇬', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1200&h=600&fit=crop', description: 'أكبر اقتصاد عربي من حيث السكان', gdp: '476 مليار دولار', capital: 'القاهرة', population: '104 مليون' },
  lebanon: { name: 'الجمهورية اللبنانية', flag: '🇱🇧', image: 'https://images.unsplash.com/photo-1579606032821-4e6161c81571?w=1200&h=600&fit=crop', description: 'مركز مالي وثقافي تاريخي', gdp: '23 مليار دولار', capital: 'بيروت', population: '5.5 مليون' },
  qatar: { name: 'دولة قطر', flag: '🇶🇦', image: 'https://images.unsplash.com/photo-1548972150-3c1d2e6f5176?w=1200&h=600&fit=crop', description: 'أعلى دخل للفرد في العالم', gdp: '221 مليار دولار', capital: 'الدوحة', population: '2.9 مليون' },
  kuwait: { name: 'دولة الكويت', flag: '🇰🇼', image: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=1200&h=600&fit=crop', description: 'ثروة نفطية وصندوق سيادي عريق', gdp: '175 مليار دولار', capital: 'الكويت', population: '4.3 مليون' },
};

const articles = [
  { id: 1, title: 'فتح السوق السعودي أمام جميع فئات المستثمرين الأجانب اعتباراً من أول فبراير 2026', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop', date: '11 يناير 2026', category: 'مال ومصارف', featured: true },
  { id: 2, title: 'الخطوط السعودية ثاني أكثر شركات الطيران انضباطاً عالمياً', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop', date: '12 يناير 2026', category: 'سياحة وطيران' },
  { id: 3, title: 'الإعلان عن أسماء الفائزين في جائزة الملك فيصل', image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop', date: '9 يناير 2026', category: 'مجتمع' },
  { id: 4, title: 'أرامكو تعلن عن استثمارات جديدة في الطاقة المتجددة', image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&h=400&fit=crop', date: '8 يناير 2026', category: 'طاقة' },
  { id: 5, title: 'صندوق الاستثمارات العامة يستحوذ على حصة في شركة عالمية', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop', date: '7 يناير 2026', category: 'استثمار' },
  { id: 6, title: 'مشروع نيوم يكشف عن مرحلة جديدة من التطوير', image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop', date: '6 يناير 2026', category: 'عقار وإنشاءات' },
  { id: 7, title: 'البنك المركزي السعودي يعلن عن سياسات نقدية جديدة', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop', date: '5 يناير 2026', category: 'مال ومصارف' },
  { id: 8, title: 'السعودية تستضيف معرض إكسبو 2030', image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&h=400&fit=crop', date: '4 يناير 2026', category: 'سياحة وطيران' },
];

export default function CountryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  const slug = 'saudi';
  const country = countriesData[slug] || countriesData.saudi;

  const featuredArticle = articles.find(a => a.featured);
  const regularArticles = articles.filter(a => !a.featured);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative h-[50vh] overflow-hidden">
          <img
            src={country.image}
            alt={country.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/60 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 pb-12">
            <div className="container-luxury">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-6xl">{country.flag}</span>
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white">
                      {country.name}
                    </h1>
                    <p className="text-white/70 text-lg mt-2">
                      {country.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-navy py-6">
          <div className="container-luxury">
            <div className="grid grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 text-gold mb-1">
                  <TrendingUp size={18} />
                  <span className="font-[family-name:var(--font-display)] text-sm">الناتج المحلي</span>
                </div>
                <span className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
                  {country.gdp}
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 text-gold mb-1">
                  <Building2 size={18} />
                  <span className="font-[family-name:var(--font-display)] text-sm">العاصمة</span>
                </div>
                <span className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
                  {country.capital}
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 text-gold mb-1">
                  <Users size={18} />
                  <span className="font-[family-name:var(--font-display)] text-sm">السكان</span>
                </div>
                <span className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
                  {country.population}
                </span>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container-luxury">
            {/* Featured Article */}
            {featuredArticle && (
              <motion.a
                href={`/news/${featuredArticle.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="block mb-12"
              >
                <div className="relative h-[400px] rounded-2xl overflow-hidden group">
                  <img
                    src={featuredArticle.image}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <span className="news-tag mb-4">{featuredArticle.category}</span>
                    <h2 className="text-2xl lg:text-3xl font-[family-name:var(--font-display)] font-bold text-white leading-tight mb-4 group-hover:text-gold transition-colors">
                      {featuredArticle.title}
                    </h2>
                    <span className="text-white/60 text-sm flex items-center gap-2">
                      <Clock size={16} />
                      {featuredArticle.date}
                    </span>
                  </div>
                </div>
              </motion.a>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-navy font-[family-name:var(--font-display)] text-sm">
                  <Filter size={16} />
                  فلترة حسب القطاع
                </button>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gold text-white' : 'text-slate'}`}
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-gold text-white' : 'text-slate'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {/* Articles Grid */}
            <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {regularArticles.map((article, index) => (
                <motion.a
                  key={article.id}
                  href={`/news/${article.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group ${viewMode === 'list' ? 'flex gap-6 bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-shadow' : ''}`}
                >
                  {viewMode === 'grid' ? (
                    <div className="card-luxury">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <span className="absolute top-3 right-3 px-3 py-1 bg-gold text-white text-xs font-[family-name:var(--font-display)] font-semibold rounded">
                          {article.category}
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy leading-snug line-clamp-2 group-hover:text-gold transition-colors mb-3">
                          {article.title}
                        </h3>
                        <span className="text-slate text-sm flex items-center gap-1">
                          <Clock size={14} />
                          {article.date}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-40 h-28 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-gold text-xs font-[family-name:var(--font-display)] font-semibold">
                          {article.category}
                        </span>
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy group-hover:text-gold transition-colors mb-2">
                          {article.title}
                        </h3>
                        <span className="text-slate text-sm flex items-center gap-1">
                          <Clock size={14} />
                          {article.date}
                        </span>
                      </div>
                    </>
                  )}
                </motion.a>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-navy hover:bg-gold hover:text-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              {[1, 2, 3, 4, 5].map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg font-[family-name:var(--font-display)] font-semibold transition-colors ${
                    currentPage === page
                      ? 'bg-gold text-white'
                      : 'bg-white shadow-sm text-navy hover:bg-gold hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(5, p + 1))}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-navy hover:bg-gold hover:text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
