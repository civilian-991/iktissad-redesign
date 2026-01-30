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
  Clock,
  ChevronDown,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Upload
} from 'lucide-react';

// Mock articles data
const mockArticles = [
  {
    id: 1,
    title: 'البنك المركزي يعلن عن إجراءات جديدة لدعم الاقتصاد',
    excerpt: 'أعلن البنك المركزي عن حزمة من الإجراءات الجديدة التي تهدف إلى دعم النمو الاقتصادي...',
    category: 'اقتصاد',
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
    category: 'أسواق',
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
    category: 'تكنولوجيا',
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
    category: 'اقتصاد',
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
    category: 'استثمار',
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
    category: 'شركات',
    author: 'عمر الشريف',
    status: 'scheduled',
    views: 0,
    comments: 0,
    date: '2024-01-20',
    image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=100&h=60&fit=crop',
  },
];

const categories = ['الكل', 'اقتصاد', 'أسواق', 'شركات', 'تكنولوجيا', 'استثمار', 'طاقة'];
const statuses = ['الكل', 'published', 'draft', 'review', 'scheduled'];

export default function ArticlesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filteredArticles = mockArticles.filter((article) => {
    const matchesSearch = article.title.includes(searchQuery) || article.excerpt.includes(searchQuery);
    const matchesCategory = selectedCategory === 'الكل' || article.category === selectedCategory;
    const matchesStatus = selectedStatus === 'الكل' || article.status === selectedStatus;
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle size={14} className="text-profit" />;
      case 'draft':
        return <FileText size={14} className="text-white/50" />;
      case 'review':
        return <AlertCircle size={14} className="text-gold" />;
      case 'scheduled':
        return <Clock size={14} className="text-teal" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return 'منشور';
      case 'draft':
        return 'مسودة';
      case 'review':
        return 'قيد المراجعة';
      case 'scheduled':
        return 'مجدول';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            إدارة المقالات
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {mockArticles.length} مقال • {mockArticles.filter(a => a.status === 'published').length} منشور
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm">
            <Upload size={16} />
            استيراد
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm">
            <Download size={16} />
            تصدير
          </button>
          <Link
            href="/admin/articles/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all"
          >
            <Plus size={18} />
            مقال جديد
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
              placeholder="البحث في المقالات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
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
            <Filter size={16} />
            الفلاتر
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
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
                    القسم
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-midnight">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    الحالة
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status} className="bg-midnight">
                        {status === 'الكل' ? 'الكل' : getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    ترتيب حسب
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    <option value="date" className="bg-midnight">التاريخ</option>
                    <option value="views" className="bg-midnight">المشاهدات</option>
                    <option value="title" className="bg-midnight">العنوان</option>
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
              تم تحديد {selectedArticles.length} مقال
            </span>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-profit/10 text-profit rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-profit/20 transition-colors">
                نشر المحدد
              </button>
              <button className="px-4 py-2 bg-loss/10 text-loss rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-loss/20 transition-colors">
                حذف المحدد
              </button>
              <button
                onClick={() => setSelectedArticles([])}
                className="px-4 py-2 bg-white/5 text-white/70 rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/10 transition-colors"
              >
                إلغاء التحديد
              </button>
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
                  المقال
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  الكاتب
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  القسم
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  الحالة
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  الإحصائيات
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  التاريخ
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  إجراءات
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
                        <a
                          href={`/admin/articles/${article.id}`}
                          className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm font-medium line-clamp-1"
                        >
                          {article.title}
                        </a>
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
                    <span className="bg-gold/10 text-gold text-xs px-2.5 py-1 rounded-lg font-[family-name:var(--font-display)]">
                      {article.category}
                    </span>
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
                      {getStatusLabel(article.status)}
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
                        <MoreVertical size={16} />
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
                              <Edit size={14} />
                              تعديل
                            </Link>
                            <a
                              href={`/news/${article.id}`}
                              target="_blank"
                              className="flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]"
                            >
                              <Eye size={14} />
                              معاينة
                            </a>
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-loss hover:bg-loss/10 transition-colors text-sm font-[family-name:var(--font-display)]">
                              <Trash2 size={14} />
                              حذف
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
            عرض 1-{filteredArticles.length} من {mockArticles.length}
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-white/5 border border-gold/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm font-[family-name:var(--font-display)]">
              السابق
            </button>
            <button className="px-3 py-1.5 bg-gold text-obsidian rounded-lg text-sm font-[family-name:var(--font-display)] font-semibold">
              1
            </button>
            <button className="px-3 py-1.5 bg-white/5 border border-gold/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm font-[family-name:var(--font-display)]">
              2
            </button>
            <button className="px-3 py-1.5 bg-white/5 border border-gold/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm font-[family-name:var(--font-display)]">
              التالي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
