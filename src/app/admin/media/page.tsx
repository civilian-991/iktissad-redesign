'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Search,
  Grid,
  List,
  Filter,
  Image as ImageIcon,
  Video,
  FileText,
  File,
  Trash2,
  Download,
  Copy,
  X,
  ChevronDown,
  Check,
  Eye,
  MoreVertical,
  FolderPlus,
  Folder
} from 'lucide-react';

// Mock media data
const mockMedia = [
  {
    id: 1,
    name: 'hero-banner.jpg',
    type: 'image',
    size: '2.4 MB',
    dimensions: '1920x1080',
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop',
    uploadedBy: 'أحمد المنصور',
    uploadedAt: '2024-01-15',
    folder: 'مقالات',
  },
  {
    id: 2,
    name: 'market-analysis.jpg',
    type: 'image',
    size: '1.8 MB',
    dimensions: '1600x900',
    url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=300&fit=crop',
    uploadedBy: 'سارة العلي',
    uploadedAt: '2024-01-14',
    folder: 'أسواق',
  },
  {
    id: 3,
    name: 'tech-innovation.jpg',
    type: 'image',
    size: '3.1 MB',
    dimensions: '2000x1200',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
    uploadedBy: 'محمد الخالدي',
    uploadedAt: '2024-01-13',
    folder: 'تكنولوجيا',
  },
  {
    id: 4,
    name: 'financial-report.pdf',
    type: 'document',
    size: '856 KB',
    dimensions: null,
    url: '#',
    uploadedBy: 'نور الدين',
    uploadedAt: '2024-01-12',
    folder: 'تقارير',
  },
  {
    id: 5,
    name: 'investment-chart.jpg',
    type: 'image',
    size: '1.2 MB',
    dimensions: '1400x800',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    uploadedBy: 'فاطمة الزهراء',
    uploadedAt: '2024-01-11',
    folder: 'مقالات',
  },
  {
    id: 6,
    name: 'summit-coverage.mp4',
    type: 'video',
    size: '45.2 MB',
    dimensions: '1920x1080',
    url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=400&h=300&fit=crop',
    uploadedBy: 'عمر الشريف',
    uploadedAt: '2024-01-10',
    folder: 'فيديو',
  },
  {
    id: 7,
    name: 'energy-sector.jpg',
    type: 'image',
    size: '2.1 MB',
    dimensions: '1800x1000',
    url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=300&fit=crop',
    uploadedBy: 'أحمد المنصور',
    uploadedAt: '2024-01-09',
    folder: 'طاقة',
  },
  {
    id: 8,
    name: 'profile-ceo.jpg',
    type: 'image',
    size: '890 KB',
    dimensions: '800x800',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop',
    uploadedBy: 'سارة العلي',
    uploadedAt: '2024-01-08',
    folder: 'شخصيات',
  },
];

const folders = ['الكل', 'مقالات', 'أسواق', 'تكنولوجيا', 'طاقة', 'شخصيات', 'تقارير', 'فيديو'];
const fileTypes = ['الكل', 'image', 'video', 'document'];

