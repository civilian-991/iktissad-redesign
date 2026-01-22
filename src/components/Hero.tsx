'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Clock, TrendingUp, ArrowUpLeft, Flame } from 'lucide-react';

const featuredNews = [
  {
    id: 1,
    title: 'فتح السوق السعودي أمام جميع فئات المستثمرين الأجانب',
    excerpt: 'اعتباراً من أول شباط/فبراير 2026 سيتم فتح السوق السعودي أمام جميع المستثمرين الأجانب في خطوة تاريخية لتعزيز مكانة المملكة كوجهة استثمارية عالمية.',
    category: 'أسواق',
    tag: 'حصري',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1400&h=900&fit=crop',
    date: '11 يناير 2026',
    readTime: '5 دقائق'
  },
  {
    id: 2,
    title: 'وزير الطاقة والمياه يشيد بمواقف دولة قطر الداعمة للبنان',
    excerpt: 'أكد وزير الطاقة والمياه على العلاقات المتميزة بين البلدين الشقيقين والدعم القطري المستمر لقطاع الطاقة في لبنان.',
    category: 'طاقة وابتكار',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1400&h=900&fit=crop',
    date: '12 يناير 2026',
    readTime: '4 دقائق'
  },
  {
    id: 3,
    title: 'الخطوط السعودية ثاني أكثر شركات الطيران انضباطاً عالمياً',
    excerpt: 'حققت الخطوط الجوية السعودية المركز الثاني عالمياً في التزام المواعيد لعام 2026 متفوقة على كبرى شركات الطيران العالمية.',
    category: 'شركات',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1400&h=900&fit=crop',
    date: '12 يناير 2026',
    readTime: '3 دقائق'
  },
];

const sideNews = [
  {
    id: 4,
    title: 'خبراء الأمم المتحدة: نمو الاقتصاد العالمي 2.7% لسنة 2026',
    category: 'اقتصاد',
    date: '10 يناير 2026',
    trending: true
  },
  {
    id: 5,
    title: 'البنك المركزي المصري يسجل أعلى احتياطي نقد أجنبي',
    category: 'مال ومصارف',
    date: '7 يناير 2026'
  },
  {
    id: 6,
    title: 'OpenAI تطلق ChatGPT Health لمحادثات الصحة واللياقة',
    category: 'تكنولوجيا',
    date: '9 يناير 2026'
  },
  {
    id: 7,
    title: 'إفتتاح منتدى الأعمال المصري السوري في دمشق',
    category: 'اقتصاد',
    date: '11 يناير 2026'
  },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % featuredNews.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + featuredNews.length) % featuredNews.length);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  return (
    <section className="bg-paper py-8">
      <div className="container-editorial">
        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-12 gap-6">

          {/* Main Featured Article - Image with overlay text */}
          <div
            className="lg:col-span-8 relative group"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            <div className="relative aspect-[16/10] lg:aspect-[16/9] overflow-hidden bg-charcoal">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                  className="absolute inset-0"
                >
                  <img
                    src={featuredNews[currentSlide].image}
                    alt={featuredNews[currentSlide].title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Bottom gradient for text readability */}
              <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#1a2a3a]/95 via-[#1a2a3a]/60 to-transparent" />

              {/* Content positioned at bottom */}
              <div className="absolute inset-x-0 bottom-0 p-6 lg:p-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {/* Tags */}
                    <div className="flex items-center gap-3 mb-4">
                      {featuredNews[currentSlide].tag && (
                        <span className="bg-gold text-obsidian px-3 py-1 text-xs font-bold font-[family-name:var(--font-display)]">
                          {featuredNews[currentSlide].tag}
                        </span>
                      )}
                      <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 text-xs font-semibold font-[family-name:var(--font-display)]">
                        {featuredNews[currentSlide].category}
                      </span>
                    </div>

                    {/* Title - white text on dark gradient */}
                    <h1 className="text-base md:text-lg font-[family-name:var(--font-display)] font-medium text-white leading-snug mb-3">
                      {featuredNews[currentSlide].title}
                    </h1>

                    {/* Excerpt */}
                    <p className="text-white/80 text-base leading-relaxed mb-6 max-w-2xl font-[family-name:var(--font-body)] hidden md:block">
                      {featuredNews[currentSlide].excerpt}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-white/80 text-sm">
                      <span className="flex items-center gap-2">
                        <Clock size={14} />
                        {featuredNews[currentSlide].date}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gold" />
                      <span>{featuredNews[currentSlide].readTime}</span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Controls */}
              <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 flex justify-between pointer-events-none">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevSlide}
                  className="w-12 h-12 bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-gold hover:text-obsidian transition-all pointer-events-auto"
                  aria-label="السابق"
                >
                  <ChevronRight size={24} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextSlide}
                  className="w-12 h-12 bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-gold hover:text-obsidian transition-all pointer-events-auto"
                  aria-label="التالي"
                >
                  <ChevronLeft size={24} />
                </motion.button>
              </div>

              {/* Slide Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {featuredNews.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentSlide
                        ? 'w-8 bg-gold'
                        : 'w-3 bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`الخبر ${index + 1}`}
                  />
                ))}
              </div>

              {/* Gold corner accent */}
              <div className="absolute top-0 right-0 w-20 h-20">
                <div className="absolute top-0 right-0 w-full h-1 bg-gold" />
                <div className="absolute top-0 right-0 w-1 h-full bg-gold" />
              </div>
            </div>
          </div>

          {/* Side Panel - Light background with dark text */}
          <div className="lg:col-span-4">
            {/* Header */}
            <div className="bg-obsidian text-white p-4 mb-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flame size={18} className="text-gold" />
                  <h2 className="font-[family-name:var(--font-display)] font-bold text-lg">
                    الأكثر قراءة
                  </h2>
                </div>
                <a href="/trending" className="text-gold text-sm font-[family-name:var(--font-display)] hover:underline flex items-center gap-1">
                  المزيد
                  <ArrowUpLeft size={14} />
                </a>
              </div>
            </div>

            {/* News List - cream/light background */}
            <div className="bg-cream border border-charcoal/10">
              {sideNews.map((news, index) => (
                <motion.a
                  key={news.id}
                  href={`/news/${news.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className={`block p-4 hover:bg-gold/10 transition-colors group ${
                    index !== sideNews.length - 1 ? 'border-b border-charcoal/10' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Number */}
                    <span className="font-[family-name:var(--font-accent)] text-3xl font-bold text-gold/60 group-hover:text-gold transition-colors leading-none">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="flex-1 min-w-0">
                      {/* Category & Trending */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gold text-xs font-[family-name:var(--font-display)] font-bold">
                          {news.category}
                        </span>
                        {news.trending && (
                          <span className="flex items-center gap-1 text-profit text-xs font-semibold">
                            <TrendingUp size={12} />
                            رائج
                          </span>
                        )}
                      </div>

                      {/* Title - Dark text on light background */}
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-charcoal text-sm leading-relaxed group-hover:text-gold transition-colors line-clamp-2">
                        {news.title}
                      </h3>

                      {/* Date */}
                      <span className="text-charcoal/70 text-xs mt-1 block">
                        {news.date}
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Breaking News - Red accent */}
            <div className="bg-loss text-white p-4 mt-1">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
                <span className="text-sm font-[family-name:var(--font-display)] font-bold">عاجل</span>
                <p className="text-white/90 text-sm truncate flex-1 font-[family-name:var(--font-body)]">
                  مؤشر تاسي يسجل ارتفاعاً بنسبة 1.2% في تداولات اليوم
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
