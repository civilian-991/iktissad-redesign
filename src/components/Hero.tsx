'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Clock, Eye } from 'lucide-react';

const featuredNews = [
  {
    id: 1,
    title: 'وزير الطاقة والمياه يشيد بمواقف دولة قطر الداعمة للبنان',
    excerpt: 'أكد وزير الطاقة والمياه على العلاقات المتميزة بين البلدين الشقيقين والدعم القطري المستمر لقطاع الطاقة في لبنان.',
    category: 'طاقة',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&h=800&fit=crop',
    date: '12 يناير 2026',
    views: '2,450'
  },
  {
    id: 2,
    title: 'الخطوط السعودية ثاني أكثر شركات الطيران انضباطاً عالمياً',
    excerpt: 'حققت الخطوط الجوية السعودية المركز الثاني عالمياً في التزام المواعيد لعام 2026.',
    category: 'سياحة وطيران',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&h=800&fit=crop',
    date: '12 يناير 2026',
    views: '3,820'
  },
  {
    id: 3,
    title: 'فتح السوق السعودي أمام جميع فئات المستثمرين الأجانب',
    excerpt: 'اعتباراً من أول شباط/فبراير 2026 سيتم فتح السوق السعودي أمام جميع المستثمرين الأجانب.',
    category: 'مال ومصارف',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=800&fit=crop',
    date: '11 يناير 2026',
    views: '5,120'
  },
  {
    id: 4,
    title: 'إفتتاح منتدى الأعمال المصري السوري في دمشق',
    excerpt: 'الوكيل: سنقدم للشقيقة سوريا كافة خبراتنا للنهوض بالبنية التحتية بمشاركة القطاع الخاص.',
    category: 'اقتصاد عام',
    image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=800&fit=crop',
    date: '11 يناير 2026',
    views: '1,890'
  },
];

const sideNews = [
  {
    id: 5,
    title: 'خبراء الأمم المتحدة: نمو الاقتصاد العالمي 2.7% لسنة 2026',
    category: 'اقتصاد عام',
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=300&fit=crop',
    date: '10 يناير 2026'
  },
  {
    id: 6,
    title: 'البنك المركزي المصري يسجل أعلى احتياطي نقد أجنبي',
    category: 'مال ومصارف',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
    date: '7 يناير 2026'
  },
  {
    id: 7,
    title: 'OpenAI تطلق ChatGPT Health لمحادثات الصحة واللياقة',
    category: 'تكنولوجيا',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop',
    date: '9 يناير 2026'
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
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  return (
    <section className="relative py-8 geometric-pattern">
      <div className="container-luxury">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Carousel */}
          <div
            className="lg:col-span-2"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            <div className="relative h-[500px] lg:h-[600px] rounded-2xl overflow-hidden group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.7 }}
                  className="absolute inset-0"
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${featuredNews[currentSlide].image})` }}
                  />
                  {/* Content with solid navy background */}
                  <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end">
                    {/* Solid navy background - guaranteed contrast */}
                    <div className="bg-[#132742] p-8 lg:p-12">
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                      >
                        {/* Category Badge */}
                        <span className="news-tag mb-4">
                          {featuredNews[currentSlide].category}
                        </span>

                        {/* Title - Gold for maximum visibility */}
                        <h1 className="text-2xl lg:text-3xl xl:text-4xl font-[family-name:var(--font-display)] font-black text-gold mb-4 leading-tight">
                          {featuredNews[currentSlide].title}
                        </h1>

                        {/* Excerpt */}
                        <p className="text-base lg:text-lg text-white mb-6 max-w-2xl leading-relaxed">
                          {featuredNews[currentSlide].excerpt}
                        </p>

                        {/* Meta */}
                        <div className="flex items-center gap-6 text-white text-sm">
                          <span className="flex items-center gap-2">
                            <Clock size={16} />
                            {featuredNews[currentSlide].date}
                          </span>
                          <span className="flex items-center gap-2">
                            <Eye size={16} />
                            {featuredNews[currentSlide].views} مشاهدة
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              <div className="absolute inset-y-0 right-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextSlide}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-gold transition-colors duration-300"
                  aria-label="الخبر التالي"
                >
                  <ChevronRight size={24} />
                </motion.button>
              </div>
              <div className="absolute inset-y-0 left-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevSlide}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-gold transition-colors duration-300"
                  aria-label="الخبر السابق"
                >
                  <ChevronLeft size={24} />
                </motion.button>
              </div>

              {/* Slide Indicators - moved up above content bar */}
              <div className="absolute bottom-48 lg:bottom-56 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                {featuredNews.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide
                        ? 'w-10 bg-gold'
                        : 'w-2 bg-white/60 hover:bg-white'
                    }`}
                    aria-label={`الانتقال إلى الخبر ${index + 1}`}
                  />
                ))}
              </div>

              {/* Thumbnail Strip - positioned above content bar */}
              <div className="absolute bottom-48 lg:bottom-56 left-0 right-0 hidden lg:flex gap-2 px-4 z-10">
                {featuredNews.map((news, index) => (
                  <button
                    key={news.id}
                    onClick={() => setCurrentSlide(index)}
                    className={`flex-1 h-20 rounded-lg overflow-hidden transition-all duration-300 ${
                      index === currentSlide
                        ? 'ring-3 ring-gold scale-105'
                        : 'opacity-50 hover:opacity-90'
                    }`}
                  >
                    <img
                      src={news.image}
                      alt={news.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Side News */}
          <div className="space-y-4">
            {sideNews.map((news, index) => (
              <motion.article
                key={news.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="card-luxury group cursor-pointer"
              >
                <a href={`/news/${news.id}`} className="flex gap-4 p-4">
                  <div className="relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden">
                    <img
                      src={news.image}
                      alt={news.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-navy/20 group-hover:bg-transparent transition-colors duration-300" />
                  </div>
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <span className="text-xs text-gold font-[family-name:var(--font-display)] font-semibold mb-2">
                      {news.category}
                    </span>
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-sm leading-snug line-clamp-3 group-hover:text-gold transition-colors duration-300">
                      {news.title}
                    </h3>
                    <span className="text-xs text-slate mt-2 flex items-center gap-1">
                      <Clock size={12} />
                      {news.date}
                    </span>
                  </div>
                </a>
              </motion.article>
            ))}

            {/* Breaking News Ticker */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-navy to-navy-light rounded-2xl p-6 text-white overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold/10 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-[family-name:var(--font-display)] font-bold text-gold text-sm">
                    عاجل
                  </span>
                </div>
                <p className="font-[family-name:var(--font-display)] text-sm leading-relaxed">
                  مؤشر تاسي يسجل ارتفاعاً بنسبة 1.2% في تداولات اليوم مع تزايد الطلب على الأسهم القيادية
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 border border-gold/20 rounded-full float" />
      <div className="absolute bottom-20 right-10 w-32 h-32 border border-gold/10 rounded-full float" style={{ animationDelay: '2s' }} />
    </section>
  );
}
