'use client';

import { motion } from 'motion/react';
import {
  TrendingUp,
  Building2,
  BarChart3,
  Cpu,
  Zap,
  MessageSquare,
  FolderOpen,
  Play,
  ArrowUpLeft
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const sections = [
  {
    id: 'economy',
    name: 'اقتصاد',
    description: 'أخبار وتحليلات الاقتصاد الكلي والسياسات الاقتصادية في العالم العربي',
    icon: TrendingUp,
    color: 'from-emerald-500 to-emerald-700',
    bgColor: 'bg-emerald-50',
    articleCount: 2450
  },
  {
    id: 'companies',
    name: 'شركات',
    description: 'آخر أخبار الشركات والمؤسسات الكبرى في المنطقة',
    icon: Building2,
    color: 'from-blue-500 to-blue-700',
    bgColor: 'bg-blue-50',
    articleCount: 1890
  },
  {
    id: 'markets',
    name: 'أسواق',
    description: 'تحليلات وتقارير أسواق المال والبورصات العربية والعالمية',
    icon: BarChart3,
    color: 'from-purple-500 to-purple-700',
    bgColor: 'bg-purple-50',
    articleCount: 1650
  },
  {
    id: 'technology',
    name: 'تكنولوجيا',
    description: 'أحدث التطورات في عالم التقنية والتحول الرقمي',
    icon: Cpu,
    color: 'from-cyan-500 to-cyan-700',
    bgColor: 'bg-cyan-50',
    articleCount: 980
  },
  {
    id: 'energy-innovation',
    name: 'طاقة وابتكار',
    description: 'قطاع الطاقة والابتكارات في مجال الاستدامة',
    icon: Zap,
    color: 'from-amber-500 to-amber-700',
    bgColor: 'bg-amber-50',
    articleCount: 756
  },
  {
    id: 'opinion',
    name: 'رأي',
    description: 'مقالات رأي وتحليلات من كبار الكتاب والمحللين',
    icon: MessageSquare,
    color: 'from-rose-500 to-rose-700',
    bgColor: 'bg-rose-50',
    articleCount: 1240
  },
  {
    id: 'files',
    name: 'ملفات',
    description: 'ملفات وتقارير معمقة حول قضايا اقتصادية محورية',
    icon: FolderOpen,
    color: 'from-slate-500 to-slate-700',
    bgColor: 'bg-slate-50',
    articleCount: 320
  },
  {
    id: 'video',
    name: 'فيديو',
    description: 'محتوى مرئي من مقابلات وتقارير وتحليلات',
    icon: Play,
    color: 'from-red-500 to-red-700',
    bgColor: 'bg-red-50',
    articleCount: 450
  }
];

export default function SectionsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-20 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <span className="text-gold font-[family-name:var(--font-display)] text-sm font-semibold tracking-wider">
                استكشف المحتوى
              </span>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-4">
                الأبواب
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                تصفح أبواب الموقع المختلفة واكتشف المحتوى الذي يهمك
              </p>
            </motion.div>
          </div>
        </section>

        {/* Sections Grid */}
        <section className="py-16">
          <div className="container-luxury">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sections.map((section, index) => (
                <motion.a
                  key={section.id}
                  href={`/sections/${section.id}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  <div className={`${section.bgColor} rounded-2xl p-6 h-full transition-all duration-500 group-hover:shadow-xl relative overflow-hidden`}>
                    {/* Decorative gradient */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${section.color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />

                    <div className="relative">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg`}>
                        <section.icon className="text-white" size={24} />
                      </div>

                      {/* Content */}
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-xl text-navy mb-2 group-hover:text-gold transition-colors">
                        {section.name}
                      </h3>
                      <p className="text-slate text-sm mb-4 line-clamp-2">
                        {section.description}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate font-[family-name:var(--font-display)]">
                          {section.articleCount.toLocaleString('ar-SA')} مقال
                        </span>
                        <span className="flex items-center gap-1 text-gold text-sm font-[family-name:var(--font-display)] font-semibold group-hover:gap-2 transition-all">
                          تصفح
                          <ArrowUpLeft size={16} />
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
