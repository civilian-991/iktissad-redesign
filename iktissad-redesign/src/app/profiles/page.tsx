'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Quote } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const categories = ['الكل', 'قادة', 'قادة الأعمال', 'رائدات أعمال', 'قادة التقنية', 'المصرفيون'];

const profiles = [
  {
    id: 1,
    name: 'محمد بن سلمان آل سعود',
    title: 'ولي العهد السعودي',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop',
    quote: 'رؤية 2030 ستجعل السعودية نموذجاً رائداً في العالم على جميع الأصعدة',
    category: 'قادة',
    country: 'السعودية'
  },
  {
    id: 2,
    name: 'ياسر الرميان',
    title: 'محافظ صندوق الاستثمارات العامة',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop',
    quote: 'نهدف إلى تنويع مصادر الدخل وخلق فرص استثمارية مستدامة',
    category: 'قادة الأعمال',
    country: 'السعودية'
  },
  {
    id: 3,
    name: 'لطيفة الشعلان',
    title: 'عضو مجلس إدارة أرامكو',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=500&fit=crop',
    quote: 'المرأة السعودية أصبحت شريكاً أساسياً في بناء اقتصاد المملكة',
    category: 'رائدات أعمال',
    country: 'السعودية'
  },
  {
    id: 4,
    name: 'عبدالله الغفيص',
    title: 'الرئيس التنفيذي لـ stc',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop',
    quote: 'التحول الرقمي هو مستقبل الاقتصاد العربي',
    category: 'قادة التقنية',
    country: 'السعودية'
  },
  {
    id: 5,
    name: 'محمد العبار',
    title: 'مؤسس إعمار العقارية',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=500&fit=crop',
    quote: 'الابتكار هو مفتاح النجاح في عالم الأعمال',
    category: 'قادة الأعمال',
    country: 'الإمارات'
  },
  {
    id: 6,
    name: 'رجاء القرق',
    title: 'سيدة أعمال إماراتية',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=500&fit=crop',
    quote: 'نجاح المرأة في الأعمال يعكس تطور المجتمع',
    category: 'رائدات أعمال',
    country: 'الإمارات'
  },
  {
    id: 7,
    name: 'نجيب ساويرس',
    title: 'رئيس أوراسكوم',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop',
    quote: 'الاستثمار في الشباب هو استثمار في المستقبل',
    category: 'قادة الأعمال',
    country: 'مصر'
  },
  {
    id: 8,
    name: 'طارق عامر',
    title: 'محافظ البنك المركزي المصري السابق',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop',
    quote: 'الإصلاح الاقتصادي يتطلب قرارات جريئة',
    category: 'المصرفيون',
    country: 'مصر'
  },
  {
    id: 9,
    name: 'مي الصباح',
    title: 'رائدة أعمال كويتية',
    image: 'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=400&h=500&fit=crop',
    quote: 'الإبداع ليس له حدود',
    category: 'رائدات أعمال',
    country: 'الكويت'
  },
  {
    id: 10,
    name: 'سعود العبدالله',
    title: 'الرئيس التنفيذي لبنك قطر الوطني',
    image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=500&fit=crop',
    quote: 'التميز هو معيارنا الوحيد',
    category: 'المصرفيون',
    country: 'قطر'
  },
  {
    id: 11,
    name: 'فيصل الإبراهيم',
    title: 'وزير الاقتصاد السعودي',
    image: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=500&fit=crop',
    quote: 'اقتصاد المملكة يشهد تحولاً تاريخياً',
    category: 'قادة',
    country: 'السعودية'
  },
  {
    id: 12,
    name: 'هدى المطري',
    title: 'رائدة في مجال التقنية',
    image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=500&fit=crop',
    quote: 'التقنية تفتح آفاقاً جديدة للمرأة العربية',
    category: 'قادة التقنية',
    country: 'السعودية'
  }
];

export default function ProfilesPage() {
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProfiles = profiles.filter(profile => {
    const matchesCategory = activeCategory === 'الكل' || profile.category === activeCategory;
    const matchesSearch = profile.name.includes(searchQuery) || profile.title.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
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
                بروفايل
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                قادة الأعمال والشخصيات المؤثرة في عالم الاقتصاد والمال العربي
              </p>
            </motion.div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-8 bg-ivory sticky top-16 z-20">
          <div className="container-luxury">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder="ابحث عن شخصية..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg bg-white shadow-sm font-[family-name:var(--font-display)] text-navy placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gold" size={20} />
              </div>

              {/* Categories */}
              <div className="flex flex-wrap justify-center gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-full font-[family-name:var(--font-display)] font-semibold text-sm transition-all ${
                      activeCategory === category
                        ? 'bg-gold text-white'
                        : 'bg-white text-navy hover:bg-gold/10'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Profiles Grid */}
        <section className="py-12">
          <div className="container-luxury">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProfiles.map((profile, index) => (
                <motion.a
                  key={profile.id}
                  href={`/profiles/${profile.id}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                    {/* Image */}
                    <div className="relative h-72 overflow-hidden">
                      <img
                        src={profile.image}
                        alt={profile.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-transparent opacity-80" />

                      {/* Category Badge */}
                      <span className="absolute top-4 right-4 px-3 py-1 bg-gold text-white text-xs font-[family-name:var(--font-display)] font-semibold rounded-full">
                        {profile.category}
                      </span>

                      {/* Quote Icon */}
                      <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Quote size={18} className="text-white" />
                      </div>

                      {/* Country */}
                      <span className="absolute bottom-4 left-4 text-white/70 text-xs font-[family-name:var(--font-display)]">
                        {profile.country}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 relative">
                      <div className="absolute top-0 right-5 w-12 h-1 bg-gradient-to-l from-gold to-transparent -translate-y-0.5" />

                      <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-1 group-hover:text-gold transition-colors">
                        {profile.name}
                      </h3>
                      <p className="text-sm text-slate mb-3">
                        {profile.title}
                      </p>
                      <p className="text-xs text-charcoal leading-relaxed line-clamp-2 italic">
                        "{profile.quote}"
                      </p>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>

            {filteredProfiles.length === 0 && (
              <div className="text-center py-20">
                <p className="text-slate font-[family-name:var(--font-display)]">
                  لم يتم العثور على نتائج
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
