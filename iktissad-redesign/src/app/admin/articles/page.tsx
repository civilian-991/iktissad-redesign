/**
 * Admin Articles Page
 * IKTISSAD Design System
 *
 * Article management page with search, filters, and bulk actions.
 * Uses design tokens and i18n for internationalization.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
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
  Upload
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { Button, Badge, StatusBadge, SearchInput } from '@/components/ui';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const categoryKeys = ['all', 'economy', 'markets', 'companies', 'technology', 'investment', 'energy'] as const;
const statusKeys = ['all', 'published', 'draft', 'review', 'scheduled'] as const;

type CategoryKey = typeof categoryKeys[number];
type StatusKey = typeof statusKeys[number];
type ArticleStatus = 'published' | 'draft' | 'review' | 'scheduled';

interface Article {
  id: number;
  title: string;
  excerpt: string;
  categoryKey: string;
  author: string;
  status: ArticleStatus;
  views: number;
  comments: number;
  date: string;
  image: string;
}

// Mock articles data
const mockArticles: Article[] = [
  {
    id: 1,
    title: 'البنك المركزي يعلن عن إجراءات جديدة لدعم الاقتصاد',
    excerpt: 'أعلن البنك المركزي عن حزمة من الإجراءات الجديدة التي تهدف إلى دعم النمو الاقتصادي...',
    categoryKey: 'economy',
    author: 'أحمد المنصور',
    status: 'published',
    views: 12500,
    comments: 45,
    date: '2024-01-15',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=60&fit=crop',
  },
  {
    id: 2,
    title: 'ارتفاع مؤشرات البورصة مع تزايد ثقة المستثمرين',
    excerpt: 'شهدت البورصة ارتفاعاً ملحوظاً في مؤشراتها الرئيسية...',
    categoryKey: 'markets',
    author: 'سارة العلي',
    status: 'published',
    views: 8900,
    comments: 32,
    date: '2024-01-15',
    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=100&h=60&fit=crop',
  },
  {
    id: 3,
    title: 'قطاع التكنولوجيا يقود النمو في الربع الأخير',
    excerpt: 'حقق قطاع التكنولوجيا نمواً استثنائياً خلال الربع الأخير من العام...',
    categoryKey: 'technology',
    author: 'محمد الخالدي',
    status: 'draft',
    views: 0,
    comments: 0,
    date: '2024-01-14',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=60&fit=crop',
  },
  {
    id: 4,
    title: 'توقعات بنمو الناتج المحلي بنسبة 4% خلال العام الجاري',
    excerpt: 'توقع خبراء اقتصاديون نمو الناتج المحلي الإجمالي...',
    categoryKey: 'economy',
    author: 'نور الدين',
    status: 'review',
    views: 0,
    comments: 0,
    date: '2024-01-14',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=60&fit=crop',
  },
  {
    id: 5,
    title: 'الاستثمارات الأجنبية تتجاوز التوقعات',
    excerpt: 'سجلت الاستثمارات الأجنبية المباشرة أرقاماً قياسية...',
    categoryKey: 'investment',
    author: 'فاطمة الزهراء',
    status: 'published',
    views: 6700,
    comments: 28,
    date: '2024-01-13',
    image: 'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=100&h=60&fit=crop',
  },
  {
    id: 6,
    title: 'قمة اقتصادية تجمع قادة الأعمال في المنطقة',
    excerpt: 'انطلقت أعمال القمة الاقتصادية السنوية...',
    categoryKey: 'companies',
    author: 'عمر الشريف',
    status: 'scheduled',
    views: 0,
    comments: 0,
    date: '2024-01-20',
    image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=100&h=60&fit=crop',
  },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ArticlesPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusKey>('all');
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'title'>('date');
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  // Get category name from translations
  const getCategoryName = (key: string): string => {
    if (key === 'all') return t('admin.articles.filters.all');
    const categories: Record<string, string> = {
      economy: t('nav.sections.economy'),
      markets: t('nav.sections.markets'),
      companies: t('nav.sections.companies'),
      technology: t('nav.sections.technology'),
      investment: t('nav.sectors.investment'),
      energy: t('nav.sections.energy'),
    };
    return categories[key] || key;
  };

  // Get status label from translations
  const getStatusLabel = (status: StatusKey): string => {
    if (status === 'all') return t('admin.articles.filters.all');
    return t(`admin.articles.status.${status}`);
  };

  const filteredArticles = mockArticles.filter((article) => {
    const matchesSearch = article.title.includes(searchQuery) || article.excerpt.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || article.categoryKey === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || article.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const toggleSelectArticle = (id: number) => {
    setSelectedArticles((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedArticles.length === filteredArticles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(filteredArticles.map((a) => a.id));
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

  const publishedCount = mockArticles.filter(a => a.status === 'published').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.articles.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {mockArticles.length} {t('admin.common.articles')} • {publishedCount} {t('admin.articles.status.published')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="md" leftIcon={<Upload size={iconSizes.md} />}>
            {t('common.actions.import')}
          </Button>
          <Button variant="ghost" size="md" leftIcon={<Download size={iconSizes.md} />}>
            {t('common.actions.export')}
          </Button>
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
              onChange={(e) => setSearchQuery(e.target.value)}
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
              <div className="pt-4 mt-4 border-t border-gold/10 grid md:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    {t('admin.articles.filters.section')}
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as CategoryKey)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {categoryKeys.map((cat) => (
                      <option key={cat} value={cat} className="bg-midnight">
                        {getCategoryName(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    {t('admin.articles.filters.status')}
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as StatusKey)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {statusKeys.map((status) => (
                      <option key={status} value={status} className="bg-midnight">
                        {getStatusLabel(status)}
                      </option>
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
              <Button variant="success" size="sm">
                {t('admin.articles.bulkActions.publish')}
              </Button>
              <Button variant="danger" size="sm">
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
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 bg-white/5">
                <th className="text-right p-4">
                  <input
                    type="checkbox"
                    checked={selectedArticles.length === filteredArticles.length && filteredArticles.length > 0}
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
              {filteredArticles.map((article, index) => (
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
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-16 h-10 object-cover rounded-lg"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/articles/${article.id}`}
                          className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm font-medium line-clamp-1"
                        >
                          {article.title}
                        </Link>
                        <p className="text-white/40 text-xs line-clamp-1">
                          {article.excerpt}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-white/70 text-sm font-[family-name:var(--font-display)]">
                    {article.author}
                  </td>
                  <td className="p-4">
                    <Badge variant="gold" size="sm">
                      {getCategoryName(article.categoryKey)}
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
                      {new Date(article.date).toLocaleDateString('ar-SA')}
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
                              href={`/news/${article.id}`}
                              target="_blank"
                              className="flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]"
                            >
                              <Eye size={iconSizes.sm} />
                              {t('admin.articles.actions.preview')}
                            </a>
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-loss hover:bg-loss/10 transition-colors text-sm font-[family-name:var(--font-display)]">
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

        {/* Pagination */}
        <div className="p-4 border-t border-gold/10 flex items-center justify-between">
          <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.articles.pagination.showing', { from: 1, to: filteredArticles.length, total: mockArticles.length })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              {t('admin.articles.pagination.previous')}
            </Button>
            <Button variant="primary" size="sm">
              1
            </Button>
            <Button variant="ghost" size="sm">
              2
            </Button>
            <Button variant="ghost" size="sm">
              {t('admin.articles.pagination.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
