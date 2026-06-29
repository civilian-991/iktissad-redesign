/**
 * ImageEditorModal - In-browser image editor (crop, resize, rotate, flip, adjust)
 *
 * A lightweight "Photoshop-lite" editor so admins can crop and resize images
 * without leaving the CMS. Built on react-image-crop for the crop UI plus a
 * custom canvas pipeline for rotate/flip/brightness/contrast/saturation/resize.
 *
 * Rotation and flips are baked into the working image immediately (so crop
 * coordinates stay axis-aligned); crop, adjustments and resize are applied at
 * export time. The result is uploaded to Supabase Storage and returned as a URL.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  X,
  Crop as CropIcon,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  SlidersHorizontal,
  Ruler,
  Loader2,
  Check,
  RefreshCw,
  Lock,
  Unlock,
} from 'lucide-react';
import { uploadFile, type StorageBucket } from '@/lib/supabase/storage';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ImageEditorModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Source image URL to edit */
  src: string | null;
  /** Storage bucket to upload the edited result to */
  bucket: StorageBucket;
  /** Folder within the bucket */
  folder?: string;
  /** Close handler */
  onClose: () => void;
  /** Called with the public URL + path of the uploaded edited image */
  onSave: (url: string, path: string) => void;
  /** Optional filename for the exported file */
  filename?: string;
}

type Tool = 'crop' | 'transform' | 'adjust' | 'resize';

interface AspectPreset {
  label: string;
  value: number | undefined;
}

const ASPECT_PRESETS: AspectPreset[] = [
  { label: 'حر', value: undefined },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '3:4', value: 3 / 4 },
];

