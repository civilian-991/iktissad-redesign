'use client';

/**
 * ArticleVersionPanel — Collapsible right-side version history panel.
 *
 * Docked alongside the editor. When collapsed shows a narrow tab (48px)
 * with a History icon. When open, expands to 320px with a scrollable
 * version timeline, inline diff view, and a "save now" button.
 *
 * Features:
 *  - SWR-powered version list (fetched only when panel is open)
 *  - Inline side-by-side diff for any version
 *  - "حفظ نسخة الآن" — manual snapshot with AI-generated summary
 *  - "استرجع" (Restore) with confirmation step
 *  - Loading skeletons and empty state
 */

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  History,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  Eye,
  RotateCcw,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  swrFetcher,
  createArticleVersion,
  restoreArticleVersion,
  generateVersionSummary,
} from '@/lib/api-client';
import type { ArticleVersion, ApiResponse } from '@/types';

// ─── Props ───────────────────────────────────────────────────────

export interface ArticleVersionPanelProps {
  articleId: string;
  isOpen: boolean;
  onToggle: () => void;
  currentTitle: string;
  currentContent: string;
  onRestoreComplete: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatArabicDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const day = date.getDate();
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    const month = arabicMonths[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} - ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

// ─── Simple line-level diff ──────────────────────────────────────

interface DiffSegment {
  type: 'same' | 'added' | 'removed';
  text: string;
}

function simpleDiff(oldText: string, newText: string): DiffSegment[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const result: DiffSegment[] = [];

  // Walk new lines; lines not in old are "added"
  for (const line of newLines) {
    if (oldSet.has(line)) {
      result.push({ type: 'same', text: line });
    } else {
      result.push({ type: 'added', text: line });
    }
  }

  // Append removed lines (in old but not new)
  for (const line of oldLines) {
    if (!newSet.has(line)) {
      result.push({ type: 'removed', text: line });
    }
  }

  return result;
}

// ─── DiffView ───────────────────────────────────────────────────

function DiffView({
  currentTitle,
  currentContent,
  version,
  onClose,
}: {
  currentTitle: string;
  currentContent: string;
  version: ArticleVersion;
  onClose: () => void;
}) {
  const versionPreview = version.content.slice(0, 400);
  const currentPreview = currentContent.slice(0, 400);

  const diff = simpleDiff(versionPreview, currentPreview);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden mt-2"
    >
      <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/80 p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-white/80 font-[family-name:var(--font-display)]">
            مقارنة النصوص
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-zinc-700 transition-colors"
            title="إغلاق"
          >
            <X size={12} />
          </button>
        </div>

        {/* Two-column comparison */}
        <div className="grid grid-cols-2 gap-2">
          {/* Current version */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-2">
            <p className="text-[10px] text-white/40 font-[family-name:var(--font-display)] mb-1.5 font-semibold">
              الإصدار الحالي
            </p>
            <p className="text-xs text-gold font-[family-name:var(--font-display)] font-semibold mb-1 line-clamp-2">
              {currentTitle}
            </p>
            <div className="text-[11px] leading-relaxed font-[family-name:var(--font-display)] space-y-0.5 max-h-32 overflow-y-auto">
              {diff.map((seg, i) => {
                if (seg.type === 'same') {
                  return (
                    <span key={i} className="text-white/60 block">
                      {seg.text || ' '}
                    </span>
                  );
                }
                if (seg.type === 'added') {
                  return (
                    <span key={i} className="text-profit block bg-profit/10 px-0.5 rounded">
                      + {seg.text}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* Historical version */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-2">
            <p className="text-[10px] text-white/40 font-[family-name:var(--font-display)] mb-1.5 font-semibold">
              الإصدار {version.versionNumber}
            </p>
            <p className="text-xs text-gold font-[family-name:var(--font-display)] font-semibold mb-1 line-clamp-2">
              {version.title}
            </p>
            <div className="text-[11px] leading-relaxed font-[family-name:var(--font-display)] space-y-0.5 max-h-32 overflow-y-auto">
              {diff.map((seg, i) => {
                if (seg.type === 'same') {
                  return (
                    <span key={i} className="text-white/60 block">
                      {seg.text || ' '}
                    </span>
                  );
                }
                if (seg.type === 'removed') {
                  return (
                    <span key={i} className="text-loss/70 block bg-loss/10 px-0.5 rounded">
                      - {seg.text}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── VersionItem ─────────────────────────────────────────────────

interface VersionItemProps {
  version: ArticleVersion;
  currentTitle: string;
  currentContent: string;
  onRestore: (versionId: string) => Promise<void>;
}

function VersionItem({ version, currentTitle, currentContent, onRestore }: VersionItemProps) {
  const [showDiff, setShowDiff] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      await onRestore(version.id);
      setConfirmRestore(false);
    } finally {
      setRestoring(false);
    }
  }, [version.id, onRestore]);

  return (
    <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-3">
      {/* Version header */}
      <div className="flex items-start gap-2 mb-2">
        {/* Version badge */}
        <span className="shrink-0 px-1.5 py-0.5 bg-gold/20 text-gold text-[10px] font-bold rounded font-[family-name:var(--font-display)]">
          v{version.versionNumber}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/80 font-[family-name:var(--font-display)] truncate">
            {version.title}
          </p>
          <p className="text-[10px] text-white/40 font-[family-name:var(--font-display)] mt-0.5">
            {formatArabicDate(version.createdAt)}
          </p>
          {version.summary && (
            <p className="text-[10px] text-white/50 font-[family-name:var(--font-display)] mt-1 leading-relaxed">
              {version.summary}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={() => setShowDiff((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white/70 hover:text-white rounded-lg text-[10px] font-[family-name:var(--font-display)] transition-colors"
        >
          <Eye size={10} />
          استعرض
        </button>
        {!confirmRestore ? (
          <button
            onClick={() => setConfirmRestore(true)}
            className="flex items-center gap-1 px-2 py-1 bg-gold/10 hover:bg-gold/20 text-gold rounded-lg text-[10px] font-[family-name:var(--font-display)] transition-colors border border-gold/20"
          >
            <RotateCcw size={10} />
            استرجع
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] text-loss font-[family-name:var(--font-display)]">
              <AlertTriangle size={10} />
              تأكيد؟
            </span>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="flex items-center gap-1 px-2 py-1 bg-loss/20 hover:bg-loss/30 text-loss rounded-lg text-[10px] font-[family-name:var(--font-display)] transition-colors disabled:opacity-40"
            >
              {restoring ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
              نعم
            </button>
            <button
              onClick={() => setConfirmRestore(false)}
              className="px-2 py-1 text-white/40 hover:text-white/70 text-[10px] font-[family-name:var(--font-display)] transition-colors"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>

      {/* Inline diff */}
      <AnimatePresence>
        {showDiff && (
          <DiffView
            currentTitle={currentTitle}
            currentContent={currentContent}
            version={version}
            onClose={() => setShowDiff(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────

function VersionSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-700/40 bg-zinc-800/30 p-3 animate-pulse"
        >
          <div className="flex gap-2 mb-2">
            <div className="w-8 h-4 bg-zinc-700 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-zinc-700 rounded w-3/4" />
              <div className="h-2.5 bg-zinc-700/60 rounded w-1/2" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-zinc-700/60 rounded-lg" />
            <div className="h-5 w-16 bg-zinc-700/40 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ArticleVersionPanel (main export) ──────────────────────────

export default function ArticleVersionPanel({
  articleId,
  isOpen,
  onToggle,
  currentTitle,
  currentContent,
  onRestoreComplete,
}: ArticleVersionPanelProps) {
  const swrKey = `/api/articles/${articleId}/versions`;

  const { data: versionsRes, isLoading, mutate } = useSWR<ApiResponse<ArticleVersion[]>>(
    isOpen ? swrKey : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const versions = versionsRes?.data ?? [];

  const [savingSnapshot, setSavingSnapshot] = useState(false);

  // ── Save snapshot now ─────────────────────────────────────────
  const handleSaveNow = useCallback(async () => {
    setSavingSnapshot(true);
    try {
      // 1. Create the version
      const createRes = await createArticleVersion(articleId);
      if (!createRes.data) throw new Error('فشل إنشاء الإصدار');

      toast.success('تم حفظ النسخة');

      // 2. Try to generate AI summary (fire-and-forget style — errors are silent)
      const lastVersion = versions[0];
      if (lastVersion) {
        generateVersionSummary(lastVersion.content, currentContent).catch(() => {
          // silent — summary is best-effort
        });
      }

      // 3. Refresh the list
      mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      toast.error(msg);
    } finally {
      setSavingSnapshot(false);
    }
  }, [articleId, versions, currentContent, mutate]);

  // ── Restore handler ───────────────────────────────────────────
  const handleRestore = useCallback(async (versionId: string) => {
    try {
      await restoreArticleVersion(articleId, versionId);
      toast.success('تم استرجاع الإصدار بنجاح');
      mutate();
      onRestoreComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل الاسترجاع';
      toast.error(msg);
      throw err; // re-throw so VersionItem can clear loading state
    }
  }, [articleId, mutate, onRestoreComplete]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex h-full" dir="rtl">
      {/* Collapsed tab */}
      {!isOpen && (
        <button
          onClick={onToggle}
          title="سجل الإصدارات"
          className="flex flex-col items-center justify-center w-12 gap-2 border-r border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-colors text-white/50 hover:text-gold shrink-0"
          style={{ minHeight: 120 }}
        >
          <History size={16} className="text-gold" />
          <span
            className="text-xs font-semibold text-white/50"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            إصدارات
          </span>
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Open panel */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 320 }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col shrink-0 border-r border-zinc-700 bg-zinc-900 overflow-hidden"
          style={{ width: 320 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-700 bg-zinc-800/60 shrink-0">
            <div className="flex items-center gap-2">
              <History size={14} className="text-gold" />
              <span className="text-xs font-bold text-white tracking-wide font-[family-name:var(--font-display)]">
                سجل الإصدارات
              </span>
              {versions.length > 0 && (
                <span className="px-1.5 py-0.5 bg-gold/20 text-gold text-[10px] font-bold rounded-full">
                  {versions.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {/* Save now button */}
              <button
                onClick={handleSaveNow}
                disabled={savingSnapshot}
                className="flex items-center gap-1 px-2 py-1 bg-gold/15 hover:bg-gold/25 text-gold text-[10px] font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-display)] border border-gold/20"
                title="حفظ نسخة الآن"
              >
                {savingSnapshot ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Save size={10} />
                )}
                حفظ نسخة الآن
              </button>
              <button
                onClick={onToggle}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-zinc-700 transition-colors"
                title="إغلاق"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Version list */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
            {isLoading ? (
              <VersionSkeleton />
            ) : versions.length === 0 ? (
              <div className="text-center py-10">
                <History size={28} className="mx-auto text-white/15 mb-2" />
                <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">
                  لا توجد إصدارات محفوظة بعد
                </p>
                <p className="text-white/20 text-[10px] font-[family-name:var(--font-display)] mt-1">
                  اضغط &ldquo;حفظ نسخة الآن&rdquo; لحفظ النسخة الحالية
                </p>
              </div>
            ) : (
              versions.map((version) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  currentTitle={currentTitle}
                  currentContent={currentContent}
                  onRestore={handleRestore}
                />
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="shrink-0 px-3 py-2 border-t border-zinc-700/60">
            <p className="text-[10px] text-white/20 text-center font-[family-name:var(--font-display)]">
              يتم الحفظ التلقائي عند كل حفظ يدوي
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
