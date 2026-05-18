/**
 * Admin Dashboard Page
 * IKTISSAD Design System
 *
 * Main dashboard with statistics, charts, and quick actions.
 * Uses design tokens and i18n for internationalization.
 * Fetches real data from API routes via SWR.
 */

'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import useSWR from 'swr';
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
  Zap,
  Globe,
  Activity,
  Loader2,
  BarChart2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { Badge, StatusBadge } from '@/components/ui';
import { swrFetcher, articlesKey, usersKey, magazinesKey, subscribersKey } from '@/lib/api-client';
import type { Article, AdminUser, MagazineIssue, ApiResponse } from '@/types';
import type { Subscriber } from '@/lib/api-client';
import WidgetErrorBoundary from '@/components/admin/WidgetErrorBoundary';
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary';

// ═══════════════════════════════════════════════════════════════
// STATS CONFIGURATION
// ═══════════════════════════════════════════════════════════════

interface StatConfig {
  key: 'visitsToday' | 'publishedArticles' | 'activeUsers' | 'newComments' | 'totalMagazines' | 'activeSubscribers';
  icon: typeof Eye;
  color: string;
}

const statsConfig: StatConfig[] = [
  { key: 'publishedArticles', icon: FileText, color: 'from-gold to-bronze' },
  { key: 'totalMagazines', icon: Activity, color: 'from-emerald-500 to-teal' },
  { key: 'activeSubscribers', icon: Users, color: 'from-purple-500 to-indigo-600' },
  { key: 'activeUsers', icon: MessageSquare, color: 'from-rose-500 to-pink-600' },
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

  // Fetch real data from API
  const { data: articlesRes, isLoading: articlesLoading } = useSWR<ApiResponse<Article[]>>(
    articlesKey({ pageSize: 5 }),
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const { data: usersRes, isLoading: usersLoading } = useSWR<ApiResponse<AdminUser[]>>(
    usersKey({ pageSize: 1 }),
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const { data: magazinesRes, isLoading: magazinesLoading } = useSWR<ApiResponse<MagazineIssue[]>>(
    magazinesKey({ pageSize: 1 }),
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const { data: subscribersRes, isLoading: subscribersLoading } = useSWR<ApiResponse<Subscriber[]>>(
    subscribersKey({ pageSize: 1, status: 'active' }),
    swrFetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const recentArticles = articlesRes?.data ?? [];
  const totalArticles = articlesRes?.pagination?.total ?? 0;
  const totalUsers = usersRes?.pagination?.total ?? 0;
  const totalMagazines = magazinesRes?.pagination?.total ?? 0;
  const activeSubscribers = subscribersRes?.pagination?.total ?? 0;
  const isLoading = articlesLoading || usersLoading || magazinesLoading || subscribersLoading;

  // Build stats values from real data
  const statsValues: Record<string, { value: string; change: string; trend: 'up' | 'down' }> = {
    visitsToday: { value: '-', change: '-', trend: 'up' },
    publishedArticles: { value: totalArticles.toLocaleString('ar'), change: '-', trend: 'up' },
    activeUsers: { value: totalUsers.toLocaleString('ar'), change: '-', trend: 'up' },
    newComments: { value: '-', change: '-', trend: 'up' },
    totalMagazines: { value: totalMagazines.toLocaleString('ar'), change: '-', trend: 'up' },
    activeSubscribers: { value: activeSubscribers.toLocaleString('ar'), change: '-', trend: 'up' },
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
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, index) => {
          const sv = statsValues[stat.key];
          return (
            <WidgetErrorBoundary key={stat.key} label={stat.key}>
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
                  {sv.change !== '-' && (
                    <span className={`flex items-center gap-1 text-sm font-[family-name:var(--font-display)] font-semibold ${
                      sv.trend === 'up' ? 'text-profit' : 'text-loss'
                    }`}>
                      {sv.trend === 'up' ? <TrendingUp size={iconSizes.sm} /> : <TrendingDown size={iconSizes.sm} />}
                      {sv.change}
                    </span>
                  )}
                </div>
                <h3 className="text-white/60 text-sm font-[family-name:var(--font-display)] mb-1">
                  {t(`admin.dashboard.stats.${stat.key}`)}
                </h3>
                <p className="text-3xl font-[family-name:var(--font-display)] font-bold text-white">
                  {isLoading ? (
                    <Loader2 size={24} className="animate-spin text-white/30" />
                  ) : (
                    sv.value
                  )}
                </p>
              </div>
            </motion.div>
            </WidgetErrorBoundary>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart Section — Coming Soon */}
        <WidgetErrorBoundary label="visits-chart">
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

          {/* Coming Soon Placeholder */}
          <div className="h-64 flex flex-col items-center justify-center gap-4 rounded-xl border border-gold/10 bg-white/[0.02]">
            <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center">
              <BarChart2 size={28} className="text-gold/60" />
            </div>
            <div className="text-center">
              <p className="text-gold/80 font-[family-name:var(--font-display)] font-semibold text-base mb-1">
                {t('admin.dashboard.charts.comingSoonTitle')}
              </p>
              <p className="text-white/30 font-[family-name:var(--font-display)] text-sm max-w-xs">
                {t('admin.dashboard.charts.comingSoonDesc')}
              </p>
            </div>
          </div>
        </motion.div>
        </WidgetErrorBoundary>

        {/* Top Countries — Coming Soon */}
        <WidgetErrorBoundary label="top-countries">
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

          {/* Coming Soon Placeholder */}
          <div className="flex flex-col items-center justify-center gap-4 py-10 rounded-xl border border-gold/10 bg-white/[0.02]">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
              <Globe size={22} className="text-gold/60" />
            </div>
            <div className="text-center">
              <p className="text-white/30 font-[family-name:var(--font-display)] text-xs max-w-[180px]">
                {t('admin.dashboard.topCountriesComingSoon')}
              </p>
            </div>
          </div>
        </motion.div>
        </WidgetErrorBoundary>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Articles - from real API */}
        <SectionErrorBoundary section="recent-articles">
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
            {articlesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gold/50" />
              </div>
            ) : recentArticles.length === 0 ? (
              <p className="text-center text-white/40 py-8 font-[family-name:var(--font-display)]">
                {t('admin.articles.empty')}
              </p>
            ) : (
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
                          {article.section || '-'}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <StatusBadge status={article.status} />
                      </td>
                      <td className="py-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                        {article.views.toLocaleString('ar')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
        </SectionErrorBoundary>

        {/* Activity Log — Empty State */}
        <WidgetErrorBoundary label="activity-log">
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

          <div className="flex flex-col items-center justify-center gap-4 py-10 rounded-xl border border-gold/10 bg-white/[0.02]">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Activity size={22} className="text-white/20" />
            </div>
            <div className="text-center">
              <p className="text-white/40 font-[family-name:var(--font-display)] text-sm">
                {t('admin.dashboard.noRecentActivity')}
              </p>
            </div>
          </div>
        </motion.div>
        </WidgetErrorBoundary>
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
