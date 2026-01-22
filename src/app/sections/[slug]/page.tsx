'use client';

import { motion } from 'motion/react';
import { use } from 'react';
import { Calendar, Clock, ArrowUpLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const sectionData: Record<string, { name: string; description: string }> = {
  'economy': { name: 'اقتصاد', description: 'أخبار وتحليلات الاقتصاد الكلي والسياسات الاقتصادية' },
  'companies': { name: 'شركات', description: 'آخر أخبار الشركات والمؤسسات الكبرى' },
  'markets': { name: 'أسواق', description: 'تحليلات وتقارير أسواق المال والبورصات' },
  'technology': { name: 'تكنولوجيا', description: 'أحدث التطورات في عالم التقنية' },
  'energy-innovation': { name: 'طاقة وابتكار', description: 'قطاع الطاقة والابتكارات' },
  'opinion': { name: 'رأي', description: 'مقالات رأي من كبار الكتاب والمحللين' },
  'files': { name: 'ملفات', description: 'ملفات وتقارير معمقة' },
  'video': { name: 'فيديو', description: 'محتوى مرئي من مقابلات وتقارير' },
};

const mockArticles = [
  {
    id: 1,
    title: 'البنك المركزي يعلن عن إجراءات جديدة لدعم الاقتصاد',
    excerpt: 'أعلن البنك المركزي عن حزمة من الإجراءات الجديدة التي تهدف إلى دعم النمو الاقتصادي وتعزيز الاستقرار المالي في البلاد.',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop',
    date: '2024-01-15',
    readTime: 5,
    featured: true
  },
  {
    id: 2,
    title: 'ارتفاع مؤشرات البورصة مع تزايد ثقة المستثمرين',
    excerpt: 'شهدت البورصة ارتفاعاً ملحوظاً في مؤشراتها الرئيسية مدفوعة بتزايد ثقة المستثمرين.',
    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=500&fit=crop',
    date: '2024-01-14',
    readTime: 4,
    featured: false
  },
  {
    id: 3,
    title: 'قطاع التكنولوجيا يقود النمو في الربع الأخير',
    excerpt: 'حقق قطاع التكنولوجيا نمواً استثنائياً خلال الربع الأخير من العام.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=500&fit=crop',
    date: '2024-01-13',
    readTime: 6,
    featured: false
  },
  {
    id: 4,
    title: 'توقعات بنمو الناتج المحلي بنسبة 4% خلال العام الجاري',
    excerpt: 'توقع خبراء اقتصاديون نمو الناتج المحلي الإجمالي بنسبة 4% خلال العام الجاري.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop',
    date: '2024-01-12',
    readTime: 3,
    featured: false
  },
  {
    id: 5,
    title: 'الاستثمارات الأجنبية تتجاوز التوقعات',
    excerpt: 'سجلت الاستثمارات الأجنبية المباشرة أرقاماً قياسية تجاوزت كل التوقعات.',
    image: 'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=800&h=500&fit=crop',
    date: '2024-01-11',
    readTime: 5,
    featured: false
  },
  {
    id: 6,
    title: 'قمة اقتصادية تجمع قادة الأعمال في المنطقة',
    excerpt: 'انطلقت أعمال القمة الاقتصادية السنوية بمشاركة نخبة من قادة الأعمال.',
    image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&h=500&fit=crop',
    date: '2024-01-10',
    readTime: 4,
    featured: false
  }
];

export default function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const section = sectionData[slug] || { name: 'القسم', description: 'محتوى القسم' };

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
              <a href="/sections" className="text-gold/70 hover:text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider transition-colors">
                الأبواب
              </a>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-4">
                {section.name}
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                {section.description}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-16">
          <div className="container-luxury">
            {/* Featured Article */}
            {mockArticles.filter(a => a.featured).map((article) => (
              <motion.a
                key={article.id}
                href={`/news/${article.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="block mb-12 group"
              >
                <div className="grid lg:grid-cols-2 gap-8 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  <div className="aspect-[16/10] lg:aspect-auto overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-4 text-sm text-slate mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(article.date).toLocaleDateString('ar-SA')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {article.readTime} دقائق للقراءة
                      </span>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4 group-hover:text-gold transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-charcoal leading-relaxed mb-6">
                      {article.excerpt}
                    </p>
                    <span className="flex items-center gap-2 text-gold font-[family-name:var(--font-display)] font-semibold">
                      اقرأ المزيد
                      <ArrowUpLeft size={18} className="group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}

            {/* Articles Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockArticles.filter(a => !a.featured).map((article, index) => (
                <motion.a
                  key={article.id}
                  href={`/news/${article.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group"
                >
                  <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                    <div className="aspect-[16/10] overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-3 text-xs text-slate mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(article.date).toLocaleDateString('ar-SA')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {article.readTime} د
                        </span>
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg mb-2 line-clamp-2 group-hover:text-gold transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-slate text-sm line-clamp-2">
                        {article.excerpt}
                      </p>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-12">
              <button className="btn-gold">
                تحميل المزيد
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
