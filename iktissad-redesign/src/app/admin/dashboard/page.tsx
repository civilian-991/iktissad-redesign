/**
 * Admin Dashboard Page
 * IKTISSAD Design System
 *
 * Main dashboard with statistics, charts, and quick actions.
 * Uses design tokens and i18n for internationalization.
 */

'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
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
import { useTranslation } from '@/lib/i18n';
import { iconSizes, colors } from '@/lib/design-tokens';
import { Badge, StatusBadge } from '@/components/ui';

// ═══════════════════════════════════════════════════════════════
// STATS CONFIGURATION
// ═══════════════════════════════════════════════════════════════

interface StatConfig {
  key: 'visitsToday' | 'publishedArticles' | 'activeUsers' | 'newComments';
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: typeof Eye;
  color: string;
}

const statsConfig: StatConfig[] = [
  {
    key: 'visitsToday',
    value: '24,521',
    change: '+12.5%',
    trend: 'up',
    icon: Eye,
    color: 'from-emerald-500 to-teal',
  },
  {
    key: 'publishedArticles',
    value: '1,847',
    change: '+3.2%',
    trend: 'up',
    icon: FileText,
    color: 'from-gold to-bronze',
  },
  {
    key: 'activeUsers',
    value: '8,429',
    change: '-2.1%',
    trend: 'down',
    icon: Users,
    color: 'from-purple-500 to-indigo-600',
  },
  {
    key: 'newComments',
    value: '342',
    change: '+18.7%',
    trend: 'up',
    icon: MessageSquare,
    color: 'from-rose-500 to-pink-600',
  },
];

// Chart data (mock)
const chartDataConfig = [
  { dayKey: 'saturday', views: 4200, articles: 12 },
  { dayKey: 'sunday', views: 5100, articles: 15 },
  { dayKey: 'monday', views: 4800, articles: 18 },
  { dayKey: 'tuesday', views: 6200, articles: 22 },
  { dayKey: 'wednesday', views: 5800, articles: 20 },
  { dayKey: 'thursday', views: 7100, articles: 25 },
  { dayKey: 'friday', views: 6500, articles: 19 },
];

// Recent articles
const recentArticles = [
  {
    id: 1,
    titleKey: 'centralBankMeasures',
    title: 'البنك المركزي يعلن عن إجراءات جديدة لدعم الاقتصاد',
    categoryKey: 'economy',
    status: 'published' as const,
    views: 12500,
    date: '2024-01-15',
  },
  {
    id: 2,
    titleKey: 'stockMarketRise',
    title: 'ارتفاع مؤشرات البورصة مع تزايد ثقة المستثمرين',
    categoryKey: 'markets',
    status: 'published' as const,
    views: 8900,
    date: '2024-01-15',
  },
  {
    id: 3,
    titleKey: 'techSectorGrowth',
    title: 'قطاع التكنولوجيا يقود النمو في الربع الأخير',
    categoryKey: 'technology',
    status: 'draft' as const,
    views: 0,
    date: '2024-01-14',
  },
  {
    id: 4,
    titleKey: 'gdpGrowth',
    title: 'توقعات بنمو الناتج المحلي بنسبة 4%',
    categoryKey: 'economy',
    status: 'review' as const,
    views: 0,
    date: '2024-01-14',
  },
];

// Top countries
const topCountries = [
  { nameKey: 'saudi', visitors: 8520, percentage: 35 },
  { nameKey: 'uae', visitors: 5230, percentage: 22 },
  { nameKey: 'egypt', visitors: 4100, percentage: 17 },
  { nameKey: 'lebanon', visitors: 3200, percentage: 13 },
  { nameKey: 'kuwait', visitors: 2100, percentage: 9 },
];

// Activity log
interface ActivityItem {
  type: 'article' | 'comment' | 'user';
  user: string;
  actionKey: string;
  actionParams?: Record<string, number>;
  timeKey: string;
  timeValue: number;
}

const activities: ActivityItem[] = [
  { type: 'article', user: 'أحمد المنصور', actionKey: 'publishedArticle', timeKey: 'minutesAgo', timeValue: 5 },
  { type: 'comment', user: 'سارة العلي', actionKey: 'approvedComments', actionParams: { count: 3 }, timeKey: 'minutesAgo', timeValue: 15 },
  { type: 'user', user: 'system', actionKey: 'newUserRegistered', timeKey: 'minutesAgo', timeValue: 30 },
  { type: 'article', user: 'محمد الخالدي', actionKey: 'editedArticle', timeKey: 'hourAgo', timeValue: 1 },
];

// ═══════════════════════════════════════════════════════════════
// QUICK ACTIONS CONFIG
// ═══════════════════════════════════════════════════════════════

interface QuickAction {
  icon: typeof FileText;
  labelKey: 'newArticle' | 'addUser' | 'schedulePost' | 'quickSettings';
  href: string;
  color: string;
}