const DEFAULT_ADJUST = { brightness: 100, contrast: 100, saturation: 100 };

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ImageEditorModal({
  open,
  src,
  bucket,
  folder,
  onClose,
  onSave,
  filename,
}: ImageEditorModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<Tool>('crop');
  // Working source: rotation/flip are baked into this so crop coords stay simple.
  const [workingSrc, setWorkingSrc] = useState<string | null>(src);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [adjust, setAdjust] = useState(DEFAULT_ADJUST);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [resize, setResize] = useState({ width: 0, height: 0 });
  const [resizeDirty, setResizeDirty] = useState(false);
  const [lockAspect, setLockAspect] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Reset all state whenever a new image is opened
  useEffect(() => {
    if (open) {
      setWorkingSrc(src);
      setTool('crop');
      setCrop(undefined);
      setCompletedCrop(null);
      setAspect(undefined);
      setAdjust(DEFAULT_ADJUST);
      setResize({ width: 0, height: 0 });
      setResizeDirty(false);
      setLockAspect(true);
      setError('');
    }
  }, [open, src]);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !busy) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, busy]);

  const filterString = `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%)`;

  // ─── Image load ────────────────────────────────────────────
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setResize((prev) =>
      prev.width === 0 ? { width: img.naturalWidth, height: img.naturalHeight } : prev
    );
  }, []);

  // ─── Aspect preset ─────────────────────────────────────────
  const applyAspect = useCallback((value: number | undefined) => {
    setAspect(value);
    const img = imgRef.current;
    if (!img) return;
    if (value) {
      const { width, height } = img;
      const newCrop = centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, value, width, height),
        width,
        height
      );
      setCrop(newCrop);
      // Compute pixel crop for export
      setCompletedCrop({
        unit: 'px',
        x: (newCrop.x / 100) * width,
        y: (newCrop.y / 100) * height,
        width: (newCrop.width / 100) * width,
        height: (newCrop.height / 100) * height,
      });
    } else {
      setCrop(undefined);
      setCompletedCrop(null);
    }
  }, []);

  // ─── Rotate / flip (baked into working image) ──────────────
  const bakeTransform = useCallback(
    (mode: 'rotate-cw' | 'rotate-ccw' | 'flip-h' | 'flip-v') => {
      if (!workingSrc) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        if (mode === 'rotate-cw' || mode === 'rotate-ccw') {
          canvas.width = h;
          canvas.height = w;
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(((mode === 'rotate-cw' ? 90 : -90) * Math.PI) / 180);
          ctx.drawImage(img, -w / 2, -h / 2);
        } else {
          canvas.width = w;
          canvas.height = h;
          if (mode === 'flip-h') {
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
          } else {
            ctx.translate(0, h);
            ctx.scale(1, -1);
          }
          ctx.drawImage(img, 0, 0);
        }

        setWorkingSrc(canvas.toDataURL('image/png'));
        // Reset crop because dimensions/orientation changed
        setCrop(undefined);
        setCompletedCrop(null);
        setAspect(undefined);
      };
      img.onerror = () => setError('تعذّر تحميل الصورة للتعديل (قد تكون مشكلة CORS)');
      img.src = workingSrc;
    },
    [workingSrc]
  );

  // ─── Resize inputs (aspect-locked) ─────────────────────────
  const handleResizeWidth = useCallback(
    (value: number) => {
      setResizeDirty(true);
      setResize((prev) => {
        if (lockAspect && prev.width > 0) {
          const ratio = prev.height / prev.width;
          return { width: value, height: Math.round(value * ratio) };
        }
        return { ...prev, width: value };
      });
    },
    [lockAspect]
  );

  const handleResizeHeight = useCallback(
    (value: number) => {
      setResizeDirty(true);
      setResize((prev) => {
        if (lockAspect && prev.height > 0) {
          const ratio = prev.width / prev.height;
          return { width: Math.round(value * ratio), height: value };
        }
        return { ...prev, height: value };
      });
    },
    [lockAspect]
  );

  const resetAll = useCallback(() => {
    setWorkingSrc(src);
    setCrop(undefined);
    setCompletedCrop(null);
    setAspect(undefined);
    setAdjust(DEFAULT_ADJUST);
    setResize({ width: naturalSize.width, height: naturalSize.height });
    setResizeDirty(false);
    setError('');
  }, [src, naturalSize]);

  // ─── Export + upload ───────────────────────────────────────
  const handleSave = useCallback(async () => {
    const image = imgRef.current;
    if (!image) return;
    setBusy(true);
    setError('');

    try {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Crop region in natural pixels (full image if no crop selected)
      const cropX = completedCrop ? completedCrop.x * scaleX : 0;
      const cropY = completedCrop ? completedCrop.y * scaleY : 0;
      const cropW = completedCrop?.width
        ? completedCrop.width * scaleX
        : image.naturalWidth;
      const cropH = completedCrop?.height
        ? completedCrop.height * scaleY
        : image.naturalHeight;

      // Stage 1 — crop + adjustments
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = Math.round(cropW);
      cropCanvas.height = Math.round(cropH);
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) throw new Error('Canvas not supported');
      cropCtx.filter = filterString;
      cropCtx.imageSmoothingQuality = 'high';
      cropCtx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      // Stage 2 — resize the final output to the requested dimensions
      // (only when the user explicitly changed them).
      let outputCanvas = cropCanvas;
      if (resizeDirty && resize.width > 0 && resize.height > 0) {
        const resizeCanvas = document.createElement('canvas');
        resizeCanvas.width = resize.width;
        resizeCanvas.height = resize.height;
        const resizeCtx = resizeCanvas.getContext('2d');
        if (!resizeCtx) throw new Error('Canvas not supported');
        resizeCtx.imageSmoothingQuality = 'high';
        resizeCtx.drawImage(cropCanvas, 0, 0, resize.width, resize.height);
        outputCanvas = resizeCanvas;
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        outputCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
      );
      if (!blob) throw new Error('فشل إنشاء الصورة');

      const baseName = (filename || 'image').replace(/\.[^.]+$/, '');
      const file = new File([blob], `${baseName}-edited.jpg`, { type: 'image/jpeg' });
      const result = await uploadFile(bucket, file, folder);
      onSave(result.publicUrl, result.path);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'فشل حفظ الصورة المعدّلة';
      // Tainted canvas → CORS
      setError(
        /tainted|secur/i.test(message)
          ? 'تعذّر تصدير الصورة بسبب قيود CORS على مصدر الصورة'
          : message
      );
    } finally {
      setBusy(false);
    }
  }, [completedCrop, filterString, resize, resizeDirty, filename, bucket, folder, onSave, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
          onClick={() => !busy && onClose()}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
            className="bg-midnight border border-gold/10 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gold/10">
              <div className="flex items-center gap-3">
                <CropIcon size={20} className="text-gold" />
                <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                  تحرير الصورة
                </h3>
              </div>
              <button
                onClick={() => !busy && onClose()}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0 flex-col md:flex-row">
              {/* Canvas area */}
              <div className="flex-1 min-h-0 flex items-center justify-center bg-obsidian/60 p-4 overflow-auto">
                {workingSrc ? (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    className="max-h-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imgRef}
                      src={workingSrc}
                      alt="تحرير"
                      crossOrigin="anonymous"
                      onLoad={onImageLoad}
                      style={{ filter: filterString, maxHeight: '60vh', width: 'auto' }}
                    />
                  </ReactCrop>
                ) : (
                  <div className="text-white/40">لا توجد صورة</div>
                )}
              </div>

              {/* Controls */}
              <div className="w-full md:w-72 shrink-0 border-t md:border-t-0 md:border-s border-gold/10 flex flex-col">
                {/* Tool tabs */}
                <div className="grid grid-cols-4 border-b border-gold/10">
                  {([
                    { id: 'crop', icon: CropIcon, label: 'قص' },
                    { id: 'transform', icon: RotateCw, label: 'تدوير' },
                    { id: 'adjust', icon: SlidersHorizontal, label: 'تعديل' },
                    { id: 'resize', icon: Ruler, label: 'حجم' },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTool(tab.id)}
                      className={`flex flex-col items-center gap-1 py-3 text-[11px] font-[family-name:var(--font-display)] transition-colors ${
                        tool === tab.id
                          ? 'text-gold bg-gold/5 border-b-2 border-gold'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tool panel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {tool === 'crop' && (
                    <div className="space-y-3">
                      <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">
                        اسحب لتحديد منطقة القص، أو اختر نسبة:
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {ASPECT_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => applyAspect(preset.value)}
                            className={`py-2 rounded-lg text-xs font-[family-name:var(--font-display)] transition-colors ${
                              aspect === preset.value
                                ? 'bg-gold text-obsidian'
                                : 'bg-white/5 text-white/70 hover:bg-white/10'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tool === 'transform' && (
                    <div className="space-y-3">
                      <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">
                        تدوير وقلب الصورة:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => bakeTransform('rotate-ccw')}
                          className="flex items-center justify-center gap-2 py-2.5 bg-white/5 text-white/70 hover:bg-white/10 rounded-lg text-xs font-[family-name:var(--font-display)] transition-colors"
                        >
                          <RotateCcw size={15} /> يسار 90°
                        </button>
                        <button
                          onClick={() => bakeTransform('rotate-cw')}
                          className="flex items-center justify-center gap-2 py-2.5 bg-white/5 text-white/70 hover:bg-white/10 rounded-lg text-xs font-[family-name:var(--font-display)] transition-colors"
                        >
                          <RotateCw size={15} /> يمين 90°
                        </button>
                        <button
                          onClick={() => bakeTransform('flip-h')}
                          className="flex items-center justify-center gap-2 py-2.5 bg-white/5 text-white/70 hover:bg-white/10 rounded-lg text-xs font-[family-name:var(--font-display)] transition-colors"
                        >
                          <FlipHorizontal size={15} /> أفقي
                        </button>
                        <button
                          onClick={() => bakeTransform('flip-v')}
                          className="flex items-center justify-center gap-2 py-2.5 bg-white/5 text-white/70 hover:bg-white/10 rounded-lg text-xs font-[family-name:var(--font-display)] transition-colors"
                        >
                          <FlipVertical size={15} /> رأسي
                        </button>
                      </div>
                    </div>
                  )}

                  {tool === 'adjust' && (
                    <div className="space-y-4">
                      {[
                        { key: 'brightness' as const, label: 'السطوع' },
                        { key: 'contrast' as const, label: 'التباين' },
                        { key: 'saturation' as const, label: 'التشبّع' },
                      ].map((s) => (
                        <div key={s.key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-white/60 text-xs font-[family-name:var(--font-display)]">
                              {s.label}
                            </label>
                            <span className="text-white/40 text-xs tabular-nums">
                              {adjust[s.key]}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={200}
                            value={adjust[s.key]}
                            onChange={(e) =>
                              setAdjust((prev) => ({ ...prev, [s.key]: Number(e.target.value) }))
                            }
                            className="w-full accent-gold"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => setAdjust(DEFAULT_ADJUST)}
                        className="text-gold/70 hover:text-gold text-xs font-[family-name:var(--font-display)] transition-colors"
                      >
                        إعادة ضبط التعديلات
                      </button>
                    </div>
                  )}

                  {tool === 'resize' && (
                    <div className="space-y-3">
                      <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">
                        الأبعاد الأصلية: {naturalSize.width}×{naturalSize.height}
                      </p>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-white/50 text-xs mb-1 font-[family-name:var(--font-display)]">
                            العرض (px)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={resize.width}
                            onChange={(e) => handleResizeWidth(Number(e.target.value))}
                            className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/30"
                          />
                        </div>
                        <button
                          onClick={() => setLockAspect((v) => !v)}
                          title={lockAspect ? 'فك القفل' : 'قفل النسبة'}
                          className={`mb-1 p-2 rounded-lg transition-colors ${
                            lockAspect ? 'bg-gold/15 text-gold' : 'bg-white/5 text-white/40'
                          }`}
                        >
                          {lockAspect ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                        <div className="flex-1">
                          <label className="block text-white/50 text-xs mb-1 font-[family-name:var(--font-display)]">
                            الارتفاع (px)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={resize.height}
                            onChange={(e) => handleResizeHeight(Number(e.target.value))}
                            className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/30"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[1920, 1280, 800].map((w) => (
                          <button
                            key={w}
                            onClick={() => handleResizeWidth(Math.min(w, naturalSize.width))}
                            className="px-3 py-1.5 bg-white/5 text-white/60 hover:bg-white/10 rounded-lg text-xs font-[family-name:var(--font-display)] transition-colors"
                          >
                            {w}px
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reset */}
                <div className="p-3 border-t border-gold/10">
                  <button
                    onClick={resetAll}
                    disabled={busy}
                    className="flex items-center gap-2 text-white/50 hover:text-white text-xs font-[family-name:var(--font-display)] transition-colors disabled:opacity-40"
                  >
                    <RefreshCw size={13} /> إعادة تعيين الكل
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gold/10">
              {error ? (
                <p className="text-loss text-xs font-[family-name:var(--font-display)]">{error}</p>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => !busy && onClose()}
                  className="px-4 py-2 text-white/50 hover:text-white font-[family-name:var(--font-display)] text-sm transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={busy || !workingSrc}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl hover:shadow-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {busy ? 'جاري الحفظ...' : 'حفظ الصورة'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { ImageEditorModal };
