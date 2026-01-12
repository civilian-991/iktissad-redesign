'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Clock, X, SlidersHorizontal } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const mockResults = [
  { id: 1, title: 'فتح السوق السعودي أمام جميع فئات المستثمرين الأجانب', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop', category: 'مال ومصارف', date: '11 يناير 2026', excerpt: 'أعلنت هيئة السوق المالية السعودية عن قرار تاريخي يتيح لجميع فئات المستثمرين الأجانب...' },
  { id: 2, title: 'الخطوط السعودية ثاني أكثر شركات الطيران انضباطاً عالمياً', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop', category: 'سياحة وطيران', date: '12 يناير 2026', excerpt: 'حققت الخطوط الجوية السعودية المركز الثاني عالمياً في التزام المواعيد...' },
  { id: 3, title: 'البنك المركزي المصري يسجل أعلى احتياطي نقد أجنبي', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop', category: 'مال ومصارف', date: '7 يناير 2026', excerpt: 'سجل احتياطي النقد الأجنبي في مصر مستوى قياسياً جديداً...' },
  { id: 4, title: 'OpenAI تطلق ChatGPT Health لمحادثات الصحة واللياقة', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop', category: 'تكنولوجيا', date: '9 يناير 2026', excerpt: 'أعلنت شركة OpenAI عن إطلاق ميزة جديدة متخصصة في الصحة...' },
  { id: 5, title: 'إفتتاح منتدى الأعمال المصري السوري في دمشق', image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop', category: 'اقتصاد عام', date: '11 يناير 2026', excerpt: 'افتتح في العاصمة السورية دمشق منتدى الأعمال المصري السوري...' },
  { id: 6, title: 'وزير الطاقة والمياه يشيد بمواقف دولة قطر الداعمة للبنان', image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=300&fit=crop', category: 'طاقة', date: '12 يناير 2026', excerpt: 'أكد وزير الطاقة والمياه على العلاقات المتميزة بين البلدين الشقيقين...' },
];

const categories = ['الكل', 'اقتصاد عام', 'مال ومصارف', 'طاقة', 'تكنولوجيا', 'سياحة وطيران'];
const sortOptions = ['الأحدث', 'الأكثر قراءة', 'الأكثر صلة'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [sortBy, setSortBy] = useState('الأحدث');
  const [showFilters, setShowFilters] = useState(false);

  const filteredResults = mockResults.filter(result => {
    const matchesQuery = query === '' || result.title.includes(query) || result.excerpt.includes(query);
    const matchesCategory = activeCategory === 'الكل' || result.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Search Hero */}
        <section className="bg-gradient-to-br from-navy via-navy-light to-navy py-16">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <h1 className="text-3xl font-[family-name:var(--font-display)] font-bold text-white text-center mb-8">
                البحث في الأخبار والمقالات
              </h1>

              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن الأخبار والمقالات..."
                  className="w-full px-6 py-5 pr-14 text-lg bg-white rounded-xl font-[family-name:var(--font-display)] text-navy placeholder:text-slate focus:outline-none focus:ring-4 focus:ring-gold/30 shadow-xl"
                  autoFocus
                />
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gold" size={24} />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate hover:text-navy"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-[family-name:var(--font-display)] transition-all ${
                      activeCategory === category
                        ? 'bg-gold text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Results */}
        <section className="py-12">
          <div className="container-luxury">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-slate">
                  {filteredResults.length} نتيجة
                  {query && <span className="text-navy font-semibold"> لـ "{query}"</span>}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-navy font-[family-name:var(--font-display)] text-sm md:hidden"
                >
                  <SlidersHorizontal size={16} />
                  فلترة
                </button>

                <div className="hidden md:flex items-center gap-2">
                  <span className="text-slate text-sm">ترتيب:</span>
                  {sortOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSortBy(option)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        sortBy === option
                          ? 'bg-navy text-white'
                          : 'bg-white text-slate hover:bg-navy/10'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Grid */}
            {filteredResults.length > 0 ? (
              <div className="space-y-6">
                {filteredResults.map((result, index) => (
                  <motion.a
                    key={result.id}
                    href={`/news/${result.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-6 bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-all group"
                  >
                    <div className="w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={result.image}
                        alt={result.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-gold/20 text-gold text-xs font-[family-name:var(--font-display)] font-semibold rounded">
                          {result.category}
                        </span>
                        <span className="text-slate text-xs flex items-center gap-1">
                          <Clock size={12} />
                          {result.date}
                        </span>
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg leading-snug group-hover:text-gold transition-colors mb-2">
                        {result.title}
                      </h3>
                      <p className="text-slate text-sm line-clamp-2">
                        {result.excerpt}
                      </p>
                    </div>
                  </motion.a>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <Search className="mx-auto text-slate mb-4" size={48} />
                <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-navy mb-2">
                  لم يتم العثور على نتائج
                </h3>
                <p className="text-slate">
                  جرب البحث بكلمات مختلفة أو تصفح الأقسام
                </p>
              </motion.div>
            )}

            {/* Load More */}
            {filteredResults.length > 0 && (
              <div className="text-center mt-12">
                <button className="px-8 py-3 bg-navy text-white rounded-lg font-[family-name:var(--font-display)] font-semibold hover:bg-navy-light transition-colors">
                  تحميل المزيد
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
