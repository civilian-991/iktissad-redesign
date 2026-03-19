/**
 * ImageUploader - Drag-and-drop image upload component
 *
 * Uses Supabase Storage for file uploads.
 * Supports drag-and-drop, file type validation, progress indication,
 * preview after upload, and optional AI alt text generation.
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Sparkles, Save } from 'lucide-react';
import { uploadFile, validateFile, type StorageBucket } from '@/lib/supabase/storage';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ImageUploaderProps {
  /** Storage bucket to upload to */
  bucket?: StorageBucket;
  /** Folder within the bucket */
  folder?: string;
  /** Called with the public URL when upload completes */
  onUpload?: (url: string, path: string) => void;
  /** Called on upload error */
  onError?: (error: string) => void;
  /** Current image URL (for preview) */
  currentImage?: string | null;
  /** Called when current image is removed */
  onRemove?: () => void;
  /** Max file size in MB */
  maxSizeMB?: number;
  /** Accepted file types */
  accept?: string;
  /** Upload hint text */
  hintText?: string;
  /** Format hint text */
  formatHint?: string;
  /** Aspect ratio class for preview */
  aspectClass?: string;
  /** Additional className */
  className?: string;
  /** Media record ID — used to persist AI-generated alt text */
  mediaId?: string;
  /** Called after AI alt text is generated */
  onAltTextGenerated?: (altAr: string, altEn: string) => void;
  /** Called after AI tags are generated */
  onTagsGenerated?: (tags: string[]) => void;
  /** Whether to show the AI alt text panel after upload */
  showAIAltText?: boolean;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface AltTextState {
  altAr: string;
  altEn: string;
  generating: boolean;
  saving: boolean;
  saved: boolean;
  error: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ImageUploader({
  bucket = 'media',
  folder,
  onUpload,
  onError,
  currentImage,
  onRemove,
  maxSizeMB = 10,
  accept = 'image/*',
  hintText = 'اضغط لرفع صورة',
  formatHint = 'PNG, JPG, WebP حتى 10MB',
  aspectClass = 'aspect-video',
  className = '',
  mediaId,
  onAltTextGenerated,
  onTagsGenerated,
  showAIAltText = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState<AltTextState>({
    altAr: '',
    altEn: '',
    generating: false,
    saving: false,
    saved: false,
    error: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── AI alt text generation ────────────────────────────────

  const generateAltText = useCallback(async (imageUrl: string) => {
    setAltText((prev) => ({ ...prev, generating: true, error: '', saved: false }));
    try {
      const res = await fetch('/api/ai/alt-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, mediaId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAltText((prev) => ({ ...prev, generating: false, error: json.error ?? 'فشل التوليد' }));
        return;
      }
      const { altAr, altEn } = json.data as { altAr: string; altEn: string };
      setAltText((prev) => ({ ...prev, altAr, altEn, generating: false }));
      onAltTextGenerated?.(altAr, altEn);

      // Also trigger tag generation in the background
      fetch('/api/ai/media-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, mediaId }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.data?.tags) onTagsGenerated?.(j.data.tags as string[]);
        })
        .catch(() => undefined);
    } catch {
      setAltText((prev) => ({ ...prev, generating: false, error: 'فشل الاتصال بالذكاء الاصطناعي' }));
    }
  }, [mediaId, onAltTextGenerated, onTagsGenerated]);

  // ─── Save alt text to DB ───────────────────────────────────

  const saveAltText = useCallback(async () => {
    if (!mediaId) return;
    setAltText((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt: altText.altAr, altEn: altText.altEn }),
      });
      if (!res.ok) {
        const json = await res.json();
        setAltText((prev) => ({ ...prev, saving: false, error: json.error ?? 'فشل الحفظ' }));
        return;
      }
      setAltText((prev) => ({ ...prev, saving: false, saved: true }));
    } catch {
      setAltText((prev) => ({ ...prev, saving: false, error: 'فشل الاتصال بالخادم' }));
    }
  }, [mediaId, altText.altAr, altText.altEn]);

  // ─── File handling ─────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file, {
        maxSizeMB,
        allowedTypes: ['image/*'],
      });

      if (validationError) {
        setErrorMessage(validationError);
        setUploadState('error');
        onError?.(validationError);
        return;
      }

      // Show local preview immediately
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      setUploadState('uploading');
      setErrorMessage('');
      setAltText({ altAr: '', altEn: '', generating: false, saving: false, saved: false, error: '' });

      try {
        const result = await uploadFile(bucket, file, folder);
        setUploadState('success');
        setUploadedUrl(result.publicUrl);
        onUpload?.(result.publicUrl, result.path);

        // Clean up local preview after successful upload
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(result.publicUrl);

        // Trigger AI alt text generation if enabled
        if (showAIAltText) {
          generateAltText(result.publicUrl);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploadState('error');
        setErrorMessage(message);
        onError?.(message);
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
        setUploadedUrl(null);
      }
    },
    [bucket, folder, maxSizeMB, onUpload, onError, showAIAltText, generateAltText]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setPreviewUrl(null);
    setUploadedUrl(null);
    setUploadState('idle');
    setErrorMessage('');
    setAltText({ altAr: '', altEn: '', generating: false, saving: false, saved: false, error: '' });
    onRemove?.();
  }, [onRemove]);

  const displayImage = currentImage ?? previewUrl;
  const activeUrl = uploadedUrl ?? currentImage ?? null;

  // ─── Image preview ─────────────────────────────────────────

  if (displayImage && uploadState !== 'error') {
    return (
      <div className={className}>
        {/* Image preview card */}
        <div className="relative group">
          <img
            src={displayImage}
            alt="Preview"
            className={`w-full ${aspectClass} object-cover rounded-xl`}
          />
          {/* Upload state overlay */}
          {uploadState === 'uploading' && (
            <div className="absolute inset-0 bg-obsidian/60 rounded-xl flex items-center justify-center">
              <Loader2 size={32} className="text-gold animate-spin" />
            </div>
          )}
          {uploadState === 'success' && (
            <div className="absolute top-2 right-2 p-1.5 bg-profit/20 text-profit rounded-lg">
              <CheckCircle size={16} />
            </div>
          )}
          {/* Remove button */}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 left-2 p-1.5 bg-obsidian/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>

        {/* AI Alt Text Panel */}
        {showAIAltText && uploadState === 'success' && (
          <div className="mt-3 p-4 bg-obsidian border border-gold/10 rounded-xl space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-xs font-[family-name:var(--font-display)] flex items-center gap-1.5">
                <Sparkles size={12} className="text-gold" />
                وصف الصورة (ذكاء اصطناعي)
              </span>
              <button
                type="button"
                onClick={() => activeUrl && generateAltText(activeUrl)}
                disabled={altText.generating || !activeUrl}
                className="flex items-center gap-1.5 px-3 py-1 bg-gold/10 text-gold text-xs rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-display)]"
              >
                {altText.generating ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                {altText.generating ? 'جاري التوليد...' : 'توليد تلقائي'}
              </button>
            </div>

            {/* Error */}
            {altText.error && (
              <p className="text-loss text-xs font-[family-name:var(--font-display)]">
                {altText.error}
              </p>
            )}

            {/* Arabic alt text */}
            <div>
              <label className="block text-white/50 text-xs mb-1 font-[family-name:var(--font-display)]">
                وصف الصورة (عربي)
              </label>
              <input
                type="text"
                dir="rtl"
                value={altText.altAr}
                onChange={(e) => setAltText((prev) => ({ ...prev, altAr: e.target.value, saved: false }))}
                placeholder="وصف مختصر للصورة بالعربية..."
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>

            {/* English alt text */}
            <div>
              <label className="block text-white/50 text-xs mb-1">
                Image description (EN)
              </label>
              <input
                type="text"
                dir="ltr"
                value={altText.altEn}
                onChange={(e) => setAltText((prev) => ({ ...prev, altEn: e.target.value, saved: false }))}
                placeholder="Brief image description in English..."
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition-colors"
              />
            </div>

            {/* Save button — only shown when mediaId is available */}
            {mediaId && (
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={saveAltText}
                  disabled={altText.saving || altText.saved || (!altText.altAr && !altText.altEn)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gold/10 text-gold text-xs rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-display)]"
                >
                  {altText.saving ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Save size={11} />
                  )}
                  {altText.saving ? 'جاري الحفظ...' : altText.saved ? 'تم الحفظ ✓' : 'حفظ الوصف'}
                </button>
                {altText.saved && (
                  <span className="text-profit text-xs font-[family-name:var(--font-display)]">
                    تم الحفظ بنجاح
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Drop zone ─────────────────────────────────────────────

  return (
    <div className={className}>
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full ${aspectClass} border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragging
            ? 'border-gold bg-gold/10'
            : uploadState === 'error'
            ? 'border-loss/30 hover:border-loss/50'
            : 'border-gold/20 hover:border-gold/40'
        }`}
      >
        {uploadState === 'uploading' ? (
          <>
            <Loader2 size={32} className="text-gold animate-spin mb-2" />
            <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              جاري الرفع...
            </span>
          </>
        ) : uploadState === 'error' ? (
          <>
            <AlertCircle size={32} className="text-loss/50 mb-2" />
            <span className="text-loss/70 text-sm font-[family-name:var(--font-display)]">
              {errorMessage}
            </span>
            <span className="text-white/30 text-xs mt-1">اضغط للمحاولة مرة أخرى</span>
          </>
        ) : (
          <>
            <Upload className="text-gold/50 mb-2" size={32} />
            <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              {hintText}
            </span>
            <span className="text-white/30 text-xs mt-1">{formatHint}</span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileInput}
        />
      </label>
    </div>
  );
}

export { ImageUploader };
