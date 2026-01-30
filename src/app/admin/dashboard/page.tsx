'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  Users,
  MessageSquare,
  ArrowUpLeft,
  MoreVertical,
  Calendar,
  Clock,
  Zap,
  Globe,
  Activity
} from 'lucide-react';

// Stats data
const stats = [
  {
    title: 'الزيارات اليوم',
    value: '24,521',
    change: '+12.5%',
    trend: 'up',
    icon: Eye,
    color: 'from-emerald-500 to-teal',
  },
  {
    title: 'المقالات المنشورة',
    value: '1,847',
    change: '+3.2%',
    trend: 'up',
    icon: FileText,
    color: 'from-gold to-bronze',
  },
  {
    title: 'المستخدمين النشطين',
    value: '8,429',
    change: '-2.1%',
    trend: 'down',
    icon: Users,
    color: 'from-purple-500 to-indigo-600',
  },
  {
    title: 'التعليقات الجديدة',
    value: '342',
    change: '+18.7%',
    trend: 'up',
    icon: MessageSquare,
    color: 'from-rose-500 to-pink-600',
  },
];

// Chart data (mock)
const chartData = [
  { day: 'السبت', views: 4200, articles: 12 },
  { day: 'الأحد', views: 5100, articles: 15 },
  { day: 'الإثنين', views: 4800, articles: 18 },
  { day: 'الثلاثاء', views: 6200, articles: 22 },
  { day: 'الأربعاء', views: 5800, articles: 20 },
  { day: 'الخميس', views: 7100, articles: 25 },
  { day: 'الجمعة', views: 6500, articles: 19 },
];

// Recent articles
const recentArticles = [
  {
    id: 1,
    title: 'البنك المركزي يعلن عن إجراءات جديدة لدعم الاقتصاد',
    category: 'اقتصاد',
    status: 'published',
    views: 12500,
    date: '2024-01-15',
  },
  {
    id: 2,
    title: 'ارتفاع مؤشرات البورصة مع تزايد ثقة المستثمرين',
    category: 'أسواق',
    status: 'published',
    views: 8900,
    date: '2024-01-15',
  },
  {
    id: 3,
    title: 'قطاع التكنولوجيا يقود النمو في الربع الأخير',
    category: 'تكنولوجيا',
    status: 'draft',
    views: 0,
    date: '2024-01-14',
  },
  {
    id: 4,
    title: 'توقعات بنمو الناتج المحلي بنسبة 4%',
    category: 'اقتصاد',
    status: 'review',
    views: 0,
    date: '2024-01-14',
  },
];

// Top countries
const topCountries = [
  { name: 'السعودية', visitors: 8520, percentage: 35 },
  { name: 'الإمارات', visitors: 5230, percentage: 22 },
  { name: 'مصر', visitors: 4100, percentage: 17 },
  { name: 'لبنان', visitors: 3200, percentage: 13 },
  { name: 'الكويت', visitors: 2100, percentage: 9 },
];

