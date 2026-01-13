'use client';

import { motion } from 'motion/react';
import {
  Factory,
  Building2,
  Plane,
  Cpu,
  Car,
  Leaf,
  ArrowUpLeft,
  Clock
} from 'lucide-react';

const sectors = [
  {
    id: 'finance',
    name: 'مال ومصارف',
    icon: Building2,
    gradient: 'from-blue-600 to-blue-800',
    articles: [
      {
        id: 1,
        title: 'فتح السوق السعودي أمام جميع فئات المستثمرين الأجانب',
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop',
        date: '11 يناير 2026',
        featured: true
      },
      {
        id: 2,
        title: 'البنك المركزي المصري يسجل أعلى احتياطي نقد أجنبي',
        date: '7 يناير 2026'
      },
      {
        id: 3,
        title: '"المعمر لأنظمة المعلومات" توافق على رفع رأس مال بنك فيجن',
        date: '5 يناير 2026'
      },
    ]
  },
  {
    id: 'energy',
    name: 'طاقة وبيئة',
    icon: Leaf,
    gradient: 'from-emerald-600 to-emerald-800',
    articles: [
      {
        id: 4,
        title: 'وزير الطاقة والمياه يشيد بمواقف دولة قطر الداعمة للبنان',
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=500&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      {
        id: 5,
        title: 'ارتفاع أسعار النفط مع تزايد التوترات الجيوسياسية',
        date: '11 يناير 2026'
      },
      {
        id: 6,
        title: 'السعودية تعلن عن استثمارات ضخمة في الطاقة المتجددة',
        date: '10 يناير 2026'
      },
    ]
  },
  {
    id: 'tourism',
    name: 'سياحة وترفيه',
    icon: Plane,
    gradient: 'from-sky-600 to-sky-800',
    articles: [
      {
        id: 7,
        title: 'الخطوط السعودية ثاني أكثر شركات الطيران انضباطاً عالمياً',
        image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=500&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      {
        id: 8,
        title: 'دبي تستقبل 18 مليون سائح في النصف الأول من 2026',
        date: '8 يناير 2026'
      },
      {
        id: 9,
        title: 'مشروع نيوم يكشف عن خطط توسعية جديدة للقطاع السياحي',
        date: '6 يناير 2026'
      },
    ]
  },
  {
    id: 'technology',
    name: 'تكنولوجيا',
    icon: Cpu,
    gradient: 'from-violet-600 to-violet-800',
    articles: [
      {
        id: 10,
        title: 'OpenAI تطلق ChatGPT Health لمحادثات الصحة واللياقة',
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=500&fit=crop',
        date: '9 يناير 2026',
        featured: true
      },
      {
        id: 11,
        title: 'توقيع اتفاقية شراكة في مجال الذكاء الاصطناعي',
        date: '26 ديسمبر 2025'
      },
      {
        id: 12,
        title: 'إنترسك 2026 يعلن عن إطلاق فعاليات جديدة للأمن والسلامة',
        date: '6 يناير 2026'
      },
    ]
  },
  {
    id: 'industry',
    name: 'صناعة',
    icon: Factory,
    gradient: 'from-amber-600 to-amber-800',
    articles: [
      {
        id: 13,
        title: 'السعودية تطلق استراتيجية صناعية جديدة بقيمة 100 مليار ريال',
        image: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=800&h=500&fit=crop',
        date: '8 يناير 2026',
        featured: true
      },
      {
        id: 14,
        title: 'نمو قطاع التصنيع في الخليج بنسبة 4.5%',
        date: '5 يناير 2026'
      },
      {
        id: 15,
        title: 'مصر توقع اتفاقيات لإنشاء 3 مصانع جديدة',
        date: '3 يناير 2026'
      },
    ]
  },
  {
    id: 'automotive',
    name: 'سيارات',
    icon: Car,
    gradient: 'from-rose-600 to-rose-800',
    articles: [
      {
        id: 16,
        title: 'أسلوب الحياة الفاخر في دبي مستوحى من فن جاكوب وشركاه',
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      {
        id: 17,
        title: 'تسلا تعلن عن نموذج جديد لمنطقة الشرق الأوسط',
        date: '5 يناير 2026'
      },
      {
        id: 18,
        title: 'معرض جنيف للسيارات يعود بحلة جديدة في 2026',
        date: '3 يناير 2026'
      },
    ]
  },
];

export default function SectorNews() {
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
          className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6"
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
          <a
            href="/sectors"
            className="btn-outline inline-flex items-center gap-2 self-start"
          >
            <span>جميع القطاعات</span>
            <ArrowUpLeft size={16} />
          </a>
        </motion.div>

        {/* Sectors Grid - Magazine Style */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sectors.map((sector, sectorIndex) => (
            <motion.div
              key={sector.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
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
        </div>
      </div>
    </section>
  );
}
