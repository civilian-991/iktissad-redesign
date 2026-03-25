'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  FolderOpen,
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit3,
  Eye,
  Archive,
  X,
  BookOpen,
} from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import { iconSizes } from '@/lib/design-tokens';
import type { ApiResponse, ArticleSeries } from '@/types';
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary';

// ─── Series Form Modal ────────────────────────────────────────────────────────

interface SeriesFormModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function SeriesFormModal({ onClose, onCreated }: SeriesFormModalProps) {
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    // Auto-generate slug from Arabic transliterated or simplified
    if (!slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9\-أ-ي]/g, '')
          .replace(/[أإآا]/g, 'a')
          .replace(/[ب]/g, 'b')
          .replace(/[ت]/g, 't')
          .replace(/[ث]/g, 'th')
          .replace(/[ج]/g, 'j')
          .replace(/[ح]/g, 'h')
          .replace(/[خ]/g, 'kh')
          .replace(/[د]/g, 'd')
          .replace(/[ذ]/g, 'dh')
          .replace(/[ر]/g, 'r')
          .replace(/[ز]/g, 'z')
          .replace(/[س]/g, 's')
          .replace(/[ش]/g, 'sh')
          .replace(/[ص]/g, 's')
          .replace(/[ض]/g, 'd')
          .replace(/[ط]/g, 't')
          .replace(/[ظ]/g, 'z')
          .replace(/[ع]/g, 'a')
          .replace(/[غ]/g, 'gh')
          .replace(/[ف]/g, 'f')
          .replace(/[ق]/g, 'q')
          .replace(/[ك]/g, 'k')
          .replace(/[ل]/g, 'l')
          .replace(/[م]/g, 'm')
          .replace(/[ن]/g, 'n')
          .replace(/[ه]/g, 'h')
          .replace(/[و]/g, 'w')
          .replace(/[ي]/g, 'y')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      toast.error('العنوان والمعرّف مطلوبان');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, titleEn, slug, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'حدث خطأ');
      toast.success('تم إنشاء الملف بنجاح');
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-midnight border border-gold/20 rounded-2xl p-6 z-50"
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-white flex items-center gap-2">
            <FolderOpen size={20} className="text-gold" />
            ملف جديد
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={iconSizes.md} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title AR */}
          <div>
            <label className="block text-white/60 text-sm font-[family-name:var(--font-display)] mb-1.5">
              عنوان الملف (عربي) <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="مثال: ملف اقتصاد الطاقة"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
              required
            />
          </div>

          {/* Title EN */}
          <div>
            <label className="block text-white/60 text-sm font-[family-name:var(--font-display)] mb-1.5">
              عنوان الملف (إنجليزي)
            </label>
            <input
              type="text"
              value={titleEn}
              onChange={e => setTitleEn(e.target.value)}
              placeholder="مثال: ملف الاقتصاد والطاقة"
              dir="ltr"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-white/60 text-sm font-[family-name:var(--font-display)] mb-1.5">
              المعرّف (slug) <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="energy-economy"
              dir="ltr"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
              required
            />
            <p className="mt-1 text-xs text-white/40 font-[family-name:var(--font-display)]">
              سيُستخدم في الرابط: /ملفات/{slug || '...'}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-white/60 text-sm font-[family-name:var(--font-display)] mb-1.5">
              وصف الملف
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="وصف موجز لهذا الملف التحريري..."
              rows={3}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/10 text-white font-[family-name:var(--font-display)] font-semibold rounded-xl hover:bg-white/20 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-bold rounded-xl hover:shadow-gold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {saving ? 'جارٍ الإنشاء...' : 'إنشاء الملف'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
  seriesTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteModal({ seriesTitle, onConfirm, onCancel, deleting }: DeleteModalProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-midnight border border-gold/20 rounded-2xl p-6 z-50 text-center"
        dir="rtl"
      >
        <div className="w-14 h-14 mx-auto mb-4 bg-loss/20 rounded-full flex items-center justify-center">
          <Trash2 size={28} className="text-loss" />
        </div>
        <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-2">
          حذف الملف؟
        </h3>
        <p className="text-white/60 text-sm mb-6 font-[family-name:var(--font-display)]">
          سيُحذف ملف <span className="text-white font-semibold">{seriesTitle}</span> وجميع ارتباطاته بالمقالات. لا يمكن التراجع.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-3 bg-white/10 text-white font-[family-name:var(--font-display)] font-semibold rounded-xl hover:bg-white/20 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-3 bg-loss text-white font-[family-name:var(--font-display)] font-bold rounded-xl hover:bg-loss/80 transition-colors flex items-center justify-center gap-2"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {deleting ? 'جارٍ الحذف...' : 'حذف'}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SeriesClient() {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArticleSeries | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, mutate } = useSWR<ApiResponse<ArticleSeries[]>>(
    '/api/series',
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const series = data?.data ?? [];

  const filtered = series.filter(s =>
    !search ||
    s.title.includes(search) ||
    (s.titleEn ?? '').toLowerCase().includes(search.toLowerCase()) ||
    s.slug.includes(search)
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/series/${deleteTarget.slug}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'حدث خطأ');
      toast.success('تم حذف الملف');
      mutate();
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, mutate]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1 flex items-center gap-2">
            <FolderOpen size={22} className="text-gold" />
            الملفات التحريرية
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {filtered.length} ملف — تجميع المقالات في سلاسل تحريرية مترابطة
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-bold rounded-xl hover:shadow-gold transition-all"
        >
          <Plus size={18} />
          ملف جديد
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
        <input
          type="text"
          placeholder="بحث في الملفات..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
        />
      </div>

      {/* Series Grid */}
      <SectionErrorBoundary section="series-list">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-gold/50" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={48} className="mx-auto text-white/20 mb-4" />
            <h3 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-2">
              {search ? 'لا نتائج مطابقة' : 'لا توجد ملفات بعد'}
            </h3>
            <p className="text-white/50 text-sm font-[family-name:var(--font-display)] mb-6">
              {search ? 'جرّب تغيير كلمة البحث' : 'أنشئ أول ملف تحريري لتجميع المقالات ذات الصلة'}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-[family-name:var(--font-display)] font-bold rounded-xl hover:bg-gold-muted transition-colors"
              >
                <Plus size={18} />
                إنشاء ملف جديد
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((s, index) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  className="group bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden hover:border-gold/30 transition-all"
                >
                  {/* Cover image */}
                  {s.coverImage ? (
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={s.coverImage}
                        alt={s.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/40 to-transparent" />
                      {/* Status badge overlay */}
                      <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-[family-name:var(--font-display)] font-semibold ${
                        s.status === 'active'
                          ? 'bg-profit/20 text-profit'
                          : 'bg-white/10 text-white/60'
                      }`}>
                        {s.status === 'active' ? 'نشط' : 'مؤرشف'}
                      </span>
                    </div>
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-gold/10 to-bronze/10 flex items-center justify-center relative">
                      <FolderOpen size={36} className="text-gold/30" />
                      <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-[family-name:var(--font-display)] font-semibold ${
                        s.status === 'active'
                          ? 'bg-profit/20 text-profit'
                          : 'bg-white/10 text-white/60'
                      }`}>
                        {s.status === 'active' ? 'نشط' : 'مؤرشف'}
                      </span>
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4">
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-white mb-1 group-hover:text-gold/90 transition-colors line-clamp-1">
                      {s.title}
                    </h3>
                    {s.titleEn && (
                      <p className="text-white/40 text-xs mb-2 font-[family-name:var(--font-display)]" dir="ltr">
                        {s.titleEn}
                      </p>
                    )}
                    {s.description && (
                      <p className="text-white/60 text-sm font-[family-name:var(--font-display)] line-clamp-2 mb-3">
                        {s.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-white/50 font-[family-name:var(--font-display)]">
                        <BookOpen size={12} />
                        {s.articleCount ?? 0} مقالة
                      </span>
                      <p className="text-white/30 text-xs font-mono">{s.slug}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    <Link
                      href={`/admin/series/${s.slug}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-gold/10 text-gold hover:bg-gold/20 rounded-lg transition-colors text-sm font-[family-name:var(--font-display)] font-semibold"
                    >
                      <Edit3 size={14} />
                      إدارة
                    </Link>
                    <Link
                      href={`/ملفات/${s.slug}`}
                      target="_blank"
                      className="p-2 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="عرض الصفحة العامة"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      className="p-2 bg-white/5 text-white/50 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                      title="حذف الملف"
                    >
                      {s.status === 'archived'
                        ? <Trash2 size={16} />
                        : <Archive size={16} />
                      }
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </SectionErrorBoundary>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <SeriesFormModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => mutate()}
          />
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            seriesTitle={deleteTarget.title}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
