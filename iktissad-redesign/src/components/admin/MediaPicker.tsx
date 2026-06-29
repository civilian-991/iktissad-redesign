/**
 * MediaPicker - Modal for browsing and selecting media from the library
 *
 * Allows users to browse existing uploads from Supabase Storage,
 * search/filter, and select an image to insert. Also supports
 * uploading a new file directly.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  Upload,
  Image as ImageIcon,
  Check,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { iconSizes } from '@/lib/design-tokens';
import {
  listFiles,
  uploadFile,
  validateFile,
  type StorageBucket,
  type StorageFile,
} from '@/lib/supabase/storage';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MediaPickerProps {
  /** Whether the modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Called when a media item is selected, returns the public URL */
  onSelect: (url: string, name?: string) => void;
  /** Bucket to browse */
  bucket?: StorageBucket;
  /** Optional folder filter */
  folder?: string;
  /** Whether to allow uploading new files */
  allowUpload?: boolean;
  /** File types to show */
  acceptTypes?: string[];
}

// Tabs for the picker
type PickerTab = 'browse' | 'upload';

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function MediaPicker({
  open,
  onClose,
  onSelect,
  bucket = 'media',
  folder,
  allowUpload = true,
  acceptTypes,
}: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('browse');
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  // Portal target — only available on the client after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Load files from storage
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listFiles(bucket, folder);
      setFiles(result);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [bucket, folder]);

  // Load on open
  useEffect(() => {
    if (open) {
      loadFiles();
      setSelectedFile(null);
      setSearchQuery('');
    }
  }, [open, loadFiles]);

  // Filter files by search
  const filteredFiles = files.filter((f) => {
    if (!searchQuery) return true;
    return f.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Upload handler
  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file, {
        maxSizeMB: 10,
        allowedTypes: acceptTypes ?? ['image/*'],
      });
      if (validationError) {
        setError(validationError);
        return;
      }

      setUploading(true);
      setError('');
      try {
        const result = await uploadFile(bucket, file, folder);
        // Directly select the newly uploaded file
        onSelect(result.publicUrl, file.name);
        onClose();
      } catch (err: any) {
        setError(err.message ?? 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [bucket, folder, onSelect, onClose, acceptTypes]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleConfirm = useCallback(() => {
    if (selectedFile) {
      onSelect(selectedFile.publicUrl, selectedFile.name);
      onClose();
    }
  }, [selectedFile, onSelect, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-midnight border border-gold/10 rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gold/10">
              <div className="flex items-center gap-3">
                <ImageIcon size={iconSizes.lg} className="text-gold" />
                <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                  مكتبة الوسائط
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gold/10">
              <button
                onClick={() => setActiveTab('browse')}
                className={`flex-1 px-4 py-3 text-sm font-[family-name:var(--font-display)] transition-colors ${
                  activeTab === 'browse'
                    ? 'text-gold border-b-2 border-gold bg-gold/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                تصفح المكتبة
              </button>
              {allowUpload && (
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 px-4 py-3 text-sm font-[family-name:var(--font-display)] transition-colors ${
                    activeTab === 'upload'
                      ? 'text-gold border-b-2 border-gold bg-gold/5'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  رفع جديد
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-loss/10 border border-loss/20 rounded-xl text-loss text-sm font-[family-name:var(--font-display)]">
                  {error}
                </div>
              )}

              {activeTab === 'browse' ? (
                <>
                  {/* Search */}
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="البحث في الملفات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 ps-10 pe-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
                    />
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  </div>

                  {/* File Grid */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={32} className="text-gold animate-spin" />
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-white/40">
                      <FolderOpen size={48} className="mb-3" />
                      <p className="font-[family-name:var(--font-display)]">
                        {searchQuery ? 'لا توجد نتائج' : 'لا توجد ملفات'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {filteredFiles.map((file) => (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => setSelectedFile(file)}
                          className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            selectedFile?.path === file.path
                              ? 'border-gold ring-2 ring-gold/20'
                              : 'border-transparent hover:border-gold/30'
                          }`}
                        >
                          {file.type.startsWith('image/') ? (
                            <img
                              src={file.publicUrl}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                              <ImageIcon size={24} className="text-white/30" />
                            </div>
                          )}
                          {/* Selection indicator */}
                          {selectedFile?.path === file.path && (
                            <div className="absolute top-2 start-2 w-6 h-6 bg-gold rounded-full flex items-center justify-center">
                              <Check size={14} className="text-obsidian" />
                            </div>
                          )}
                          {/* Name on hover */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-obsidian/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-xs truncate">{file.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Upload Tab */
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
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
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(file);
                          }}
                        />
                      </label>
                      <p className="text-white/40 text-xs mt-4">
                        PNG, JPG, GIF, WebP حتى 10MB
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {activeTab === 'browse' && (
              <div className="flex items-center justify-between p-4 border-t border-gold/10">
                <p className="text-white/40 text-sm font-[family-name:var(--font-display)]">
                  {selectedFile ? selectedFile.name : 'اختر صورة من المكتبة'}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-white/50 hover:text-white font-[family-name:var(--font-display)] text-sm transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedFile}
                    className="px-5 py-2 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    إدراج
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export { MediaPicker };