// Activity log
const activities = [
  { type: 'article', user: 'أحمد المنصور', action: 'نشر مقال جديد', time: 'منذ 5 دقائق' },
  { type: 'comment', user: 'سارة العلي', action: 'وافق على 3 تعليقات', time: 'منذ 15 دقيقة' },
  { type: 'user', user: 'النظام', action: 'تسجيل مستخدم جديد', time: 'منذ 30 دقيقة' },
  { type: 'article', user: 'محمد الخالدي', action: 'عدّل مقال', time: 'منذ ساعة' },
];

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const maxViews = Math.max(...chartData.map(d => d.views));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            لوحة التحكم
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            مرحباً بك! إليك نظرة عامة على أداء الموقع
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['day', 'week', 'month'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg font-[family-name:var(--font-display)] text-sm transition-all ${
                selectedPeriod === period
                  ? 'bg-gold text-obsidian font-semibold'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {period === 'day' ? 'اليوم' : period === 'week' ? 'الأسبوع' : 'الشهر'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5 overflow-hidden group hover:border-gold/20 transition-colors"
          >
            {/* Background Gradient */}
            <div className={`absolute top-0 left-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:opacity-20 transition-opacity`} />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="text-white" size={22} />
                </div>
                <span className={`flex items-center gap-1 text-sm font-[family-name:var(--font-display)] font-semibold ${
                  stat.trend === 'up' ? 'text-profit' : 'text-loss'
                }`}>
                  {stat.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {stat.change}
                </span>
              </div>
              <h3 className="text-white/60 text-sm font-[family-name:var(--font-display)] mb-1">
                {stat.title}
              </h3>
              <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-white">
                {stat.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-1">
                إحصائيات الزيارات
              </h2>
              <p className="text-white/50 text-sm">
                آخر 7 أيام
              </p>
            </div>
            <button className="p-2 text-white/40 hover:text-white transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>

          {/* Simple Bar Chart */}
          <div className="h-64 flex items-end gap-3">
            {chartData.map((data, index) => (
              <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(data.views / maxViews) * 100}%` }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="w-full bg-gradient-to-t from-gold/80 to-gold/40 rounded-t-lg relative group cursor-pointer hover:from-gold hover:to-gold/60 transition-colors"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-obsidian border border-gold/20 rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    <span className="text-white text-sm font-[family-name:var(--font-display)]">
                      {data.views.toLocaleString()} زيارة
                    </span>
                  </div>
                </motion.div>
                <span className="text-white/50 text-xs font-[family-name:var(--font-display)]">
                  {data.day}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Countries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-gold" />
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                أكثر الدول زيارة
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {topCountries.map((country, index) => (
              <div key={country.name} className="flex items-center gap-3">
                <span className="w-6 text-center text-white/40 text-sm font-[family-name:var(--font-display)]">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-[family-name:var(--font-display)]">
                      {country.name}
                    </span>
                    <span className="text-white/50 text-xs">
                      {country.visitors.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${country.percentage}%` }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-gold to-gold-muted rounded-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Articles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-gold" />
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                آخر المقالات
              </h2>
            </div>
            <a href="/admin/articles" className="flex items-center gap-1 text-gold text-sm font-[family-name:var(--font-display)] hover:underline">
              عرض الكل
              <ArrowUpLeft size={14} />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10">
                  <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    العنوان
                  </th>
                  <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    القسم
                  </th>
                  <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    الحالة
                  </th>
                  <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    المشاهدات
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentArticles.map((article) => (
                  <tr key={article.id} className="border-b border-gold/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-0 pl-4">
                      <a href={`/admin/articles/${article.id}`} className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm line-clamp-1">
                        {article.title}
                      </a>
                    </td>
                    <td className="py-4">
                      <span className="bg-gold/10 text-gold text-xs px-2 py-1 rounded font-[family-name:var(--font-display)]">
                        {article.category}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`text-xs px-2 py-1 rounded font-[family-name:var(--font-display)] ${
                        article.status === 'published'
                          ? 'bg-profit/10 text-profit'
                          : article.status === 'draft'
                            ? 'bg-white/10 text-white/60'
                            : 'bg-gold/10 text-gold'
                      }`}>
                        {article.status === 'published' ? 'منشور' : article.status === 'draft' ? 'مسودة' : 'قيد المراجعة'}
                      </span>
                    </td>
                    <td className="py-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                      {article.views.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Activity Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity size={18} className="text-gold" />
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
              آخر النشاطات
            </h2>
          </div>

          <div className="space-y-4">
            {activities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'article'
                    ? 'bg-gold/10 text-gold'
                    : activity.type === 'comment'
                      ? 'bg-profit/10 text-profit'
                      : 'bg-purple-500/10 text-purple-400'
                }`}>
                  {activity.type === 'article' ? <FileText size={14} /> :
                   activity.type === 'comment' ? <MessageSquare size={14} /> :
                   <Users size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-[family-name:var(--font-display)]">
                    <span className="text-gold">{activity.user}</span>
                    {' '}
                    {activity.action}
                  </p>
                  <span className="text-white/40 text-xs flex items-center gap-1">
                    <Clock size={10} />
                    {activity.time}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { icon: FileText, label: 'مقال جديد', href: '/admin/articles/new', color: 'from-gold to-bronze' },
          { icon: Users, label: 'إضافة مستخدم', href: '/admin/users/new', color: 'from-purple-500 to-indigo-600' },
          { icon: Calendar, label: 'جدولة منشور', href: '#', color: 'from-teal to-emerald-600' },
          { icon: Zap, label: 'إعدادات سريعة', href: '/admin/settings', color: 'from-rose-500 to-pink-600' },
        ].map((action) => (
          <a
            key={action.label}
            href={action.href}
            className="group bg-midnight/50 border border-gold/10 rounded-xl p-5 hover:border-gold/20 transition-all"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <action.icon className="text-white" size={18} />
            </div>
            <span className="text-white font-[family-name:var(--font-display)] text-sm group-hover:text-gold transition-colors">
              {action.label}
            </span>
          </a>
        ))}
      </motion.div>
    </div>
  );
}
