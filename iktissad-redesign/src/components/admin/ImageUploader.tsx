/**
 * ImageUploader - Drag-and-drop image upload component
 *
 * Uses Supabase Storage for file uploads.
 * Supports drag-and-drop, file type validation, progress indication,
 * and preview after upload.
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

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
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate
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

      try {
        const result = await uploadFile(bucket, file, folder);
        setUploadState('success');
        onUpload?.(result.publicUrl, result.path);

        // Clean up local preview after successful upload
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(result.publicUrl);
      } catch (err: any) {
        setUploadState('error');
        setErrorMessage(err.message ?? 'Upload failed');
        onError?.(err.message ?? 'Upload failed');
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
      }
    },
    [bucket, folder, maxSizeMB, onUpload, onError]
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
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setPreviewUrl(null);
    setUploadState('idle');
    setErrorMessage('');
    onRemove?.();
  }, [onRemove]);

  const displayImage = currentImage ?? previewUrl;

  // Show image preview
  if (displayImage && uploadState !== 'error') {
    return (
      <div className={`relative group ${className}`}>
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
    );
  }

  // Show drop zone
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
