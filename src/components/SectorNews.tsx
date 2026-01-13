'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Factory,
  Building2,
  Plane,
  Cpu,
  Car,
  Leaf,
  Wheat,
  ShoppingBag,
  TrendingUp,
  Shield,
  Home,
  Truck,
  GraduationCap,
  HeartPulse,
  Lightbulb,
  Gem,
  Coins,
  ArrowUpLeft,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Sectors ordered by importance for business news
const sectors = [
  // Page 1 - Core Business Sectors
  {
    id: 'finance',
    name: 'مال ومصارف',
    icon: Building2,
    gradient: 'from-blue-600 to-blue-800',
    articles: [
      {
        id: 10,
        title: 'فتح السوق السعودي أمام جميع فئات المستثمرين الأجانب',
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop',
        date: '11 يناير 2026',
        featured: true
      },
      { id: 11, title: 'البنك المركزي المصري يسجل أعلى احتياطي نقد أجنبي', date: '7 يناير 2026' },
      { id: 12, title: '"المعمر لأنظمة المعلومات" توافق على رفع رأس مال بنك فيجن', date: '5 يناير 2026' },
    ]
  },
  {
    id: 'investment',
    name: 'استثمار',
    icon: TrendingUp,
    gradient: 'from-indigo-600 to-indigo-800',
    articles: [
      {
        id: 13,
        title: 'صندوق الاستثمارات العامة يضخ 100 مليار دولار في مشاريع جديدة',
        image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=500&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      { id: 14, title: 'الإمارات تجذب استثمارات أجنبية بقيمة 20 مليار دولار', date: '10 يناير 2026' },
      { id: 15, title: 'قطر تطلق صندوقاً سيادياً جديداً للتكنولوجيا', date: '8 يناير 2026' },
    ]
  },
  {
    id: 'trade',
    name: 'تجارة',
    icon: ShoppingBag,
    gradient: 'from-orange-600 to-orange-800',
    articles: [
      {
        id: 7,
        title: 'التجارة الإلكترونية في الخليج تتجاوز 50 مليار دولار',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop',
        date: '11 يناير 2026',
        featured: true
      },
      { id: 8, title: 'دبي تحتفظ بمركزها كأهم مركز تجاري إقليمي', date: '9 يناير 2026' },
      { id: 9, title: 'اتفاقية تجارة حرة جديدة بين مصر والهند', date: '7 يناير 2026' },
    ]
  },
  {
    id: 'energy-environment',
    name: 'طاقة وبيئة',
    icon: Leaf,
    gradient: 'from-emerald-600 to-emerald-800',
    articles: [
      {
        id: 37,
        title: 'وزير الطاقة والمياه يشيد بمواقف دولة قطر الداعمة للبنان',
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=500&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      { id: 38, title: 'السعودية تعلن عن استثمارات ضخمة في الطاقة المتجددة', date: '10 يناير 2026' },
      { id: 39, title: 'الإمارات تستهدف الحياد الكربوني بحلول 2050', date: '8 يناير 2026' },
    ]
  },
  {
    id: 'real-estate',
    name: 'عقار',
    icon: Home,
    gradient: 'from-stone-600 to-stone-800',
    articles: [
      {
        id: 19,
        title: 'دبي تسجل مبيعات عقارية بقيمة 100 مليار درهم',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=500&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      { id: 20, title: 'السعودية تطلق مشاريع سكنية ضخمة في الرياض', date: '10 يناير 2026' },
      { id: 21, title: 'مصر تستقطب استثمارات عقارية خليجية', date: '8 يناير 2026' },
    ]
  },
  {
    id: 'industry',
    name: 'صناعة',
    icon: Factory,
    gradient: 'from-amber-600 to-amber-800',
    articles: [
      {
        id: 1,
        title: 'السعودية تطلق استراتيجية صناعية جديدة بقيمة 100 مليار ريال',
        image: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=800&h=500&fit=crop',
        date: '8 يناير 2026',
        featured: true
      },
      { id: 2, title: 'نمو قطاع التصنيع في الخليج بنسبة 4.5%', date: '5 يناير 2026' },
      { id: 3, title: 'مصر توقع اتفاقيات لإنشاء 3 مصانع جديدة', date: '3 يناير 2026' },
    ]
  },
  // Page 2 - Technology & Transport
  {
    id: 'technology',
    name: 'تكنولوجيا',
    icon: Cpu,
    gradient: 'from-violet-600 to-violet-800',
    articles: [
      {
        id: 43,
        title: 'OpenAI تطلق ChatGPT Health لمحادثات الصحة واللياقة',
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=500&fit=crop',
        date: '9 يناير 2026',
        featured: true
      },
      { id: 44, title: 'توقيع اتفاقية شراكة في مجال الذكاء الاصطناعي', date: '26 ديسمبر 2025' },
      { id: 45, title: 'إنترسك 2026 يعلن عن إطلاق فعاليات جديدة للأمن والسلامة', date: '6 يناير 2026' },
    ]
  },
  {
    id: 'automotive',
    name: 'سيارات',
    icon: Car,
    gradient: 'from-rose-600 to-rose-800',
    articles: [
      {
        id: 25,
        title: 'السعودية تستعد لإنتاج سيارات كهربائية محلياً',
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      { id: 26, title: 'تسلا تعلن عن نموذج جديد لمنطقة الشرق الأوسط', date: '5 يناير 2026' },
      { id: 27, title: 'معرض جنيف للسيارات يعود بحلة جديدة في 2026', date: '3 يناير 2026' },
    ]
  },
  {
    id: 'transport',
    name: 'نقل',
    icon: Truck,
    gradient: 'from-slate-600 to-slate-800',
    articles: [
      {
        id: 22,
        title: 'السعودية تعلن عن شبكة قطارات فائقة السرعة',
        image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=500&fit=crop',
        date: '11 يناير 2026',
        featured: true
      },
      { id: 23, title: 'الإمارات تطور أكبر ميناء ذكي في المنطقة', date: '9 يناير 2026' },
      { id: 24, title: 'مصر تفتتح خطوط مترو جديدة في القاهرة', date: '7 يناير 2026' },
    ]
  },
  {
    id: 'tourism-entertainment',
    name: 'سياحة وترفيه',
    icon: Plane,
    gradient: 'from-sky-600 to-sky-800',
    articles: [
      {
        id: 28,
        title: 'الخطوط السعودية ثاني أكثر شركات الطيران انضباطاً عالمياً',
        image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=500&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      { id: 29, title: 'دبي تستقبل 18 مليون سائح في النصف الأول من 2026', date: '8 يناير 2026' },
      { id: 30, title: 'مشروع نيوم يكشف عن خطط توسعية جديدة للقطاع السياحي', date: '6 يناير 2026' },
    ]
  },
  {
    id: 'insurance',
    name: 'تأمين',
    icon: Shield,
    gradient: 'from-cyan-600 to-cyan-800',
    articles: [
      {
        id: 16,
        title: 'نمو قطاع التأمين في السعودية بنسبة 15% خلال 2025',
        image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=500&fit=crop',
        date: '9 يناير 2026',
        featured: true
      },
      { id: 17, title: 'شركات التأمين الخليجية تحقق أرباحاً قياسية', date: '7 يناير 2026' },
      { id: 18, title: 'إطلاق منتجات تأمين رقمية جديدة في الإمارات', date: '5 يناير 2026' },
    ]
  },
  {
    id: 'entrepreneurship',
    name: 'ريادة وابتكار',
    icon: Lightbulb,
    gradient: 'from-yellow-600 to-yellow-800',
    articles: [
      {
        id: 40,
        title: 'الشركات الناشئة العربية تجمع تمويلات قياسية في 2025',
        image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=500&fit=crop',
        date: '10 يناير 2026',
        featured: true
      },
      { id: 41, title: 'السعودية تطلق حاضنات أعمال في 10 مدن', date: '8 يناير 2026' },
      { id: 42, title: 'دبي تستضيف أكبر مؤتمر للشركات الناشئة', date: '6 يناير 2026' },
    ]
  },
  // Page 3 - Other Sectors
  {
    id: 'agriculture',
    name: 'زراعة',
    icon: Wheat,
    gradient: 'from-green-600 to-green-800',
    articles: [
      {
        id: 4,
        title: 'الإمارات تستثمر 5 مليارات درهم في الزراعة المستدامة',
        image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=500&fit=crop',
        date: '10 يناير 2026',
        featured: true
      },
      { id: 5, title: 'السعودية تعلن عن مشروع ضخم للأمن الغذائي', date: '8 يناير 2026' },
      { id: 6, title: 'مصر تصدر منتجات زراعية بقيمة 3 مليارات دولار', date: '6 يناير 2026' },
    ]
  },
  {
    id: 'health',
    name: 'صحة',
    icon: HeartPulse,
    gradient: 'from-red-600 to-red-800',
    articles: [
      {
        id: 34,
        title: 'السعودية تستثمر 50 مليار ريال في القطاع الصحي',
        image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=500&fit=crop',
        date: '11 يناير 2026',
        featured: true
      },
      { id: 35, title: 'الإمارات تطلق مبادرة للسياحة العلاجية', date: '9 يناير 2026' },
      { id: 36, title: 'مصر تفتتح مدينة طبية متكاملة في العاصمة الإدارية', date: '7 يناير 2026' },
    ]
  },
  {
    id: 'education',
    name: 'تعليم',
    icon: GraduationCap,
    gradient: 'from-purple-600 to-purple-800',
    articles: [
      {
        id: 31,
        title: 'السعودية تطلق برنامجاً لابتعاث 100 ألف طالب',
        image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=500&fit=crop',
        date: '10 يناير 2026',
        featured: true
      },
      { id: 32, title: 'الإمارات تستثمر في تقنيات التعليم الذكي', date: '8 يناير 2026' },
      { id: 33, title: 'افتتاح فروع جديدة لجامعات عالمية في قطر', date: '6 يناير 2026' },
    ]
  },
  {
    id: 'luxury',
    name: 'رفاهية',
    icon: Gem,
    gradient: 'from-pink-600 to-pink-800',
    articles: [
      {
        id: 46,
        title: 'دبي تتصدر قائمة أفضل وجهات التسوق الفاخر عالمياً',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=500&fit=crop',
        date: '11 يناير 2026',
        featured: true
      },
      { id: 47, title: 'افتتاح أكبر مجمع للعلامات الفاخرة في الرياض', date: '9 يناير 2026' },
      { id: 48, title: 'نمو سوق المجوهرات الفاخرة في الخليج بنسبة 20%', date: '7 يناير 2026' },
    ]
  },
  {
    id: 'wealth',
    name: 'ثروات',
    icon: Coins,
    gradient: 'from-gold to-bronze',
    articles: [
      {
        id: 49,
        title: 'ثروات الأثرياء العرب تتجاوز 2 تريليون دولار',
        image: 'https://images.unsplash.com/photo-1618044733300-9472054094ee?w=800&h=500&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      { id: 50, title: 'السعودية تتصدر قائمة أغنى الدول العربية', date: '10 يناير 2026' },
      { id: 51, title: 'نمو قطاع إدارة الثروات في الإمارات', date: '8 يناير 2026' },
    ]
  },
];

const SECTORS_PER_PAGE = 6;

export default function SectorNews() {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(sectors.length / SECTORS_PER_PAGE);

  const visibleSectors = sectors.slice(
    currentPage * SECTORS_PER_PAGE,
    (currentPage + 1) * SECTORS_PER_PAGE
  );

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <section className="py-24 bg-paper relative overflow-hidden">
      {/* Subtle Pattern */}
      <div className="absolute inset-0 pattern-grid" />

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

      <div className="container-editorial relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
        >
          <div>
            <span className="section-label">تغطية شاملة</span>
            <h2 className="text-4xl md:text-5xl font-[family-name:var(--font-display)] font-black text-obsidian mt-3 mb-4">
              أخبار القطاعات
            </h2>
            <div className="divider-editorial max-w-xs">
              <div className="diamond-accent" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={prevPage}
                className="w-10 h-10 border border-sand hover:border-gold text-graphite hover:text-gold flex items-center justify-center transition-colors"
                aria-label="السابق"
              >
                <ChevronRight size={18} />
              </motion.button>
              <span className="text-sm text-graphite font-[family-name:var(--font-display)] min-w-[60px] text-center">
                {currentPage + 1} / {totalPages}
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={nextPage}
                className="w-10 h-10 border border-sand hover:border-gold text-graphite hover:text-gold flex items-center justify-center transition-colors"
                aria-label="التالي"
              >
                <ChevronLeft size={18} />
              </motion.button>
            </div>

            <a
              href="/sectors"
              className="btn-outline inline-flex items-center gap-2"
            >
              <span>جميع القطاعات</span>
              <ArrowUpLeft size={16} />
            </a>
          </div>
        </motion.div>

        {/* Sectors Grid - Magazine Style */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {visibleSectors.map((sector, sectorIndex) => (
              <motion.div
                key={sector.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectorIndex * 0.1 }}
                className="group"
              >
                {/* Sector Card */}
                <div className="bg-white border border-sand hover:border-gold/30 transition-colors duration-500 overflow-hidden">
                  {/* Sector Header */}
                  <div className={`bg-gradient-to-r ${sector.gradient} p-4 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 flex items-center justify-center">
                        <sector.icon className="text-white" size={20} />
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-white text-lg">
                        {sector.name}
                      </h3>
                    </div>
                    <a
                      href={`/sectors/${sector.id}`}
                      className="text-white/70 hover:text-white transition-colors flex items-center gap-1 text-xs font-[family-name:var(--font-display)]"
                    >
                      المزيد
                      <ArrowUpLeft size={14} />
                    </a>
                  </div>

                  {/* Featured Article */}
                  {sector.articles.filter(a => a.featured).map(article => (
                    <a
                      key={article.id}
                      href={`/news/${article.id}`}
                      className="block relative h-52 overflow-hidden"
                    >
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* Content Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h4 className="font-[family-name:var(--font-display)] font-bold text-white text-sm leading-relaxed line-clamp-2 mb-2">
                          {article.title}
                        </h4>
                        <span className="text-white/60 text-xs flex items-center gap-1.5">
                          <Clock size={12} />
                          {article.date}
                        </span>
                      </div>
                    </a>
                  ))}

                  {/* Article List */}
                  <div className="divide-y divide-sand">
                    {sector.articles.filter(a => !a.featured).map((article, index) => (
                      <a
                        key={article.id}
                        href={`/news/${article.id}`}
                        className="flex items-start gap-3 p-4 hover:bg-cream transition-colors group/item"
                      >
                        <span className={`flex-shrink-0 w-6 h-6 bg-gradient-to-br ${sector.gradient} text-white text-xs flex items-center justify-center font-[family-name:var(--font-display)] font-bold`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-[family-name:var(--font-display)] font-semibold text-sm text-obsidian leading-relaxed line-clamp-2 group-hover/item:text-gold transition-colors duration-300">
                            {article.title}
                          </h5>
                          <span className="text-graphite text-xs mt-1.5 flex items-center gap-1">
                            <Clock size={10} />
                            {article.date}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Page Indicators */}
        <div className="flex items-center justify-center gap-2 mt-10">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentPage ? 'w-8 bg-gold' : 'w-2 bg-sand hover:bg-stone'
              }`}
              aria-label={`الصفحة ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
