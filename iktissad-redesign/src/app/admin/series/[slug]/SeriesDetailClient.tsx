'use client';

/**
 * Series Detail Admin Page
 *
 * Features:
 * - Series header with title, description, edit form
 * - Article order list (drag-to-reorder via @dnd-kit/sortable)
 * - "إضافة مقالة" button → article search modal
 * - "عرض الصفحة العامة" link
 * - PATCH /api/series/[slug]/articles for reorder
 * - DELETE /api/series/[slug]/articles?seriesArticleId=... for removal
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FolderOpen,
  GripVertical,
  Plus,
  Trash2,
  Search,
  Loader2,
  ExternalLink,
  Edit3,
  ChevronRight,
  BookOpen,
  X,
  Save,
} from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import { iconSizes } from '@/lib/design-tokens';
import type { ApiResponse, ArticleSeries, SeriesArticle, Article } from '@/types';
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary';

// ─── Sortable Article Row ─────────────────────────────────────────────────────

interface SortableArticleRowProps {
  item: SeriesArticle;
  index: number;
  onRemove: (id: string) => void;
}

function SortableArticleRow({ item, index, onRemove }: SortableArticleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const publishedAt = item.article?.publishedAt
    ? new Date(item.article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-midnight/60 border rounded-xl transition-colors ${
        isDragging ? 'border-gold/40 shadow-lg' : 'border-gold/10 hover:border-gold/20'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-white/30 hover:text-white/70 transition-colors touch-none"
      >
        <GripVertical size={iconSizes.md} />
      </button>

      {/* Order badge */}
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/15 text-gold text-sm font-bold flex items-center justify-center font-[family-name:var(--font-display)]">
        {index + 1}
      </span>

      {/* Article info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-[family-name:var(--font-display)] font-semibold text-sm line-clamp-1">
          {item.article?.title ?? item.articleId}
        </p>
        {item.article?.excerpt && (
          <p className="text-white/40 text-xs mt-0.5 line-clamp-1 font-[family-name:var(--font-display)]">
            {item.article.excerpt}
          </p>
        )}
      </div>

      {/* Published date */}
      {publishedAt && (
        <span className="flex-shrink-0 text-xs text-white/40 font-[family-name:var(--font-display)] hidden sm:block">
          {publishedAt}
        </span>
      )}

      {/* View link */}
      {item.article?.slug && (
        <Link
          href={`/${item.article.slug}`}
          target="_blank"
          className="flex-shrink-0 p-1.5 text-white/30 hover:text-white/70 transition-colors"
          title="عرض المقالة"
        >
          <ExternalLink size={14} />
        </Link>
      )}

      {/* Remove button */}
      <button
        onClick={() => onRemove(item.id)}
        className="flex-shrink-0 p-1.5 text-white/30 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
        title="إزالة من الملف"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Article Search Modal ─────────────────────────────────────────────────────

interface ArticleSearchModalProps {
  seriesSlug: string;
  existingArticleIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}

