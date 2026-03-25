/**
 * Admin Articles Page
 * IKTISSAD Design System
 *
 * Article management page with search, filters, and bulk actions.
 * Fetches real data from /api/articles via SWR.
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Calendar,
  ChevronDown,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Upload,
  Loader2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { Button, Badge, StatusBadge } from '@/components/ui';
import { swrFetcher, articlesKey, deleteArticle } from '@/lib/api-client';
import type { Article, ApiResponse } from '@/types';
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary';
import { ArticleType } from '@/lib/ai/arabic-editorial';
import ArticlePresenceBadge from '@/components/admin/ArticlePresenceBadge';
import type { MeData } from '@/app/api/auth/me/route';

// ─── Article type badge config ───────────────────────────────────────────────

const ARTICLE_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  news:      { label: 'خبر',    className: 'text-zinc-300  bg-zinc-700/40  border border-zinc-600/40' },
  report:    { label: 'تقرير',  className: 'text-blue-300  bg-blue-700/20  border border-blue-600/30' },
  analysis:  { label: 'تحليل',  className: 'text-purple-300 bg-purple-700/20 border border-purple-600/30' },
  interview: { label: 'مقابلة', className: 'text-amber-300 bg-amber-700/20  border border-amber-600/30' },
  opinion:   { label: 'رأي',    className: 'text-green-300  bg-green-700/20  border border-green-600/30' },
};

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const statusKeys = ['all', 'published', 'draft', 'review', 'scheduled'] as const;

type StatusKey = typeof statusKeys[number];
type ArticleStatus = 'published' | 'draft' | 'review' | 'scheduled';


// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ArticlesPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusKey>('all');
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'title'>('date');
  const [filterCountry, setFilterCountry] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Build SWR key from filters
  const swrKey = articlesKey({
    page,
    pageSize,
    section: selectedSection !== 'all' ? selectedSection : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    search: searchQuery || undefined,
    country: filterCountry || undefined,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: countriesRes } = useSWR<any>('/api/countries', swrFetcher, { revalidateOnFocus: false });
  const countries: { slug: string; name: string }[] = countriesRes?.data ?? [];

  const { data, isLoading, mutate } = useSWR<ApiResponse<Article[]>>(
    swrKey,
    swrFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const articles = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 1;

  // Current user identity for presence badges (cached, shared with editor page)
  const { data: meRes } = useSWR<ApiResponse<MeData>>(
    '/api/auth/me',
    swrFetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
  const presenceCurrentUser = meRes?.data
    ? { userId: meRes.data.id, name: meRes.data.name, avatarUrl: meRes.data.avatarUrl }
    : null;

  const publishedCount = articles.filter(a => a.status === 'published').length;

  // Get status label from translations
  const getStatusLabel = (status: StatusKey): string => {
    if (status === 'all') return t('admin.articles.filters.all');
    return t(`admin.articles.status.${status}`);
  };

  const toggleSelectArticle = (id: string) => {
    setSelectedArticles((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedArticles.length === articles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(articles.map((a) => a.id));
    }
  };

  const getStatusIcon = (status: ArticleStatus) => {
    switch (status) {
      case 'published':
        return <CheckCircle size={iconSizes.sm} className="text-profit" />;
      case 'draft':
        return <FileText size={iconSizes.sm} className="text-white/50" />;
      case 'review':
        return <AlertCircle size={iconSizes.sm} className="text-gold" />;
      case 'scheduled':
        return <Clock size={iconSizes.sm} className="text-teal" />;
      default:
        return null;
    }
  };

  // Delete a single article
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteArticle(id);
      toast.success(t('admin.articles.actions.deleted'));
      mutate();
      setOpenMenu(null);
    } catch (err: any) {
      toast.error(err.message || t('admin.common.error'));
    }
  }, [mutate, t]);

  // Bulk delete
  const handleBulkDelete = useCallback(async () => {
    try {
      await Promise.all(selectedArticles.map((id) => deleteArticle(id)));
      toast.success(t('admin.articles.bulkActions.deleteSuccess'));
      setSelectedArticles([]);
      mutate();
    } catch (err: any) {
      toast.error(err.message || t('admin.common.error'));
    }
  }, [selectedArticles, mutate, t]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.articles.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {total} {t('admin.common.articles')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/articles/new">
            <Button variant="primary" size="md" leftIcon={<Plus size={iconSizes.md} />}>
              {t('admin.articles.newArticle')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={t('admin.articles.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-all font-[family-name:var(--font-display)] text-sm ${
              showFilters
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-white/5 border-gold/10 text-white/70 hover:text-white'
            }`}
          >
            <Filter size={iconSizes.md} />
            {t('admin.articles.filters.title')}
            <ChevronDown size={iconSizes.sm} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gold/10 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    {t('admin.articles.filters.status')}
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value as StatusKey); setPage(1); }}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {statusKeys.map((status) => (
                      <option key={status} value={status} className="bg-midnight">
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Country Filter */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    البلد
                  </label>
                  <select
                    value={filterCountry}
                    onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    <option value="" className="bg-midnight">كل البلدان</option>
                    {countries.map((c) => (
                      <option key={c.slug} value={c.slug} className="bg-midnight">{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    {t('admin.articles.filters.sortBy')}
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'views' | 'title')}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    <option value="date" className="bg-midnight">{t('admin.articles.filters.sortOptions.date')}</option>
                    <option value="views" className="bg-midnight">{t('admin.articles.filters.sortOptions.views')}</option>
                    <option value="title" className="bg-midnight">{t('admin.articles.filters.sortOptions.title')}</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedArticles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gold/10 border border-gold/20 rounded-xl p-4 flex items-center justify-between"
          >
            <span className="text-gold font-[family-name:var(--font-display)] text-sm">
              {t('admin.articles.bulkActions.selected', { count: selectedArticles.length })}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                {t('admin.articles.bulkActions.delete')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedArticles([])}>
                {t('admin.articles.bulkActions.deselect')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Articles Table */}
      <SectionErrorBoundary section="articles-table">
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
        {isLoading && articles.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-gold/50" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 font-[family-name:var(--font-display)]">
              {t('admin.articles.empty')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 bg-white/5">
                  <th className="text-right p-4">
                    <input
                      type="checkbox"
                      checked={selectedArticles.length === articles.length && articles.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gold/30 bg-transparent checked:bg-gold"
                    />
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.article')}
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.author')}
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.section')}
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.status')}
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.stats')}
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.date')}
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.articles.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article, index) => (
                  <motion.tr
                    key={article.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-b border-gold/5 hover:bg-white/5 transition-colors ${
                      selectedArticles.includes(article.id) ? 'bg-gold/5' : ''
                    }`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedArticles.includes(article.id)}
                        onChange={() => toggleSelectArticle(article.id)}
                        className="w-4 h-4 rounded border-gold/30 bg-transparent checked:bg-gold"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {article.featuredImage && (
                          <img
                            src={article.featuredImage}
                            alt={article.title}
                            className="w-16 h-10 object-cover rounded-lg"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Link
                              href={`/admin/articles/${article.id}`}
                              className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm font-medium line-clamp-1"
                            >
                              {article.title}
                            </Link>
                            {(article as any).articleType && ARTICLE_TYPE_BADGE[(article as any).articleType] && (
                              <span
                                className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-[family-name:var(--font-display)] font-semibold ${ARTICLE_TYPE_BADGE[(article as any).articleType].className}`}
                              >
                                {ARTICLE_TYPE_BADGE[(article as any).articleType].label}
                              </span>
                            )}
                          </div>
                          <p className="text-white/40 text-xs line-clamp-1">
                            {article.excerpt}
                          </p>
                          <ArticlePresenceBadge
                            articleId={article.id}
                            currentUser={presenceCurrentUser}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-white/70 text-sm font-[family-name:var(--font-display)]">
                      {article.author?.name ?? '-'}
                    </td>
                    <td className="p-4">
                      <Badge variant="warning" size="sm">
                        {article.section || '-'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-[family-name:var(--font-display)] ${
                        article.status === 'published'
                          ? 'bg-profit/10 text-profit'
                          : article.status === 'draft'
                            ? 'bg-white/10 text-white/60'
                            : article.status === 'scheduled'
                              ? 'bg-teal/10 text-teal'
                              : 'bg-gold/10 text-gold'
                      }`}>
                        {getStatusIcon(article.status)}
                        {t(`admin.articles.status.${article.status}`)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-4 text-white/50 text-xs">
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {article.views.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-white/50 text-xs font-[family-name:var(--font-display)] flex items-center gap-1">
                        <Calendar size={12} />
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory')
                          : new Date(article.createdAt).toLocaleDateString('ar-SA-u-ca-gregory')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === article.id ? null : article.id)}
                          className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <MoreVertical size={iconSizes.md} />
                        </button>
                        <AnimatePresence>
                          {openMenu === article.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute left-0 top-full mt-1 w-40 bg-midnight border border-gold/10 rounded-xl shadow-elevated overflow-hidden z-10"
                            >
                              <Link
                                href={`/admin/articles/${article.id}`}
                                className="flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]"
                              >
                                <Edit size={iconSizes.sm} />
                                {t('admin.articles.actions.edit')}
                              </Link>
                              <a
                                href={`/${article.slug}`}
                                target="_blank"
                                className="flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]"
                              >
                                <Eye size={iconSizes.sm} />
                                {t('admin.articles.actions.preview')}
                              </a>
                              <button
                                onClick={() => handleDelete(article.id)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-loss hover:bg-loss/10 transition-colors text-sm font-[family-name:var(--font-display)]"
                              >
                                <Trash2 size={iconSizes.sm} />
                                {t('admin.articles.actions.delete')}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gold/10 flex items-center justify-between">
            <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              {t('admin.articles.pagination.showing', {
                from: (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, total),
                total,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('admin.articles.pagination.previous')}
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                {t('admin.articles.pagination.next')}
              </Button>
            </div>
          </div>
        )}
      </div>
      </SectionErrorBoundary>
    </div>
  );
}
