/**
 * Admin Media Library Page
 * IKTISSAD Design System
 *
 * Media library with REST API (SWR) for listing/deleting,
 * and Supabase Storage for uploads.
 */

'use client';

import { useState, useCallback } from 'react';
import NextImage from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import useSWR from 'swr';
import { toast } from 'sonner';
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
  uploadFile,
  validateFile,
} from '@/lib/supabase/storage';
import { swrFetcher, mediaKey, deleteMedia } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import type { MediaItem, ApiResponse } from '@/types';

// Folder slugs that map to storage subfolders within the 'media' bucket
// Display labels come from i18n: admin.media.folders.<slug>
const FOLDER_SLUGS = ['all', 'articles', 'markets', 'tech', 'energy', 'profiles', 'reports', 'video'] as const;
// Slugs that can be used for upload (excludes 'all')
const UPLOAD_FOLDER_SLUGS = FOLDER_SLUGS.filter((s) => s !== 'all');

const FILE_TYPE_SLUGS = ['all', 'image', 'video', 'document'] as const;

const PAGE_SIZE = 20;

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
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [uploadFolder, setUploadFolder] = useState('articles');
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Build SWR key from filters
  const swrKeyParams = {
    page,
    pageSize: PAGE_SIZE,
    folder: selectedFolder !== 'all' ? selectedFolder : undefined,
    type: selectedType !== 'all' ? selectedType : undefined,
  };
  const swrKeyValue = mediaKey(swrKeyParams);

  const { data, isLoading, mutate } = useSWR<ApiResponse<MediaItem[]>>(
    swrKeyValue,
    swrFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const media = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalCount = pagination?.total ?? 0;

  // Client-side search filter (filename contains query)
  const filteredMedia = searchQuery
    ? media.filter((item) =>
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : media;

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getTypeIcon = (mimeType: string) => {
    const type = getMediaType(mimeType);
    switch (type) {
      case 'image':
        return <ImageIcon size={16} className="text-ink" />;
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
    const key = `admin.media.typeLabels.${type === 'image' || type === 'video' || type === 'document' ? type : 'file'}`;
    return t(key);
  };

  // Handle file upload (still uses Supabase Storage directly)
  const handleUpload = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setUploadError('');

    const fileArray = Array.from(files);
    const folder = uploadFolder;

    for (const file of fileArray) {
      const validationError = validateFile(file, { maxSizeMB: 50 });
      if (validationError) {
        setUploadError(validationError);
        continue;
      }

      try {
        await uploadFile('media', file, folder);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploadError(message);
      }
    }

    setUploading(false);
    if (!uploadError) {
      setShowUploadModal(false);
      mutate(); // Refresh list from API
    }
  }, [uploadFolder, uploadError, mutate]);

  // Handle deletion via REST API with confirmation
  const handleDelete = useCallback(async (ids: string[]) => {
    const msg = ids.length === 1
      ? t('admin.media.actions.confirmDelete')
      : t('admin.media.actions.confirmBulkDelete').replace('{count}', String(ids.length));
    if (!window.confirm(msg)) return;

    setDeletingIds((prev) => [...prev, ...ids]);
    let anyError = false;

    for (const id of ids) {
      try {
        await deleteMedia(id);
      } catch {
        anyError = true;
        toast.error(t('admin.media.actions.deleteFailed'));
      }
    }

    setDeletingIds((prev) => prev.filter((i) => !ids.includes(i)));
    setSelectedItems((prev) => prev.filter((i) => !ids.includes(i)));

    if (!anyError) {
      toast.success(
        ids.length === 1
          ? t('admin.media.actions.deleted')
          : t('admin.media.actions.bulkDeleted').replace('{count}', String(ids.length))
      );
    }

    mutate();
  }, [mutate, t]);

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
            {t('admin.media.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {totalCount} {t('admin.media.totalFiles')} • {formatFileSize(totalSize)} {t('admin.media.totalSize')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm">
            <FolderPlus size={16} />
            {t('admin.media.newFolder')}
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-ink font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all"
          >
            <Upload size={18} />
            {t('admin.media.upload')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('admin.media.stats.images'), count: media.filter(m => getMediaType(m.mimeType) === 'image').length, icon: ImageIcon, color: 'from-teal to-emerald-600' },
          { label: t('admin.media.stats.videos'), count: media.filter(m => getMediaType(m.mimeType) === 'video').length, icon: Video, color: 'from-loss to-rose-600' },
          { label: t('admin.media.stats.documents'), count: media.filter(m => getMediaType(m.mimeType) === 'document').length, icon: FileText, color: 'from-gold to-bronze' },
          { label: t('admin.media.stats.folders'), count: FOLDER_SLUGS.length - 1, icon: Folder, color: 'from-purple-500 to-indigo-600' },
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
              placeholder={t('admin.media.searchPlaceholder')}
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
                  ? 'bg-gold text-ink'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-gold text-ink'
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
            {t('admin.media.filtersLabel')}
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
                    {t('admin.media.folderLabel')}
                  </label>
                  <select
                    value={selectedFolder}
                    onChange={(e) => { setSelectedFolder(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {FOLDER_SLUGS.map((slug) => (
                      <option key={slug} value={slug} className="bg-midnight">
                        {t(`admin.media.folders.${slug}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    {t('admin.media.fileTypeLabel')}
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    {FILE_TYPE_SLUGS.map((slug) => (
                      <option key={slug} value={slug} className="bg-midnight">
                        {slug === 'all' ? t('admin.media.filters.all') : t(`admin.media.typeLabels.${slug}`)}
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
              {t('admin.media.actions.selected').replace('{count}', String(selectedItems.length))}
            </span>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-white/10 text-white rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors flex items-center gap-2">
                <Download size={14} />
                {t('admin.media.actions.download')}
              </button>
              <button
                onClick={() => handleDelete(selectedItems)}
                disabled={deletingIds.some((id) => selectedItems.includes(id))}
                className="px-4 py-2 bg-loss/10 text-loss rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-loss/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingIds.some((id) => selectedItems.includes(id)) ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {t('admin.media.actions.delete')}
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="px-4 py-2 bg-white/5 text-white/70 rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/10 transition-colors"
              >
                {t('admin.media.actions.cancel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="text-gold animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredMedia.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-gold/10 flex items-center justify-center mb-6">
            <Upload size={36} className="text-white/20" />
          </div>
          <h3 className="text-white/60 text-lg font-[family-name:var(--font-display)] font-semibold mb-2">
            {t('admin.media.empty')}
          </h3>
          <p className="text-white/30 text-sm font-[family-name:var(--font-display)] mb-6 max-w-xs">
            {searchQuery || selectedFolder !== 'all' || selectedType !== 'all'
              ? t('admin.media.emptyFiltered')
              : t('admin.media.emptyHint')}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-ink font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all"
          >
            <Upload size={16} />
            {t('admin.media.upload')}
          </button>
        </motion.div>
      )}

      {/* Media Grid/List */}
      {!isLoading && filteredMedia.length > 0 && viewMode === 'grid' ? (
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
              <div className="aspect-square bg-white/5 relative">
                {getMediaType(item.mimeType) === 'image' || getMediaType(item.mimeType) === 'video' ? (
                  <NextImage
                    src={item.url}
                    alt={item.alt || item.filename}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getTypeIcon(item.mimeType)}
                  </div>
                )}

                <div className="absolute top-2 right-2 p-1.5 bg-obsidian/80 rounded-lg">
                  {getTypeIcon(item.mimeType)}
                </div>

                <div className={`absolute top-2 left-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  selectedItems.includes(item.id)
                    ? 'bg-gold border-gold'
                    : 'border-white/30 bg-obsidian/50 opacity-0 group-hover:opacity-100'
                }`}>
                  {selectedItems.includes(item.id) && (
                    <Check size={14} className="text-ink" />
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
                        handleCopyUrl(item.url);
                      }}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      {copiedUrl === item.url ? (
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
                  {item.filename}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  {formatFileSize(item.size)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : !isLoading && filteredMedia.length > 0 ? (
        <div className="bg-midnight/50 border border-gold/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 bg-white/5">
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.media.table.file')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.media.table.type')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.media.table.size')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.media.table.folder')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.media.table.date')}
                </th>
                <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                  {t('admin.media.table.actions')}
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
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 relative">
                        {getMediaType(item.mimeType) === 'image' || getMediaType(item.mimeType) === 'video' ? (
                          <NextImage src={item.url} alt={item.alt || item.filename} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getTypeIcon(item.mimeType)}
                          </div>
                        )}
                      </div>
                      <span className="text-white text-sm font-[family-name:var(--font-display)]">
                        {item.filename}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/5 text-white/70 font-[family-name:var(--font-display)]">
                      {getTypeIcon(item.mimeType)}
                      {getTypeLabel(item.mimeType)}
                    </span>
                  </td>
                  <td className="p-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                    {formatFileSize(item.size)}
                  </td>
                  <td className="p-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                    {item.folder || '-'}
                  </td>
                  <td className="p-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn') : '-'}
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
                        onClick={() => handleCopyUrl(item.url)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {copiedUrl === item.url ? (
                          <CheckCircle size={14} className="text-profit" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete([item.id])}
                        disabled={deletingIds.includes(item.id)}
                        className="p-2 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingIds.includes(item.id) ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white/5 border border-gold/10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-display)] text-sm transition-all"
          >
            {t('admin.media.pagination.previous')}
          </button>
          <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white/5 border border-gold/10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-display)] text-sm transition-all"
          >
            {t('admin.media.pagination.next')}
          </button>
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
                  {t('admin.media.uploadModal.title')}
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
                      {t('admin.media.uploadModal.uploading')}
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto text-gold/50 mb-4" size={48} />
                    <p className="text-white font-[family-name:var(--font-display)] mb-2">
                      {t('admin.media.uploadModal.dropzone')}
                    </p>
                    <label className="inline-block px-4 py-2 bg-gold/10 text-gold rounded-lg cursor-pointer hover:bg-gold/20 transition-colors font-[family-name:var(--font-display)] text-sm">
                      {t('admin.media.uploadModal.browse')}
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
                      {t('admin.media.uploadModal.maxSize')}
                    </p>
                  </>
                )}
              </div>

              {/* Folder Selection */}
              <div className="mt-6">
                <label className="block text-white/70 text-sm font-[family-name:var(--font-display)] mb-2">
                  {t('admin.media.uploadModal.uploadTo')}
                </label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
                >
                  {UPLOAD_FOLDER_SLUGS.map((slug) => (
                    <option key={slug} value={slug} className="bg-midnight">
                      {t(`admin.media.folders.${slug}`)}
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
                  {getTypeIcon(previewItem.mimeType)}
                  <span className="text-white font-[family-name:var(--font-display)]">
                    {previewItem.filename}
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
                {getMediaType(previewItem.mimeType) === 'image' && (
                  <img
                    src={previewItem.url}
                    alt={previewItem.alt || previewItem.filename}
                    className="w-full max-h-[60vh] object-contain rounded-xl"
                  />
                )}
                {getMediaType(previewItem.mimeType) === 'video' && (
                  <div className="w-full aspect-video bg-white/5 rounded-xl flex items-center justify-center">
                    <Video size={48} className="text-white/30" />
                  </div>
                )}
                {getMediaType(previewItem.mimeType) === 'document' && (
                  <div className="w-full aspect-video bg-white/5 rounded-xl flex items-center justify-center">
                    <FileText size={48} className="text-white/30" />
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gold/10 flex items-center justify-between">
                <div className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                  {formatFileSize(previewItem.size)} • {previewItem.folder || ''}
                  {previewItem.uploadedBy ? ` • ${t('admin.media.uploadedBy').replace('{name}', previewItem.uploadedBy)}` : ''}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyUrl(previewItem.url)}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                  >
                    {copiedUrl === previewItem.url ? (
                      <><CheckCircle size={14} className="text-profit" /> {t('admin.media.actions.copied')}</>
                    ) : (
                      <><Copy size={14} /> {t('admin.media.actions.copy')}</>
                    )}
                  </button>
                  <button
                    onClick={() => { handleDelete([previewItem.id]); setPreviewItem(null); }}
                    disabled={deletingIds.includes(previewItem.id)}
                    className="px-4 py-2 bg-loss/10 text-loss rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-loss/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingIds.includes(previewItem.id) ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    {t('admin.media.actions.delete')}
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
