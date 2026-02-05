'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Building2,
  Fuel,
  Plane,
  Cpu,
  Car,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const sectorsData: Record<string, { name: string; icon: typeof TrendingUp; color: string; description: string }> = {
  economy: { name: 'اقتصاد عام', icon: TrendingUp, color: 'from-emerald-500 to-emerald-700', description: 'أخبار وتحليلات الاقتصاد الكلي' },
  finance: { name: 'مال ومصارف', icon: Building2, color: 'from-blue-500 to-blue-700', description: 'البنوك والأسواق المالية' },
  energy: { name: 'طاقة', icon: Fuel, color: 'from-amber-500 to-amber-700', description: 'قطاع الطاقة والكهرباء' },
  'oil-gas': { name: 'نفط وغاز', icon: Fuel, color: 'from-orange-500 to-orange-700', description: 'صناعة النفط والغاز' },
  tourism: { name: 'سياحة وطيران', icon: Plane, color: 'from-sky-500 to-sky-700', description: 'السياحة والضيافة والطيران' },
  technology: { name: 'تكنولوجيا', icon: Cpu, color: 'from-purple-500 to-purple-700', description: 'التقنية والابتكار' },
  automotive: { name: 'سيارات ومحركات', icon: Car, color: 'from-red-500 to-red-700', description: 'صناعة السيارات' },
};

const articles = [
  { id: 1, title: 'فتح السوق السعودي أمام جميع فئات المستثمرين الأجانب اعتباراً من أول فبراير 2026', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop', date: '11 يناير 2026', views: '12,450', featured: true },
  { id: 2, title: 'البنك المركزي المصري يسجل أعلى احتياطي نقد أجنبي عند 51.45 مليار دولار', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop', date: '7 يناير 2026', views: '8,320' },
  { id: 3, title: '"المعمر لأنظمة المعلومات" توافق على المساهمة في رفع رأس مال بنك فيجن', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop', date: '5 يناير 2026', views: '5,120' },
  { id: 4, title: 'خبراء الأمم المتحدة يتوقعون نمو الاقتصاد العالمي بنسبة 2.7% لسنة 2026', image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&h=400&fit=crop', date: '10 يناير 2026', views: '9,870' },
  { id: 5, title: 'مباحثات بين وزيري الزراعة في سوريا ولبنان لتعزيز التعاون الثنائي', image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop', date: '11 يناير 2026', views: '3,450' },
  { id: 6, title: 'الناتج المحلي الإجمالي للدول العربية يتجاوز 3.5 تريليون دولار', image: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=600&h=400&fit=crop', date: '9 يناير 2026', views: '6,780' },
  { id: 7, title: 'صندوق النقد الدولي يرفع توقعاته لنمو اقتصادات الخليج في 2026', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop', date: '8 يناير 2026', views: '4,560' },
  { id: 8, title: 'الإمارات تطلق استراتيجية جديدة لتنويع مصادر الدخل', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop', date: '6 يناير 2026', views: '7,890' },
];

export default function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  // In Next.js 15, params is a Promise that needs to be unwrapped
  // For now, we'll use a default value
  const slug = 'finance';
  const sector = sectorsData[slug] || sectorsData.finance;
  const Icon = sector.icon;

  const featuredArticle = articles.find(a => a.featured);
  const regularArticles = articles.filter(a => !a.featured);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className={`relative bg-gradient-to-br ${sector.color} py-16 overflow-hidden`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />
          </div>

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Icon className="text-white" size={40} />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-2">
                  {sector.name}
                </h1>
                <p className="text-white/80 text-lg">
                  {sector.description}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container-luxury">
            {/* Featured Article */}
            {featuredArticle && (
              <motion.a
                href={`/news/${featuredArticle.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="block mb-12"
              >
                <div className="relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden group">
                  <img
                    src={featuredArticle.image}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12">
                    <span className="news-tag mb-4">مقال مميز</span>
                    <h2 className="text-2xl lg:text-4xl font-[family-name:var(--font-display)] font-bold text-white leading-tight mb-4 group-hover:text-gold transition-colors">
                      {featuredArticle.title}
                    </h2>
                    <div className="flex items-center gap-6 text-white/60 text-sm">
                      <span className="flex items-center gap-2">
                        <Clock size={16} />
                        {featuredArticle.date}
                      </span>
                      <span>{featuredArticle.views} مشاهدة</span>
                    </div>
                  </div>
                </div>
              </motion.a>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-navy font-[family-name:var(--font-display)] text-sm hover:shadow-md transition-shadow">
                  <Filter size={16} />
                  فلترة
                </button>
                <span className="text-slate text-sm">
                  {articles.length} مقال
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gold text-white' : 'text-slate hover:text-navy'}`}
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-gold text-white' : 'text-slate hover:text-navy'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {/* Articles Grid/List */}
            <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {regularArticles.map((article, index) => (
                <motion.a
                  key={article.id}
                  href={`/news/${article.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group ${viewMode === 'list' ? 'flex gap-6 bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-shadow' : ''}`}
                >
                  {viewMode === 'grid' ? (
                    <div className="card-luxury">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div className="p-5">
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy leading-snug line-clamp-2 group-hover:text-gold transition-colors mb-3">
                          {article.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm text-slate">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {article.date}
                          </span>
                          <span>{article.views} مشاهدة</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-40 h-28 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <h3 className="font-[family-name:var(--font-display)] font-bold text-navy leading-snug group-hover:text-gold transition-colors mb-2">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slate">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {article.date}
                          </span>
                          <span>{article.views} مشاهدة</span>
                        </div>
                      </div>
                    </>
                  )}
                </motion.a>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-navy hover:bg-gold hover:text-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              {[1, 2, 3, 4, 5].map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg font-[family-name:var(--font-display)] font-semibold transition-colors ${
                    currentPage === page
                      ? 'bg-gold text-white'
                      : 'bg-white shadow-sm text-navy hover:bg-gold hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(5, p + 1))}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-navy hover:bg-gold hover:text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
