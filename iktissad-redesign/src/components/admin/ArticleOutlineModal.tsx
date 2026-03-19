'use client';

/**
 * ArticleOutlineModal
 *
 * Shows the suggested structural outline for the selected article type.
 * Provides "إدراج في المحرر" (Insert into editor) and "إلغاء" (Cancel) buttons.
 * The outline HTML is produced by buildArticleOutline() from the arabic-editorial lib.
 */

import { motion } from 'motion/react';
import { X, LayoutTemplate } from 'lucide-react';
import { ArticleType, buildArticleOutline, getStylePreset } from '@/lib/ai/arabic-editorial';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ArticleOutlineModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** The currently selected article type */
  articleType: ArticleType;
  /** Called with the outline HTML when user clicks "إدراج" */
  onInsert: (html: string) => void;
  /** Called when user dismisses the modal without inserting */
  onCancel: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ArticleOutlineModal({
  open,
  articleType,
  onInsert,
  onCancel,
}: ArticleOutlineModalProps) {
  if (!open) return null;

  const config = getStylePreset(articleType);
  const outlineHtml = buildArticleOutline(articleType);

  const handleInsert = () => {
    onInsert(outlineHtml);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
      dir="rtl"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-midnight border border-gold/10 rounded-2xl p-6 max-w-lg w-full shadow-elevated"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <LayoutTemplate size={20} className="text-gold" />
            </div>
            <div>
              <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
                البنية المقترحة
              </h3>
              <p className="text-white/50 text-xs font-[family-name:var(--font-display)]">
                {config.arabicLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Outline preview */}
        <div className="bg-white/5 border border-gold/10 rounded-xl p-4 mb-5 space-y-2">
          {config.outlineTemplate.map((section, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2 border-b border-gold/5 last:border-0"
            >
              <span className="w-6 h-6 rounded-full bg-gold/15 text-gold text-xs flex items-center justify-center flex-shrink-0 font-semibold font-[family-name:var(--font-display)]">
                {i + 1}
              </span>
              <span className="text-white/80 text-sm font-[family-name:var(--font-display)]">
                {section}
              </span>
            </div>
          ))}
        </div>

        {/* Info note */}
        <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-5 leading-relaxed">
          سيتم إدراج هذه العناوين في المحرر كهيكل أولي. يمكنك تعديلها أو حذفها
          بحرية بعد الإدراج.
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-xl font-[family-name:var(--font-display)] text-sm hover:bg-white/10 transition-colors border border-white/10"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian rounded-xl font-[family-name:var(--font-display)] text-sm font-semibold hover:shadow-gold transition-all flex items-center justify-center gap-2"
          >
            <LayoutTemplate size={15} />
            إدراج في المحرر
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
