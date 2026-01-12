'use client';

import { motion } from 'motion/react';
import {
  TrendingUp,
  Building2,
  Fuel,
  Plane,
  Cpu,
  Car,
  Leaf,
  Home,
  Heart,
  GraduationCap,
  ArrowUpLeft
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const sectors = [
  {
    id: 'economy',
    name: 'اقتصاد عام',
    description: 'أخبار وتحليلات الاقتصاد الكلي والسياسات الاقتصادية',
    icon: TrendingUp,
    color: 'from-emerald-500 to-emerald-700',
    bgColor: 'bg-emerald-50',
    articleCount: 1250
  },
  {
    id: 'finance',
    name: 'مال ومصارف',
    description: 'البنوك والأسواق المالية والاستثمارات',
    icon: Building2,
    color: 'from-blue-500 to-blue-700',
    bgColor: 'bg-blue-50',
    articleCount: 980
  },
  {
    id: 'energy',
    name: 'طاقة',
    description: 'قطاع الطاقة والكهرباء والطاقة المتجددة',
    icon: Fuel,
    color: 'from-amber-500 to-amber-700',
    bgColor: 'bg-amber-50',
    articleCount: 756
  },
  {
    id: 'oil-gas',
    name: 'نفط وغاز',
    description: 'صناعة النفط والغاز الطبيعي',
    icon: Fuel,
    color: 'from-orange-500 to-orange-700',
    bgColor: 'bg-orange-50',
    articleCount: 892
  },
  {
    id: 'tourism',
    name: 'سياحة وطيران',
    description: 'صناعة السياحة والضيافة والطيران',
    icon: Plane,
    color: 'from-sky-500 to-sky-700',
    bgColor: 'bg-sky-50',
    articleCount: 654
  },
  {
    id: 'technology',
    name: 'تكنولوجيا',
    description: 'التقنية والابتكار والتحول الرقمي',
    icon: Cpu,
    color: 'from-purple-500 to-purple-700',
    bgColor: 'bg-purple-50',
    articleCount: 543
  },
  {
    id: 'automotive',
    name: 'سيارات ومحركات',
    description: 'صناعة السيارات والمركبات',
    icon: Car,
    color: 'from-red-500 to-red-700',
    bgColor: 'bg-red-50',
    articleCount: 421
  },
  {
    id: 'real-estate',
    name: 'عقار وإنشاءات',
    description: 'العقارات والبناء والتطوير العمراني',
    icon: Home,
    color: 'from-slate-500 to-slate-700',
    bgColor: 'bg-slate-50',
    articleCount: 678
  },
  {
    id: 'environment',
    name: 'بيئة',
    description: 'البيئة والاستدامة والتغير المناخي',
    icon: Leaf,
    color: 'from-green-500 to-green-700',
    bgColor: 'bg-green-50',
    articleCount: 234
  },
  {
    id: 'health',
    name: 'صحة',
    description: 'القطاع الصحي والرعاية الطبية',
    icon: Heart,
    color: 'from-rose-500 to-rose-700',
    bgColor: 'bg-rose-50',
    articleCount: 312
  },
  {
    id: 'education',
    name: 'تعليم',
    description: 'التعليم والتدريب والتطوير المهني',
    icon: GraduationCap,
    color: 'from-indigo-500 to-indigo-700',
    bgColor: 'bg-indigo-50',
    articleCount: 198
  }
];

export default function SectorsPage() {
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
                تغطية شاملة
              </span>
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mt-2 mb-4">
                القطاعات
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                تغطية متخصصة لجميع القطاعات الاقتصادية الرئيسية في العالم العربي
              </p>
            </motion.div>
          </div>
        </section>

        {/* Sectors Grid */}
        <section className="py-16">
          <div className="container-luxury">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sectors.map((sector, index) => (
                <motion.a
                  key={sector.id}
                  href={`/sectors/${sector.id}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  <div className={`${sector.bgColor} rounded-2xl p-6 transition-all duration-500 group-hover:shadow-xl relative overflow-hidden`}>
                    {/* Decorative gradient */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${sector.color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />

                    <div className="relative">
                      {/* Icon */}
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${sector.color} flex items-center justify-center mb-4 shadow-lg`}>
                        <sector.icon className="text-white" size={28} />
                      </div>

                      {/* Content */}
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-xl text-navy mb-2 group-hover:text-gold transition-colors">
                        {sector.name}
                      </h3>
                      <p className="text-slate text-sm mb-4">
                        {sector.description}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate font-[family-name:var(--font-display)]">
                          {sector.articleCount.toLocaleString('ar-SA')} مقال
                        </span>
                        <span className="flex items-center gap-1 text-gold text-sm font-[family-name:var(--font-display)] font-semibold group-hover:gap-2 transition-all">
                          استكشف
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
