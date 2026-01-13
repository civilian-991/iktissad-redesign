'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Clock, TrendingUp, ArrowUpLeft } from 'lucide-react';

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
    <section className="relative bg-midnight overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-arabesque opacity-10" />

      {/* Gradient Overlays - Lighter for better visibility */}
      <div className="absolute inset-0 bg-gradient-to-br from-midnight/60 via-transparent to-navy/30" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-paper to-transparent" />

      <div className="container-editorial relative">
        <div className="grid lg:grid-cols-12 gap-0 min-h-[85vh]">

          {/* Main Featured Article - Takes 8 columns */}
          <div
            className="lg:col-span-8 relative"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0"
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img
                    src={featuredNews[currentSlide].image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {/* Lighter Vignette Effect - Shows more of the image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-midnight/60 via-transparent to-transparent" />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Content Overlay */}
            <div className="relative h-full flex flex-col justify-end p-8 lg:p-16 pb-20 lg:pb-24">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="max-w-2xl"
                >
                  {/* Tags */}
                  <div className="flex items-center gap-3 mb-6">
                    {featuredNews[currentSlide].tag && (
                      <span className="tag-exclusive">
                        {featuredNews[currentSlide].tag}
                      </span>
                    )}
                    <span className="tag-category">
                      {featuredNews[currentSlide].category}
                    </span>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white leading-[1.2] mb-6">
                    {featuredNews[currentSlide].title}
                  </h1>

                  {/* Excerpt */}
                  <p className="text-lg text-white/70 leading-relaxed mb-8 max-w-xl font-[family-name:var(--font-body)]">
                    {featuredNews[currentSlide].excerpt}
                  </p>

                  {/* Meta & CTA */}
                  <div className="flex flex-wrap items-center gap-6">
                    <a
                      href={`/news/${featuredNews[currentSlide].id}`}
                      className="btn-gold inline-flex items-center gap-2"
                    >
                      <span>اقرأ المزيد</span>
                      <ArrowUpLeft size={18} />
                    </a>
                    <div className="flex items-center gap-4 text-white/50 text-sm">
                      <span className="flex items-center gap-2">
                        <Clock size={14} />
                        {featuredNews[currentSlide].date}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gold" />
                      <span>{featuredNews[currentSlide].readTime}</span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="absolute bottom-8 left-8 lg:left-16 flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevSlide}
                  className="w-12 h-12 border border-white/20 text-white flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                  aria-label="السابق"
                >
                  <ChevronRight size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextSlide}
                  className="w-12 h-12 border border-white/20 text-white flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                  aria-label="التالي"
                >
                  <ChevronLeft size={20} />
                </motion.button>

                {/* Progress Indicators */}
                <div className="flex items-center gap-2 mr-4">
                  {featuredNews.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className="group relative h-1 transition-all duration-500"
                      style={{ width: index === currentSlide ? '48px' : '16px' }}
                      aria-label={`الخبر ${index + 1}`}
                    >
                      <span className={`absolute inset-0 transition-colors duration-300 ${
                        index === currentSlide ? 'bg-gold' : 'bg-white/30 group-hover:bg-white/50'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel - Takes 4 columns */}
          <div className="lg:col-span-4 bg-midnight/80 backdrop-blur-sm border-r border-gold/10 flex flex-col">
            {/* Section Header */}
            <div className="p-6 border-b border-gold/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-gold" />
                  <h2 className="font-[family-name:var(--font-display)] font-bold text-white text-lg">
                    الأكثر قراءة
                  </h2>
                </div>
                <a href="/trending" className="text-gold text-sm font-[family-name:var(--font-display)] hover:text-gold-light transition-colors flex items-center gap-1">
                  المزيد
                  <ArrowUpLeft size={14} />
                </a>
              </div>
            </div>

            {/* News List */}
            <div className="flex-1 divide-y divide-gold/10">
              {sideNews.map((news, index) => (
                <motion.a
                  key={news.id}
                  href={`/news/${news.id}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="block p-6 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex gap-4">
                    {/* Number */}
                    <span className="font-[family-name:var(--font-accent)] text-4xl font-bold text-gold/20 group-hover:text-gold/40 transition-colors leading-none">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="flex-1 min-w-0">
                      {/* Category & Trending */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gold text-xs font-[family-name:var(--font-display)] font-semibold">
                          {news.category}
                        </span>
                        {news.trending && (
                          <span className="flex items-center gap-1 text-profit text-xs">
                            <TrendingUp size={12} />
                            رائج
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-white text-sm leading-relaxed group-hover:text-gold transition-colors line-clamp-2">
                        {news.title}
                      </h3>

                      {/* Date */}
                      <span className="text-white/40 text-xs mt-2 block">
                        {news.date}
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Breaking News Ticker */}
            <div className="p-4 bg-loss/10 border-t border-loss/20">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-loss opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-loss" />
                </span>
                <span className="text-loss text-xs font-[family-name:var(--font-display)] font-bold">عاجل</span>
                <p className="text-white/80 text-xs truncate flex-1 font-[family-name:var(--font-body)]">
                  مؤشر تاسي يسجل ارتفاعاً بنسبة 1.2% في تداولات اليوم
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Corner Elements */}
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-gold/20" />
      <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-gold/20" />
    </section>
  );
}
