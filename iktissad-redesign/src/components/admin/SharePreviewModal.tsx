'use client';

/**
 * SharePreviewModal — Modal for generating tokenized preview links.
 *
 * Allows editors to generate a temporary 48-hour link that lets anyone
 * with the link preview an article as a draft — useful for source review
 * or editorial approval before publication.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Share2,
  X,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Clock,
  Link as LinkIcon,
} from 'lucide-react';

// ─── Props ───────────────────────────────────────────────────────

export interface SharePreviewModalProps {
  articleId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ─── SharePreviewModal ──────────────────────────────────────────

export default function SharePreviewModal({
  articleId,
  isOpen,
  onClose,
}: SharePreviewModalProps) {
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Generate token ────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/preview/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const token: string = data.data?.token ?? data.token;
      const expiry: string | undefined = data.data?.expiresAt ?? data.expiresAt;

      if (!token) throw new Error('لم يُعاد الرابط من الخادم');

      const url = `${window.location.origin}/preview/${token}`;
      setPreviewUrl(url);
      if (expiry) setExpiresAt(expiry);

      toast.success('تم إنشاء الرابط بنجاح');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء الرابط';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }, [articleId]);

  // ── Copy to clipboard ─────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      toast.success('تم نسخ الرابط');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('تعذّر النسخ');
    }
  }, [previewUrl]);

  // ── Reset state on close ──────────────────────────────────────
  const handleClose = useCallback(() => {
    onClose();
    // Reset state after animation completes
    setTimeout(() => {
      setPreviewUrl(null);
      setExpiresAt(null);
      setCopied(false);
    }, 300);
  }, [onClose]);

  // ── Expiry label ──────────────────────────────────────────────
  function expiryLabel(expiresAtStr: string): string {
    try {
      const diff = new Date(expiresAtStr).getTime() - Date.now();
      const hours = Math.round(diff / 3_600_000);
      if (hours <= 0) return 'انتهت الصلاحية';
      if (hours < 24) return `ينتهي خلال ${hours} ساعة`;
      const days = Math.round(hours / 24);
      return `ينتهي خلال ${days} يوم`;
    } catch {
      return 'ينتهي صلاحية الرابط بعد 48 ساعة';
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-midnight border border-gold/10 rounded-2xl p-6 max-w-md w-full shadow-2xl pointer-events-auto"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                    <Share2 size={18} className="text-gold" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white font-[family-name:var(--font-display)]">
                      مشاركة للمراجعة
                    </h2>
                    <p className="text-xs text-white/40 font-[family-name:var(--font-display)] mt-0.5">
                      رابط مؤقت للمعاينة
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  title="إغلاق"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-white/60 font-[family-name:var(--font-display)] leading-relaxed mb-5">
                أنشئ رابطاً مؤقتاً يتيح لأي شخص مطلع على الرابط استعراض المقال كمسودة. يصلح هذا للمراجعة من المصادر أو الموافقة قبل النشر.
              </p>

              {/* No link yet — generate button */}
              {!previewUrl && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gold to-gold/80 text-ink font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-display)] text-sm"
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      جارٍ الإنشاء…
                    </>
                  ) : (
                    <>
                      <LinkIcon size={16} />
                      إنشاء رابط
                    </>
                  )}
                </button>
              )}

              {/* Link generated state */}
              <AnimatePresence>
                {previewUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {/* URL display */}
                    <div className="flex items-center gap-2 p-3 bg-white/5 border border-gold/10 rounded-xl">
                      <LinkIcon size={13} className="shrink-0 text-gold/60" />
                      <span className="flex-1 text-xs text-white/80 font-mono truncate select-all">
                        {previewUrl}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Copy button */}
                      <button
                        onClick={handleCopy}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all font-[family-name:var(--font-display)] ${
                          copied
                            ? 'bg-profit/20 text-profit border border-profit/30'
                            : 'bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check size={14} />
                            تم النسخ!
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            نسخ الرابط
                          </>
                        )}
                      </button>

                      {/* Open in new tab */}
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-gold/10 rounded-xl text-white/60 hover:text-white text-sm transition-colors"
                        title="فتح في نافذة جديدة"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    {/* Expiry badge */}
                    <div className="flex items-center gap-1.5 text-xs text-white/40 font-[family-name:var(--font-display)]">
                      <Clock size={11} />
                      {expiresAt
                        ? expiryLabel(expiresAt)
                        : 'ينتهي صلاحية الرابط بعد 48 ساعة'}
                    </div>

                    {/* Regenerate link */}
                    <button
                      onClick={() => { setPreviewUrl(null); setExpiresAt(null); setCopied(false); }}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors font-[family-name:var(--font-display)]"
                    >
                      إنشاء رابط جديد
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