function ArticleSearchModal({
  seriesSlug,
  existingArticleIds,
  onClose,
  onAdded,
}: ArticleSearchModalProps) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  // Fetch articles matching search
  const apiUrl = search.trim()
    ? `/api/articles?pageSize=20&status=published`
    : `/api/articles?pageSize=20&status=published`;

  const { data, isLoading } = useSWR<ApiResponse<Article[]>>(
    apiUrl,
    swrFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const articles = (data?.data ?? []).filter(a =>
    !existingArticleIds.has(a.id) &&
    (!search.trim() || a.title.includes(search) || a.titleEn?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async (articleId: string) => {
    setAdding(articleId);
    try {
      const res = await fetch(`/api/series/${seriesSlug}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'حدث خطأ');
      toast.success('تمت إضافة المقالة إلى الملف');
      onAdded();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setAdding(null);
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
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-midnight border border-gold/20 rounded-2xl z-50 flex flex-col"
        style={{ maxHeight: '80vh' }}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gold/10 flex-shrink-0">
          <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white flex items-center gap-2">
            <BookOpen size={18} className="text-gold" />
            إضافة مقالة إلى الملف
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={iconSizes.md} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gold/10 flex-shrink-0">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
            <input
              type="text"
              placeholder="بحث في المقالات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-gold/50" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white/40 font-[family-name:var(--font-display)] text-sm">
                {search ? 'لا نتائج مطابقة' : 'جميع المقالات المتاحة مضافة بالفعل'}
              </p>
            </div>
          ) : (
            articles.map(article => (
              <div
                key={article.id}
                className="flex items-start gap-3 p-3 bg-white/5 border border-gold/10 rounded-xl hover:border-gold/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white font-[family-name:var(--font-display)] text-sm font-semibold line-clamp-1">
                    {article.title}
                  </p>
                  {article.excerpt && (
                    <p className="text-white/40 text-xs mt-0.5 line-clamp-1 font-[family-name:var(--font-display)]">
                      {article.excerpt}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleAdd(article.id)}
                  disabled={adding === article.id}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 text-gold hover:bg-gold/20 rounded-lg transition-colors text-xs font-[family-name:var(--font-display)] font-semibold disabled:opacity-60"
                >
                  {adding === article.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Plus size={12} />
                  }
                  إضافة
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Edit Header Modal ────────────────────────────────────────────────────────

interface EditSeriesModalProps {
  series: ArticleSeries;
  onClose: () => void;
  onSaved: () => void;
}

function EditSeriesModal({ series, onClose, onSaved }: EditSeriesModalProps) {
  const [title, setTitle] = useState(series.title);
  const [titleEn, setTitleEn] = useState(series.titleEn ?? '');
  const [description, setDescription] = useState(series.description ?? '');
  const [descriptionEn, setDescriptionEn] = useState(series.descriptionEn ?? '');
  const [coverImage, setCoverImage] = useState(series.coverImage ?? '');
  const [status, setStatus] = useState<'active' | 'archived'>(series.status);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/series/${series.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, titleEn, description, descriptionEn, coverImage, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'حدث خطأ');
      toast.success('تم حفظ التغييرات');
      onSaved();
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
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-midnight border border-gold/20 rounded-2xl p-6 z-50 overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white flex items-center gap-2">
            <Edit3 size={18} className="text-gold" />
            تعديل بيانات الملف
          </h2>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={iconSizes.md} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm font-[family-name:var(--font-display)] mb-1.5">العنوان (عربي) <span className="text-gold">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors" />
          </div>
          <div>
            <label className="block text-white/60 text-sm font-[family-name:var(--font-display)] mb-1.5">العنوان (إنجليزي)</label>
            <input type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)} dir="ltr"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors" />
          </div>
          <div>
            <label className="block text-white/60 text-sm font-[family-name:var(--font-display)] mb-1.5">الوصف (عربي)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-white/60 text-sm font-[family-name:var(--font-display)] mb-1.5">الوصف (إنجليزي)</label>
            <textarea value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} rows={3} dir="ltr"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-white/60 text-sm font-[family-name:var(--font-display)] mb-1.5">رابط صورة الغلاف</label>
            <input type="text" value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://..." dir="ltr"
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors" />
          </div>
          <div>
            <label className="block text-white/60 text-sm font-[family-name:var(--font-display)] mb-1.5">الحالة</label>
            <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'archived')}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 transition-colors">
              <option value="active" className="bg-midnight">نشط</option>
              <option value="archived" className="bg-midnight">مؤرشف</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/10 text-white font-[family-name:var(--font-display)] font-semibold rounded-xl hover:bg-white/20 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-bold rounded-xl hover:shadow-gold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SeriesDetailClientProps {
  slug: string;
}

export default function SeriesDetailClient({ slug }: SeriesDetailClientProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [localItems, setLocalItems] = useState<SeriesArticle[] | null>(null);
  const [reordering, setReordering] = useState(false);

  // Fetch series metadata
  const { data: seriesData, mutate: mutateSeries } = useSWR<ApiResponse<ArticleSeries>>(
    `/api/series/${slug}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // Fetch articles in series
  const { data: articlesData, isLoading, mutate: mutateArticles } = useSWR<ApiResponse<SeriesArticle[]>>(
    `/api/series/${slug}/articles`,
    swrFetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (d) => {
        // Sync local state when fresh data arrives (unless mid-drag)
        if (!reordering) setLocalItems(d.data ?? []);
      },
    }
  );

  const series = seriesData?.data;
  const items = useMemo(() => localItems ?? articlesData?.data ?? [], [localItems, articlesData]);

  const existingIds = new Set(items.map(i => i.articleId));

  // DnD sensors — pointer only (avoids accidental keyboard drag)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        orderIndex: idx,
      }));

      // Optimistic update
      setLocalItems(reordered);
      setReordering(true);

      try {
        const res = await fetch(`/api/series/${slug}/articles`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: reordered.map(i => ({ id: i.id, orderIndex: i.orderIndex })),
          }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'حدث خطأ');
        }
        toast.success('تم حفظ الترتيب');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'فشل حفظ الترتيب');
        // Rollback
        setLocalItems(articlesData?.data ?? []);
      } finally {
        setReordering(false);
        mutateArticles();
      }
    },
    [items, slug, articlesData, mutateArticles]
  );

  const handleRemove = useCallback(
    async (seriesArticleId: string) => {
      // Optimistic
      setLocalItems(prev => (prev ?? items).filter(i => i.id !== seriesArticleId));

      try {
        const res = await fetch(
          `/api/series/${slug}/articles?seriesArticleId=${seriesArticleId}`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'حدث خطأ');
        }
        toast.success('تمت الإزالة من الملف');
        mutateArticles();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'حدث خطأ');
        // Rollback
        setLocalItems(articlesData?.data ?? []);
      }
    },
    [items, slug, articlesData, mutateArticles]
  );

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-white/40 font-[family-name:var(--font-display)]">
        <Link href="/admin/series" className="hover:text-gold transition-colors">
          الملفات التحريرية
        </Link>
        <ChevronRight size={14} className="rotate-180" />
        <span className="text-white/70">{series?.title ?? slug}</span>
      </nav>

      {/* Series Header */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-2xl overflow-hidden">
        {series?.coverImage && (
          <div className="relative h-40 overflow-hidden">
            <img src={series.coverImage} alt={series.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/60 to-transparent" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
                  {series?.title ?? slug}
                </h1>
                {series && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-[family-name:var(--font-display)] font-semibold ${
                    series.status === 'active' ? 'bg-profit/20 text-profit' : 'bg-white/10 text-white/60'
                  }`}>
                    {series.status === 'active' ? 'نشط' : 'مؤرشف'}
                  </span>
                )}
              </div>
              {series?.titleEn && (
                <p className="text-white/50 text-sm mb-2" dir="ltr">{series.titleEn}</p>
              )}
              {series?.description && (
                <p className="text-white/70 text-sm font-[family-name:var(--font-display)] leading-relaxed">
                  {series.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-white/40 font-[family-name:var(--font-display)]">
                <span className="flex items-center gap-1">
                  <BookOpen size={12} />
                  {items.length} مقالة
                </span>
                <span className="font-mono">/ملفات/{slug}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-gold/10 text-white/70 hover:text-white hover:border-gold/30 rounded-xl transition-colors text-sm font-[family-name:var(--font-display)]"
              >
                <Edit3 size={14} />
                تعديل
              </button>
              <Link
                href={`/reports/${slug}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold hover:bg-gold/20 rounded-xl transition-colors text-sm font-[family-name:var(--font-display)] font-semibold"
              >
                <ExternalLink size={14} />
                عرض الصفحة العامة
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Articles Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
            مقالات الملف
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold to-gold-muted text-obsidian font-[family-name:var(--font-display)] font-bold rounded-xl hover:shadow-gold transition-all text-sm"
          >
            <Plus size={16} />
            إضافة مقالة
          </button>
        </div>

        <SectionErrorBoundary section="series-articles">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-gold/50" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 bg-midnight/30 border border-gold/10 rounded-2xl">
              <FolderOpen size={40} className="mx-auto text-white/20 mb-3" />
              <p className="text-white/50 font-[family-name:var(--font-display)] text-sm mb-4">
                لا توجد مقالات في هذا الملف بعد
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-gold hover:bg-gold/20 rounded-xl transition-colors text-sm font-[family-name:var(--font-display)] font-semibold"
              >
                <Plus size={16} />
                إضافة أول مقالة
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-3">
                اسحب الصفوف لإعادة الترتيب — يُحفظ تلقائياً
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map(i => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item, index) => (
                    <SortableArticleRow
                      key={item.id}
                      item={item}
                      index={index}
                      onRemove={handleRemove}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </SectionErrorBoundary>
      </div>

      {/* Add Article Modal */}
      <AnimatePresence>
        {showAddModal && (
          <ArticleSearchModal
            seriesSlug={slug}
            existingArticleIds={existingIds}
            onClose={() => setShowAddModal(false)}
            onAdded={() => {
              mutateArticles();
              setLocalItems(null); // let SWR refetch
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit Series Modal */}
      <AnimatePresence>
        {showEditModal && series && (
          <EditSeriesModal
            series={series}
            onClose={() => setShowEditModal(false)}
            onSaved={() => {
              mutateSeries();
              mutateArticles();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
