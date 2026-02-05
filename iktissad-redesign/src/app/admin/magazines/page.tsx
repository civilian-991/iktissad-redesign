'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Edit3,
  Trash2,
  Star,
  StarOff,
  Calendar,
  FileText,
  MoreVertical,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Upload,
  Check,
  X
} from 'lucide-react';

const magazines = [
  {
    id: 'AR0542',
    title: 'العدد 542',
    subtitle: 'يناير 2026',
    cover: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=560&fit=crop',
    year: 2026,
    month: 'يناير',
    pages: 84,
    views: 12500,
    downloads: 3200,
    featured: true,
    status: 'published',
    publishDate: '2026-01-01',
    highlights: ['توقعات الاقتصاد العربي 2026', 'مقابلة حصرية مع وزير المالية السعودي', 'ملف خاص: مستقبل التقنية المالية']
  },
  {
    id: 'AR0541',
    title: 'العدد 541',
    subtitle: 'ديسمبر 2025',
    cover: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=560&fit=crop',
    year: 2025,
    month: 'ديسمبر',
    pages: 78,
    views: 15200,
    downloads: 4100,
    featured: false,
    status: 'published',
    publishDate: '2025-12-01',
    highlights: ['أفضل 100 شركة عربية', 'قمة المناخ وتأثيرها على الاقتصاد']
  },
  {
    id: 'AR0540',
    title: 'العدد 540',
    subtitle: 'نوفمبر 2025',
    cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=560&fit=crop',
    year: 2025,
    month: 'نوفمبر',
    pages: 72,
    views: 11800,
    downloads: 2900,
    featured: false,
    status: 'published',
    publishDate: '2025-11-01',
    highlights: ['الاستثمار في العقارات', 'أسواق الخليج']
  },
  {
    id: 'AR0539',
    title: 'العدد 539',
    subtitle: 'أكتوبر 2025',
    cover: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=560&fit=crop',
    year: 2025,
    month: 'أكتوبر',
    pages: 80,
    views: 13400,
    downloads: 3500,
    featured: false,
    status: 'published',
    publishDate: '2025-10-01',
    highlights: ['مؤتمر صندوق النقد الدولي', 'البنوك المركزية العربية']
  },
  {
    id: 'AR0538',
    title: 'العدد 538',
    subtitle: 'سبتمبر 2025',
    cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=560&fit=crop',
    year: 2025,
    month: 'سبتمبر',
    pages: 76,
    views: 10200,
    downloads: 2600,
    featured: false,
    status: 'published',
    publishDate: '2025-09-01',
    highlights: ['الطاقة المتجددة', 'رؤية 2030']
  },
  {
    id: 'AR0543',
    title: 'العدد 543',
    subtitle: 'فبراير 2026',
    cover: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=560&fit=crop',
    year: 2026,
    month: 'فبراير',
    pages: 80,
    views: 0,
    downloads: 0,
    featured: false,
    status: 'draft',
    publishDate: '2026-02-01',
    highlights: ['قمة دافوس 2026', 'الذكاء الاصطناعي في الاقتصاد']
  },
];

const years = [2026, 2025, 2024, 2023];
const statuses = [
  { value: 'all', label: 'الكل' },
  { value: 'published', label: 'منشور' },
  { value: 'draft', label: 'مسودة' },
  { value: 'scheduled', label: 'مجدول' },
];