const quickActionsConfig: QuickAction[] = [
  { icon: FileText, labelKey: 'newArticle', href: '/admin/articles/new', color: 'from-gold to-bronze' },
  { icon: Users, labelKey: 'addUser', href: '/admin/users/new', color: 'from-purple-500 to-indigo-600' },
  { icon: Calendar, labelKey: 'schedulePost', href: '#', color: 'from-teal to-emerald-600' },
  { icon: Zap, labelKey: 'quickSettings', href: '/admin/settings', color: 'from-rose-500 to-pink-600' },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const maxViews = Math.max(...chartDataConfig.map(d => d.views));

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'default';
      case 'review':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getCategoryName = (key: string) => {
    const categories: Record<string, string> = {
      economy: t('nav.sections.economy'),
      markets: t('nav.sections.markets'),
      technology: t('nav.sections.technology'),
      companies: t('nav.sections.companies'),
    };
    return categories[key] || key;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.common.dashboard')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.dashboard.welcome')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['day', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg font-[family-name:var(--font-display)] text-sm transition-all ${
                selectedPeriod === period
                  ? 'bg-gold text-obsidian font-semibold'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t(`admin.dashboard.periods.${period === 'day' ? 'today' : period}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, index) => (
          <motion.div
            key={stat.key}
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
                  <stat.icon className="text-white" size={iconSizes.lg} />
                </div>
                <span className={`flex items-center gap-1 text-sm font-[family-name:var(--font-display)] font-semibold ${
                  stat.trend === 'up' ? 'text-profit' : 'text-loss'
                }`}>
                  {stat.trend === 'up' ? <TrendingUp size={iconSizes.sm} /> : <TrendingDown size={iconSizes.sm} />}
                  {stat.change}
                </span>
              </div>
              <h3 className="text-white/60 text-sm font-[family-name:var(--font-display)] mb-1">
                {t(`admin.dashboard.stats.${stat.key}`)}
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
                {t('admin.dashboard.charts.visits')}
              </h2>
              <p className="text-white/50 text-sm">
                {t('admin.dashboard.charts.last7Days')}
              </p>
            </div>
            <button className="p-2 text-white/40 hover:text-white transition-colors">
              <MoreVertical size={iconSizes.md} />
            </button>
          </div>

          {/* Simple Bar Chart */}
          <div className="h-64 flex items-end gap-3">
            {chartDataConfig.map((data, index) => (
              <div key={data.dayKey} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(data.views / maxViews) * 100}%` }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="w-full bg-gradient-to-t from-gold/80 to-gold/40 rounded-t-lg relative group cursor-pointer hover:from-gold hover:to-gold/60 transition-colors"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-obsidian border border-gold/20 rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    <span className="text-white text-sm font-[family-name:var(--font-display)]">
                      {data.views.toLocaleString()} {t('admin.dashboard.charts.visit')}
                    </span>
                  </div>
                </motion.div>
                <span className="text-white/50 text-xs font-[family-name:var(--font-display)]">
                  {t(`admin.dashboard.days.${data.dayKey}`)}
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
              <Globe size={iconSizes.md} className="text-gold" />
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                {t('admin.dashboard.topCountries')}
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {topCountries.map((country, index) => (
              <div key={country.nameKey} className="flex items-center gap-3">
                <span className="w-6 text-center text-white/40 text-sm font-[family-name:var(--font-display)]">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-[family-name:var(--font-display)]">
                      {t(`countries.${country.nameKey}`)}
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
              <FileText size={iconSizes.md} className="text-gold" />
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                {t('admin.dashboard.latestArticles')}
              </h2>
            </div>
            <Link href="/admin/articles" className="flex items-center gap-1 text-gold text-sm font-[family-name:var(--font-display)] hover:underline">
              {t('common.actions.viewAll')}
              <ArrowUpLeft size={iconSizes.sm} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10">
                  <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.article')}
                  </th>
                  <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.section')}
                  </th>
                  <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.status')}
                  </th>
                  <th className="text-right pb-3 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.stats')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentArticles.map((article) => (
                  <tr key={article.id} className="border-b border-gold/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-0 pl-4">
                      <Link href={`/admin/articles/${article.id}`} className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm line-clamp-1">
                        {article.title}
                      </Link>
                    </td>
                    <td className="py-4">
                      <Badge variant="warning" size="sm">
                        {getCategoryName(article.categoryKey)}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <StatusBadge status={article.status} />
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
            <Activity size={iconSizes.md} className="text-gold" />
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
              {t('admin.dashboard.latestActivity')}
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
                  {activity.type === 'article' ? <FileText size={iconSizes.sm} /> :
                   activity.type === 'comment' ? <MessageSquare size={iconSizes.sm} /> :
                   <Users size={iconSizes.sm} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-[family-name:var(--font-display)]">
                    <span className="text-gold">
                      {activity.user === 'system' ? t('admin.dashboard.activity.system') : activity.user}
                    </span>
                    {' '}
                    {t(`admin.dashboard.activity.${activity.actionKey}`)}
                  </p>
                  <span className="text-white/40 text-xs flex items-center gap-1">
                    <Clock size={10} />
                    {t(`common.time.${activity.timeKey}`, { count: activity.timeValue })}
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
        {quickActionsConfig.map((action) => (
          <Link
            key={action.labelKey}
            href={action.href}
            className="group bg-midnight/50 border border-gold/10 rounded-xl p-5 hover:border-gold/20 transition-all"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <action.icon className="text-white" size={iconSizes.md} />
            </div>
            <span className="text-white font-[family-name:var(--font-display)] text-sm group-hover:text-gold transition-colors">
              {t(`admin.dashboard.quickActions.${action.labelKey}`)}
            </span>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
