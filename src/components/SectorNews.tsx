'use client';

import { motion } from 'motion/react';
import {
  TrendingUp,
  Building2,
  Fuel,
  Plane,
  Cpu,
  Car,
  ArrowUpLeft,
  Clock
} from 'lucide-react';

const sectors = [
  {
    id: 'economy',
    name: 'اقتصاد عام',
    icon: TrendingUp,
    color: 'from-emerald-500 to-emerald-700',
    articles: [
      {
        id: 1,
        title: 'خبراء الأمم المتحدة: نمو الاقتصاد العالمي 2.7% لسنة 2026',
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop',
        date: '10 يناير 2026',
        featured: true
      },
      {
        id: 2,
        title: 'مباحثات بين وزيري الزراعة في سوريا ولبنان لتعزيز التعاون',
        date: '11 يناير 2026'
      },
      {
        id: 3,
        title: 'الناتج المحلي الإجمالي للدول العربية يتجاوز 3.5 تريليون دولار',
        date: '9 يناير 2026'
      },
    ]
  },
  {
    id: 'finance',
    name: 'مال ومصارف',
    icon: Building2,
    color: 'from-blue-500 to-blue-700',
    articles: [
      {
        id: 4,
        title: 'فتح السوق السعودي أمام جميع فئات المستثمرين الأجانب',
        image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop',
        date: '11 يناير 2026',
        featured: true
      },
      {
        id: 5,
        title: 'البنك المركزي المصري يسجل أعلى احتياطي نقد أجنبي',
        date: '7 يناير 2026'
      },
      {
        id: 6,
        title: '"المعمر لأنظمة المعلومات" توافق على رفع رأس مال بنك فيجن',
        date: '5 يناير 2026'
      },
    ]
  },
  {
    id: 'energy',
    name: 'طاقة',
    icon: Fuel,
    color: 'from-amber-500 to-amber-700',
    articles: [
      {
        id: 7,
        title: 'وزير الطاقة والمياه يشيد بمواقف دولة قطر الداعمة للبنان',
        image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&h=400&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      {
        id: 8,
        title: 'ارتفاع أسعار النفط مع تزايد التوترات الجيوسياسية',
        date: '11 يناير 2026'
      },
      {
        id: 9,
        title: 'السعودية تعلن عن استثمارات ضخمة في الطاقة المتجددة',
        date: '10 يناير 2026'
      },
    ]
  },
  {
    id: 'tourism',
    name: 'سياحة وطيران',
    icon: Plane,
    color: 'from-sky-500 to-sky-700',
    articles: [
      {
        id: 10,
        title: 'الخطوط السعودية ثاني أكثر شركات الطيران انضباطاً عالمياً',
        image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop',
        date: '12 يناير 2026',
        featured: true
      },
      {
        id: 11,
        title: 'دبي تستقبل 18 مليون سائح في النصف الأول من 2026',
        date: '8 يناير 2026'
      },
      {
        id: 12,
        title: 'مشروع نيوم يكشف عن خطط توسعية جديدة للقطاع السياحي',
        date: '6 يناير 2026'
      },
    ]
  },
  {
    id: 'technology',
    name: 'تكنولوجيا',
    icon: Cpu,
    color: 'from-purple-500 to-purple-700',
    articles: [
      {
        id: 13,
        title: 'OpenAI تطلق ChatGPT Health لمحادثات الصحة واللياقة',
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
        date: '9 يناير 2026',
        featured: true
      },
      {
        id: 14,
        title: 'توقيع اتفاقية شراكة في مجال الذكاء الاصطناعي',
        date: '26 ديسمبر 2025'
      },
      {
        id: 15,
        title: 'إنترسك 2026 يعلن عن إطلاق فعاليات جديدة للأمن والسلامة',
        date: '6 يناير 2026'
      },
    ]
  },
  {
    id: 'automotive',
    name: 'سيارات ومحركات',
    icon: Car,
    color: 'from-red-500 to-red-700',
    articles: [
      {
        id: 16,
        title: 'أسلوب الحياة الفاخر في دبي مستوحى من فن جاكوب وشركاه',
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop',
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
    <section className="py-16 bg-ivory relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 star-pattern opacity-50" />

      <div className="container-luxury relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider">
            تغطية شاملة
          </span>
          <h2 className="text-4xl font-[family-name:var(--font-display)] font-black text-navy mt-2 mb-4">
            أخبار القطاعات
          </h2>
          <div className="divider-diamond max-w-md mx-auto">◆</div>
        </motion.div>

        {/* Sectors Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sectors.map((sector, sectorIndex) => (
            <motion.div
              key={sector.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: sectorIndex * 0.1 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden group"
            >
              {/* Sector Header */}
              <div className={`bg-gradient-to-r ${sector.color} p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <sector.icon className="text-white" size={20} />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-white text-lg">
                    {sector.name}
                  </h3>
                </div>
                <a
                  href={`/sectors/${sector.id}`}
                  className="text-white/80 hover:text-white transition-colors flex items-center gap-1 text-sm font-[family-name:var(--font-display)]"
                >
                  المزيد
                  <ArrowUpLeft size={16} />
                </a>
              </div>

              {/* Featured Article */}
              {sector.articles.filter(a => a.featured).map(article => (
                <a
                  key={article.id}
                  href={`/news/${article.id}`}
                  className="block relative h-48 overflow-hidden"
                >
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Solid navy background - guaranteed contrast */}
                  <div className="absolute bottom-0 left-0 right-0 bg-[#132742] p-4">
                    <h4
                      className="font-[family-name:var(--font-display)] font-bold text-sm leading-snug line-clamp-2"
                      style={{ color: '#c9a227' }}
                    >
                      {article.title}
                    </h4>
                    <span className="text-xs text-white mt-2 flex items-center gap-1">
                      <Clock size={12} />
                      {article.date}
                    </span>
                  </div>
                </a>
              ))}

              {/* Article List */}
              <div className="p-4 space-y-3">
                {sector.articles.filter(a => !a.featured).map((article, index) => (
                  <a
                    key={article.id}
                    href={`/news/${article.id}`}
                    className="flex items-start gap-3 group/item pb-3 border-b border-sand last:border-0 last:pb-0"
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded bg-gradient-to-br ${sector.color} text-white text-xs flex items-center justify-center font-[family-name:var(--font-display)] font-bold`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-[family-name:var(--font-display)] text-sm text-navy leading-snug line-clamp-2 group-hover/item:text-gold transition-colors duration-300">
                        {article.title}
                      </h5>
                      <span className="text-xs text-slate mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        {article.date}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