export default function MagazinesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMagazines, setSelectedMagazines] = useState<string[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [magazineToDelete, setMagazineToDelete] = useState<string | null>(null);

  const filteredMagazines = magazines.filter(mag => {
    const matchesSearch = mag.title.includes(searchQuery) || mag.subtitle.includes(searchQuery);
    const matchesYear = selectedYear === null || mag.year === selectedYear;
    const matchesStatus = selectedStatus === 'all' || mag.status === selectedStatus;
    return matchesSearch && matchesYear && matchesStatus;
  });

  const toggleSelection = (id: string) => {
    setSelectedMagazines(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedMagazines.length === filteredMagazines.length) {
      setSelectedMagazines([]);
    } else {
      setSelectedMagazines(filteredMagazines.map(m => m.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-profit/20 text-profit';
      case 'draft':
        return 'bg-white/10 text-white/60';
      case 'scheduled':
        return 'bg-gold/20 text-gold';
      default:
        return 'bg-white/10 text-white/60';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return 'منشور';
      case 'draft':
        return 'مسودة';
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
            إدارة المجلة
          </h1>
          <p className="text-white/50 text-sm">
            إدارة أعداد مجلة الإقتصاد والأعمال
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/magazines/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-bold rounded-xl hover:shadow-gold transition-all"
          >
            <Plus size={18} />
            عدد جديد
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الأعداد', value: magazines.length, icon: BookOpen, color: 'gold' },
          { label: 'منشورة', value: magazines.filter(m => m.status === 'published').length, icon: Check, color: 'profit' },
          { label: 'مسودات', value: magazines.filter(m => m.status === 'draft').length, icon: FileText, color: 'white' },
          { label: 'إجمالي المشاهدات', value: magazines.reduce((sum, m) => sum + m.views, 0), icon: Eye, color: 'gold' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon size={20} className={`text-${stat.color}`} />
            </div>
            <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
              {typeof stat.value === 'number' && stat.value > 1000
                ? `${(stat.value / 1000).toFixed(1)}K`
                : stat.value}
            </p>
            <p className="text-white/50 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder="بحث في الأعداد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Filter */}
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
              className="bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="">كل السنوات</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors"
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex items-center bg-white/5 border border-gold/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-gold/20 text-gold' : 'text-white/50 hover:text-white'}`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-gold/20 text-gold' : 'text-white/50 hover:text-white'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <AnimatePresence>
          {selectedMagazines.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gold/10 flex items-center gap-4"
            >
              <span className="text-white/60 text-sm">
                تم تحديد {selectedMagazines.length} عدد
              </span>
              <button className="text-sm text-gold hover:text-gold-muted transition-colors">
                تعيين كمميز
              </button>
              <button className="text-sm text-loss hover:text-loss/80 transition-colors">
                حذف المحدد
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Magazines Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMagazines.map((magazine, index) => (
            <motion.div
              key={magazine.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="group relative bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden hover:border-gold/30 transition-all"
            >
              {/* Selection Checkbox */}
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={() => toggleSelection(magazine.id)}
                  className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center ${
                    selectedMagazines.includes(magazine.id)
                      ? 'bg-gold border-gold'
                      : 'border-white/30 bg-black/30 backdrop-blur-sm group-hover:border-white/50'
                  }`}
                >
                  {selectedMagazines.includes(magazine.id) && (
                    <Check size={14} className="text-obsidian" />
                  )}
                </button>
              </div>

              {/* Featured Badge */}
              {magazine.featured && (
                <div className="absolute top-3 left-3 z-10">
                  <Star size={18} className="text-gold fill-gold" />
                </div>
              )}

              {/* Cover */}
              <div className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={magazine.cover}
                  alt={magazine.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />

                {/* Hover Actions */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-obsidian/50">
                  <Link
                    href={`/admin/magazines/${magazine.id}`}
                    className="p-2.5 bg-gold rounded-lg text-obsidian hover:bg-gold-muted transition-colors"
                  >
                    <Edit3 size={16} />
                  </Link>
                  <Link
                    href={`/magazine/${magazine.id}/browse`}
                    target="_blank"
                    className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                  >
                    <Eye size={16} />
                  </Link>
                  <button
                    onClick={() => {
                      setMagazineToDelete(magazine.id);
                      setShowDeleteModal(true);
                    }}
                    className="p-2.5 bg-loss/20 backdrop-blur-sm rounded-lg text-loss hover:bg-loss/30 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-white">
                      {magazine.title}
                    </h3>
                    <p className="text-gold text-sm">{magazine.subtitle}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(magazine.status)}`}>
                    {getStatusLabel(magazine.status)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-white/50 text-xs">
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {magazine.views.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download size={12} />
                    {magazine.downloads.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} />
                    {magazine.pages}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gold/10 bg-white/5">
            <div className="col-span-1">
              <button
                onClick={selectAll}
                className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                  selectedMagazines.length === filteredMagazines.length && filteredMagazines.length > 0
                    ? 'bg-gold border-gold'
                    : 'border-white/30'
                }`}
              >
                {selectedMagazines.length === filteredMagazines.length && filteredMagazines.length > 0 && (
                  <Check size={12} className="text-obsidian" />
                )}
              </button>
            </div>
            <div className="col-span-3 text-white/60 text-sm font-semibold">العدد</div>
            <div className="col-span-2 text-white/60 text-sm font-semibold">الحالة</div>
            <div className="col-span-2 text-white/60 text-sm font-semibold">تاريخ النشر</div>
            <div className="col-span-2 text-white/60 text-sm font-semibold">الإحصائيات</div>
            <div className="col-span-2 text-white/60 text-sm font-semibold text-left">إجراءات</div>
          </div>

          {/* Table Body */}
          {filteredMagazines.map((magazine, index) => (
            <motion.div
              key={magazine.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              className="grid grid-cols-12 gap-4 p-4 border-b border-gold/5 hover:bg-white/5 transition-colors items-center"
            >
              <div className="col-span-1">
                <button
                  onClick={() => toggleSelection(magazine.id)}
                  className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                    selectedMagazines.includes(magazine.id)
                      ? 'bg-gold border-gold'
                      : 'border-white/30'
                  }`}
                >
                  {selectedMagazines.includes(magazine.id) && (
                    <Check size={12} className="text-obsidian" />
                  )}
                </button>
              </div>

              <div className="col-span-3 flex items-center gap-3">
                <img
                  src={magazine.cover}
                  alt={magazine.title}
                  className="w-12 h-16 object-cover rounded-lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-white">
                      {magazine.title}
                    </h3>
                    {magazine.featured && <Star size={14} className="text-gold fill-gold" />}
                  </div>
                  <p className="text-gold text-sm">{magazine.subtitle}</p>
                </div>
              </div>

              <div className="col-span-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(magazine.status)}`}>
                  {getStatusLabel(magazine.status)}
                </span>
              </div>

              <div className="col-span-2 text-white/60 text-sm">
                {new Date(magazine.publishDate).toLocaleDateString('ar-SA')}
              </div>

              <div className="col-span-2 flex items-center gap-4 text-white/50 text-sm">
                <span className="flex items-center gap-1">
                  <Eye size={14} />
                  {magazine.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Download size={14} />
                  {magazine.downloads.toLocaleString()}
                </span>
              </div>

              <div className="col-span-2 flex items-center justify-end gap-2">
                <Link
                  href={`/admin/magazines/${magazine.id}`}
                  className="p-2 text-white/50 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                >
                  <Edit3 size={16} />
                </Link>
                <Link
                  href={`/magazine/${magazine.id}/browse`}
                  target="_blank"
                  className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Eye size={16} />
                </Link>
                <button
                  onClick={() => {
                    setMagazineToDelete(magazine.id);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-white/50 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredMagazines.length === 0 && (
        <div className="text-center py-16">
          <BookOpen size={48} className="mx-auto text-white/20 mb-4" />
          <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-white mb-2">
            لا توجد أعداد
          </h3>
          <p className="text-white/50 mb-6">
            لم يتم العثور على أعداد تطابق معايير البحث
          </p>
          <Link
            href="/admin/magazines/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-[family-name:var(--font-display)] font-bold rounded-xl hover:bg-gold-muted transition-colors"
          >
            <Plus size={18} />
            إضافة عدد جديد
          </Link>
        </div>
      )}

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-midnight border border-gold/20 rounded-2xl p-6 z-50"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-loss/20 rounded-full flex items-center justify-center">
                  <Trash2 size={32} className="text-loss" />
                </div>
                <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-white mb-2">
                  حذف العدد؟
                </h3>
                <p className="text-white/60 mb-6">
                  هل أنت متأكد من حذف هذا العدد؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 bg-white/10 text-white font-[family-name:var(--font-display)] font-semibold rounded-xl hover:bg-white/20 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      // Handle delete
                      setShowDeleteModal(false);
                      setMagazineToDelete(null);
                    }}
                    className="flex-1 px-4 py-3 bg-loss text-white font-[family-name:var(--font-display)] font-semibold rounded-xl hover:bg-loss/80 transition-colors"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