export default function MediaLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('الكل');
  const [selectedType, setSelectedType] = useState('الكل');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewItem, setPreviewItem] = useState<typeof mockMedia[0] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filteredMedia = mockMedia.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === 'الكل' || item.folder === selectedFolder;
    const matchesType = selectedType === 'الكل' || item.type === selectedType;
    return matchesSearch && matchesFolder && matchesType;
  });

  const toggleSelectItem = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={16} className="text-teal" />;
      case 'video':
        return <Video size={16} className="text-loss" />;
      case 'document':
        return <FileText size={16} className="text-gold" />;
      default:
        return <File size={16} className="text-white/50" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'image':
        return 'صورة';
      case 'video':
        return 'فيديو';
      case 'document':
        return 'مستند';
      default:
        return 'ملف';
    }
  };

  const totalSize = mockMedia.reduce((acc, item) => {
    const size = parseFloat(item.size);
    return acc + size;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            مكتبة الوسائط
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {mockMedia.length} ملف • {totalSize.toFixed(1)} MB إجمالي
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm">
            <FolderPlus size={16} />
            مجلد جديد
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all"
          >
            <Upload size={18} />
            رفع ملفات
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'الصور', count: mockMedia.filter(m => m.type === 'image').length, icon: ImageIcon, color: 'from-teal to-emerald-600' },
          { label: 'الفيديوهات', count: mockMedia.filter(m => m.type === 'video').length, icon: Video, color: 'from-loss to-rose-600' },
          { label: 'المستندات', count: mockMedia.filter(m => m.type === 'document').length, icon: FileText, color: 'from-gold to-bronze' },
          { label: 'المجلدات', count: folders.length - 1, icon: Folder, color: 'from-purple-500 to-indigo-600' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-midnight/50 border border-gold/10 rounded-xl p-4"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="text-white" size={18} />
            </div>
            <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">{stat.label}</p>
            <p className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">{stat.count}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="البحث في الملفات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-2 bg-white/5 border border-gold/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-gold text-obsidian'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-gold text-obsidian'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <List size={18} />
            </button>
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
              <div className="pt-4 mt-4 border-t border-gold/10 grid md:grid-cols-2 gap-4">
                {/* Folder Filter */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    المجلد
                  </label>
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {folders.map((folder) => (
                      <option key={folder} value={folder} className="bg-midnight">
                        {folder}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    نوع الملف
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {fileTypes.map((type) => (
                      <option key={type} value={type} className="bg-midnight">
                        {type === 'الكل' ? 'الكل' : getTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gold/10 border border-gold/20 rounded-xl p-4 flex items-center justify-between"
          >
            <span className="text-gold font-[family-name:var(--font-display)] text-sm">
              تم تحديد {selectedItems.length} ملف
            </span>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-white/10 text-white rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors flex items-center gap-2">
                <Download size={14} />
                تحميل
              </button>
              <button className="px-4 py-2 bg-loss/10 text-loss rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-loss/20 transition-colors flex items-center gap-2">
                <Trash2 size={14} />
                حذف
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="px-4 py-2 bg-white/5 text-white/70 rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/10 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMedia.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className={`group relative bg-midnight/50 border rounded-xl overflow-hidden cursor-pointer transition-all ${
                selectedItems.includes(item.id)
                  ? 'border-gold ring-2 ring-gold/20'
                  : 'border-gold/10 hover:border-gold/30'
              }`}
              onClick={() => toggleSelectItem(item.id)}
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-white/5 relative">
                {item.type === 'image' || item.type === 'video' ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getTypeIcon(item.type)}
                  </div>
                )}

                {/* Type Badge */}
                <div className="absolute top-2 right-2 p-1.5 bg-obsidian/80 rounded-lg">
                  {getTypeIcon(item.type)}
                </div>

                {/* Selection Indicator */}
                <div className={`absolute top-2 left-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  selectedItems.includes(item.id)
                    ? 'bg-gold border-gold'
                    : 'border-white/30 bg-obsidian/50 opacity-0 group-hover:opacity-100'
                }`}>
                  {selectedItems.includes(item.id) && (
                    <Check size={14} className="text-obsidian" />
                  )}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <Eye size={14} className="text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(item.url);
                      }}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <Copy size={14} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-white text-sm font-[family-name:var(--font-display)] truncate">
                  {item.name}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  {item.size}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-midnight/50 border border-gold/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 bg-white/5">
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  الملف
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  النوع
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  الحجم
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  المجلد
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
              {filteredMedia.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`border-b border-gold/5 hover:bg-white/5 transition-colors ${
                    selectedItems.includes(item.id) ? 'bg-gold/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-4 h-4 rounded border-gold/30 bg-transparent checked:bg-gold"
                      />
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5">
                        {item.type === 'image' || item.type === 'video' ? (
                          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getTypeIcon(item.type)}
                          </div>
                        )}
                      </div>
                      <span className="text-white text-sm font-[family-name:var(--font-display)]">
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/5 text-white/70 font-[family-name:var(--font-display)]">
                      {getTypeIcon(item.type)}
                      {getTypeLabel(item.type)}
                    </span>
                  </td>
                  <td className="p-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                    {item.size}
                  </td>
                  <td className="p-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                    {item.folder}
                  </td>
                  <td className="p-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                    {new Date(item.uploadedAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <Copy size={14} />
                      </button>
                      <button className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <Download size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-midnight border border-gold/10 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-white">
                  رفع ملفات جديدة
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  // Handle file drop
                }}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                  isDragging
                    ? 'border-gold bg-gold/10'
                    : 'border-gold/20 hover:border-gold/40'
                }`}
              >
                <Upload className="mx-auto text-gold/50 mb-4" size={48} />
                <p className="text-white font-[family-name:var(--font-display)] mb-2">
                  اسحب الملفات هنا أو
                </p>
                <label className="inline-block px-4 py-2 bg-gold/10 text-gold rounded-lg cursor-pointer hover:bg-gold/20 transition-colors font-[family-name:var(--font-display)] text-sm">
                  اختر من جهازك
                  <input type="file" multiple className="hidden" />
                </label>
                <p className="text-white/40 text-xs mt-4">
                  PNG, JPG, GIF, PDF, MP4 حتى 50MB
                </p>
              </div>

              {/* Folder Selection */}
              <div className="mt-6">
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  رفع إلى مجلد
                </label>
                <select className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30">
                  {folders.filter(f => f !== 'الكل').map((folder) => (
                    <option key={folder} value={folder} className="bg-midnight">
                      {folder}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-midnight border border-gold/10 rounded-2xl overflow-hidden max-w-4xl w-full"
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between p-4 border-b border-gold/10">
                <div className="flex items-center gap-3">
                  {getTypeIcon(previewItem.type)}
                  <span className="text-white font-[family-name:var(--font-display)]">
                    {previewItem.name}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Preview Content */}
              <div className="p-4">
                {previewItem.type === 'image' && (
                  <img
                    src={previewItem.url.replace('w=400&h=300', 'w=800&h=600')}
                    alt={previewItem.name}
                    className="w-full max-h-[60vh] object-contain rounded-xl"
                  />
                )}
              </div>

              {/* Preview Footer */}
              <div className="p-4 border-t border-gold/10 flex items-center justify-between">
                <div className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                  {previewItem.size} • {previewItem.dimensions} • رفع بواسطة {previewItem.uploadedBy}
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-white/10 text-white rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors flex items-center gap-2">
                    <Copy size={14} />
                    نسخ الرابط
                  </button>
                  <button className="px-4 py-2 bg-gold text-obsidian rounded-lg font-[family-name:var(--font-display)] text-sm font-semibold hover:shadow-gold transition-all flex items-center gap-2">
                    <Download size={14} />
                    تحميل
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
