/**
 * Admin Media Library Page
 * IKTISSAD Design System
 *
 * Media library with Supabase Storage integration for uploads,
 * file browsing, deletion, and URL copying.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import NextImage from 'next/image';
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
  FolderPlus,
  Folder,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import {
  listFiles,
  uploadFile,
  deleteFile,
  validateFile,
  type StorageFile,
} from '@/lib/supabase/storage';

// Folders map to storage subfolders within the 'media' bucket
const folders = ['الكل', 'مقالات', 'أسواق', 'تكنولوجيا', 'طاقة', 'شخصيات', 'تقارير', 'فيديو'];
const folderSlugMap: Record<string, string> = {
  'مقالات': 'articles',
  'أسواق': 'markets',
  'تكنولوجيا': 'tech',
  'طاقة': 'energy',
  'شخصيات': 'profiles',
  'تقارير': 'reports',
  'فيديو': 'video',
};

const fileTypes = ['الكل', 'image', 'video', 'document'];

// Mock fallback data for when Supabase is not configured
const mockMedia = [
  {
    name: 'hero-banner.jpg',
    id: '1',
    size: 2400000,
    type: 'image/jpeg',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    publicUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop',
    path: 'articles/hero-banner.jpg',
    folder: 'مقالات',
    uploadedBy: 'أحمد المنصور',
  },
  {
    name: 'market-analysis.jpg',
    id: '2',
    size: 1800000,
    type: 'image/jpeg',
    createdAt: '2024-01-14',
    updatedAt: '2024-01-14',
    publicUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=300&fit=crop',
    path: 'markets/market-analysis.jpg',
    folder: 'أسواق',
    uploadedBy: 'سارة العلي',
  },
  {
    name: 'tech-innovation.jpg',
    id: '3',
    size: 3100000,
    type: 'image/jpeg',
    createdAt: '2024-01-13',
    updatedAt: '2024-01-13',
    publicUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
    path: 'tech/tech-innovation.jpg',
    folder: 'تكنولوجيا',
    uploadedBy: 'محمد الخالدي',
  },
  {
    name: 'financial-report.pdf',
    id: '4',
    size: 856000,
    type: 'application/pdf',
    createdAt: '2024-01-12',
    updatedAt: '2024-01-12',
    publicUrl: '#',
    path: 'reports/financial-report.pdf',
    folder: 'تقارير',
    uploadedBy: 'نور الدين',
  },
  {
    name: 'investment-chart.jpg',
    id: '5',
    size: 1200000,
    type: 'image/jpeg',
    createdAt: '2024-01-11',
    updatedAt: '2024-01-11',
    publicUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    path: 'articles/investment-chart.jpg',
    folder: 'مقالات',
    uploadedBy: 'فاطمة الزهراء',
  },
  {
    name: 'summit-coverage.mp4',
    id: '6',
    size: 45200000,
    type: 'video/mp4',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-10',
    publicUrl: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=400&h=300&fit=crop',
    path: 'video/summit-coverage.mp4',
    folder: 'فيديو',
    uploadedBy: 'عمر الشريف',
  },
  {
    name: 'energy-sector.jpg',
    id: '7',
    size: 2100000,
    type: 'image/jpeg',
    createdAt: '2024-01-09',
    updatedAt: '2024-01-09',
    publicUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=300&fit=crop',
    path: 'energy/energy-sector.jpg',
    folder: 'طاقة',
    uploadedBy: 'أحمد المنصور',
  },
  {
    name: 'profile-ceo.jpg',
    id: '8',
    size: 890000,
    type: 'image/jpeg',
    createdAt: '2024-01-08',
    updatedAt: '2024-01-08',
    publicUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop',
    path: 'profiles/profile-ceo.jpg',
    folder: 'شخصيات',
    uploadedBy: 'سارة العلي',
  },
];

interface MediaItem extends StorageFile {
  folder?: string;
  uploadedBy?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getMediaType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
  return 'file';
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>(mockMedia);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('الكل');
  const [selectedType, setSelectedType] = useState('الكل');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [uploadFolder, setUploadFolder] = useState('مقالات');

  // Try to load files from Supabase on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  const loadFromStorage = async () => {
    setLoading(true);
    try {
      const files = await listFiles('media');
      if (files.length > 0) {
        setMedia(files.map((f) => ({ ...f, folder: 'الكل' })));
      }
      // If empty, keep mock data
    } catch {
      // Supabase not configured - use mock data silently
    } finally {
      setLoading(false);
    }
  };

  const filteredMedia = media.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === 'الكل' || item.folder === selectedFolder;
    const itemType = getMediaType(item.type);
    const matchesType = selectedType === 'الكل' || itemType === selectedType;
    return matchesSearch && matchesFolder && matchesType;
  });

  const toggleSelectItem = (path: string) => {
    setSelectedItems((prev) =>
      prev.includes(path) ? prev.filter((i) => i !== path) : [...prev, path]
    );
  };

  const getTypeIcon = (mimeType: string) => {
    const type = getMediaType(mimeType);
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

  const getTypeLabel = (mimeType: string) => {
    const type = getMediaType(mimeType);
    switch (type) {
      case 'image': return 'صورة';
      case 'video': return 'فيديو';
      case 'document': return 'مستند';
      default: return 'ملف';
    }
  };

  // Handle file upload
  const handleUpload = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setUploadError('');

    const fileArray = Array.from(files);
    const folder = folderSlugMap[uploadFolder] ?? 'general';

    for (const file of fileArray) {
      const validationError = validateFile(file, { maxSizeMB: 50 });
      if (validationError) {
        setUploadError(validationError);
        continue;
      }

      try {
        const result = await uploadFile('media', file, folder);
        // Add to local state
        const newItem: MediaItem = {
          name: file.name,
          id: null,
          size: file.size,
          type: file.type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publicUrl: result.publicUrl,
          path: result.path,
          folder: uploadFolder,
        };
        setMedia((prev) => [newItem, ...prev]);
      } catch (err: any) {
        setUploadError(err.message ?? 'Upload failed');
      }
    }

    setUploading(false);
    if (!uploadError) {
      setShowUploadModal(false);
    }
  }, [uploadFolder, uploadError]);

  // Handle file deletion
  const handleDelete = useCallback(async (paths: string[]) => {
    for (const path of paths) {
      try {
        await deleteFile('media', path);
      } catch {
        // If Supabase fails (e.g. mock data), just remove from state
      }
      setMedia((prev) => prev.filter((m) => m.path !== path));
    }
    setSelectedItems([]);
  }, []);

  // Copy URL to clipboard
  const handleCopyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }, []);

  const totalSize = media.reduce((acc, item) => acc + (item.size ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            مكتبة الوسائط
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {media.length} ملف • {formatFileSize(totalSize)} إجمالي
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
          { label: 'الصور', count: media.filter(m => getMediaType(m.type) === 'image').length, icon: ImageIcon, color: 'from-teal to-emerald-600' },
          { label: 'الفيديوهات', count: media.filter(m => getMediaType(m.type) === 'video').length, icon: Video, color: 'from-loss to-rose-600' },
          { label: 'المستندات', count: media.filter(m => getMediaType(m.type) === 'document').length, icon: FileText, color: 'from-gold to-bronze' },
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

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gold/10 grid md:grid-cols-2 gap-4">
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
                        {type === 'الكل' ? 'الكل' : getTypeLabel(type + '/')}
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
              <button
                onClick={() => handleDelete(selectedItems)}
                className="px-4 py-2 bg-loss/10 text-loss rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-loss/20 transition-colors flex items-center gap-2"
              >
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="text-gold animate-spin" />
        </div>
      )}

      {/* Media Grid/List */}
      {!loading && viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMedia.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className={`group relative bg-midnight/50 border rounded-xl overflow-hidden cursor-pointer transition-all ${
                selectedItems.includes(item.path)
                  ? 'border-gold ring-2 ring-gold/20'
                  : 'border-gold/10 hover:border-gold/30'
              }`}
              onClick={() => toggleSelectItem(item.path)}
            >
              <div className="aspect-square bg-white/5 relative">
                {getMediaType(item.type) === 'image' || getMediaType(item.type) === 'video' ? (
                  <NextImage
                    src={item.publicUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getTypeIcon(item.type)}
                  </div>
                )}

                <div className="absolute top-2 right-2 p-1.5 bg-obsidian/80 rounded-lg">
                  {getTypeIcon(item.type)}
                </div>

                <div className={`absolute top-2 left-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  selectedItems.includes(item.path)
                    ? 'bg-gold border-gold'
                    : 'border-white/30 bg-obsidian/50 opacity-0 group-hover:opacity-100'
                }`}>
                  {selectedItems.includes(item.path) && (
                    <Check size={14} className="text-obsidian" />
                  )}
                </div>

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
                        handleCopyUrl(item.publicUrl);
                      }}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      {copiedUrl === item.publicUrl ? (
                        <CheckCircle size={14} className="text-profit" />
                      ) : (
                        <Copy size={14} className="text-white" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3">
                <p className="text-white text-sm font-[family-name:var(--font-display)] truncate">
                  {item.name}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  {formatFileSize(item.size)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : !loading ? (
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
                  key={item.path}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`border-b border-gold/5 hover:bg-white/5 transition-colors ${
                    selectedItems.includes(item.path) ? 'bg-gold/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.path)}
                        onChange={() => toggleSelectItem(item.path)}
                        className="w-4 h-4 rounded border-gold/30 bg-transparent checked:bg-gold"
                      />
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 relative">
                        {getMediaType(item.type) === 'image' || getMediaType(item.type) === 'video' ? (
                          <NextImage src={item.publicUrl} alt={item.name} fill className="object-cover" />
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
                    {formatFileSize(item.size)}
                  </td>
                  <td className="p-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                    {item.folder ?? '-'}
                  </td>
                  <td className="p-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-SA-u-ca-gregory') : '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleCopyUrl(item.publicUrl)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {copiedUrl === item.publicUrl ? (
                          <CheckCircle size={14} className="text-profit" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete([item.path])}
                        className="p-2 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

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

              {/* Error */}
              {uploadError && (
                <div className="mb-4 p-3 bg-loss/10 border border-loss/20 rounded-xl text-loss text-sm font-[family-name:var(--font-display)]">
                  {uploadError}
                </div>
              )}

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
                  if (e.dataTransfer.files.length > 0) {
                    handleUpload(e.dataTransfer.files);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                  isDragging
                    ? 'border-gold bg-gold/10'
                    : 'border-gold/20 hover:border-gold/40'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 size={48} className="mx-auto text-gold animate-spin mb-4" />
                    <p className="text-white font-[family-name:var(--font-display)]">
                      جاري الرفع...
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto text-gold/50 mb-4" size={48} />
                    <p className="text-white font-[family-name:var(--font-display)] mb-2">
                      اسحب الملفات هنا أو
                    </p>
                    <label className="inline-block px-4 py-2 bg-gold/10 text-gold rounded-lg cursor-pointer hover:bg-gold/20 transition-colors font-[family-name:var(--font-display)] text-sm">
                      اختر من جهازك
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleUpload(e.target.files);
                          }
                        }}
                      />
                    </label>
                    <p className="text-white/40 text-xs mt-4">
                      PNG, JPG, GIF, PDF, MP4 حتى 50MB
                    </p>
                  </>
                )}
              </div>

              {/* Folder Selection */}
              <div className="mt-6">
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  رفع إلى مجلد
                </label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
                >
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

              <div className="p-4">
                {getMediaType(previewItem.type) === 'image' && (
                  <img
                    src={previewItem.publicUrl}
                    alt={previewItem.name}
                    className="w-full max-h-[60vh] object-contain rounded-xl"
                  />
                )}
                {getMediaType(previewItem.type) === 'video' && (
                  <div className="w-full aspect-video bg-white/5 rounded-xl flex items-center justify-center">
                    <Video size={48} className="text-white/30" />
                  </div>
                )}
                {getMediaType(previewItem.type) === 'document' && (
                  <div className="w-full aspect-video bg-white/5 rounded-xl flex items-center justify-center">
                    <FileText size={48} className="text-white/30" />
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gold/10 flex items-center justify-between">
                <div className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                  {formatFileSize(previewItem.size)} • {previewItem.folder ?? ''}
                  {previewItem.uploadedBy ? ` • رفع بواسطة ${previewItem.uploadedBy}` : ''}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyUrl(previewItem.publicUrl)}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                  >
                    {copiedUrl === previewItem.publicUrl ? (
                      <><CheckCircle size={14} className="text-profit" /> تم النسخ</>
                    ) : (
                      <><Copy size={14} /> نسخ الرابط</>
                    )}
                  </button>
                  <button
                    onClick={() => { handleDelete([previewItem.path]); setPreviewItem(null); }}
                    className="px-4 py-2 bg-loss/10 text-loss rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-loss/20 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    حذف
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
