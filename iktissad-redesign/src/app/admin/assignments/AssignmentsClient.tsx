'use client';

/**
 * Assignment Board — Kanban view for editorial article workflow.
 *
 * Columns: مسودة | مراجعة | انتظار الموافقة | مجدول | منشور
 * Drag-and-drop via native HTML5 drag API (no external DnD library).
 * Status updates via PATCH /api/articles/{id}.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  AlertCircle,
  Calendar,
  Loader2,
  LayoutGrid,
  User,
  ChevronDown,
  X,
} from 'lucide-react';
import { swrFetcher, updateArticle } from '@/lib/api-client';
import { iconSizes } from '@/lib/design-tokens';
import type { ApiResponse } from '@/types';
import type { ArticleAssignment } from '@/app/api/admin/assignments/route';
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary';

// ─── Column definitions ───────────────────────────────────────────────────────

type BoardStatus = 'draft' | 'review' | 'pending_approval' | 'scheduled' | 'published';

interface KanbanColumn {
  id: BoardStatus;
  label: string;
  headerClass: string;
  countClass: string;
  dotClass: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'draft',
    label: 'مسودة',
    headerClass: 'border-white/10 bg-white/5',
    countClass: 'bg-white/10 text-white/60',
    dotClass: 'bg-white/40',
  },
  {
    id: 'review',
    label: 'مراجعة',
    headerClass: 'border-gold/20 bg-gold/5',
    countClass: 'bg-gold/15 text-gold',
    dotClass: 'bg-gold',
  },
  {
    id: 'pending_approval',
    label: 'انتظار الموافقة',
    headerClass: 'border-amber-500/20 bg-amber-500/5',
    countClass: 'bg-amber-500/15 text-amber-400',
    dotClass: 'bg-amber-400',
  },
  {
    id: 'scheduled',
    label: 'مجدول',
    headerClass: 'border-blue-400/20 bg-blue-400/5',
    countClass: 'bg-blue-400/15 text-blue-400',
    dotClass: 'bg-blue-400',
  },
  {
    id: 'published',
    label: 'منشور',
    headerClass: 'border-emerald-400/20 bg-emerald-400/5',
    countClass: 'bg-emerald-400/15 text-emerald-400',
    dotClass: 'bg-emerald-400',
  },
];

// ─── Status badge styles for article cards ────────────────────────────────────

const CARD_STATUS_STYLE: Record<BoardStatus, string> = {
  draft: 'text-white/50 bg-white/5',
  review: 'text-gold bg-gold/10',
  pending_approval: 'text-amber-400 bg-amber-400/10',
  scheduled: 'text-blue-400 bg-blue-400/10',
  published: 'text-emerald-400 bg-emerald-400/10',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
    day: 'numeric',
    month: 'short',
  });
}

function getInitials(name: string | null): string {
  if (!name) return '؟';
  return name.trim().charAt(0);
}

// Normalise status: treat "pending_approval" as a valid column but
// if the DB doesn't have that enum value it may come in as "review".
// We keep a pass-through — whatever the API returns is the card status.
function canonicalStatus(raw: string): BoardStatus {
  const valid: BoardStatus[] = ['draft', 'review', 'pending_approval', 'scheduled', 'published'];
  return valid.includes(raw as BoardStatus) ? (raw as BoardStatus) : 'draft';
}

// ─── Article Card ─────────────────────────────────────────────────────────────

interface ArticleCardProps {
  card: ArticleAssignment;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

function ArticleCard({ card, onDragStart }: ArticleCardProps) {
  const overdue = isOverdue(card.dueDate);
  const status = canonicalStatus(card.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, card.id)}
      className="bg-midnight/70 backdrop-blur-sm border border-gold/10 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-gold/25 transition-all select-none group"
    >
      {/* Title */}
      <p className="text-white text-sm font-[family-name:var(--font-display)] font-semibold leading-snug line-clamp-2 mb-3 group-hover:text-gold/90 transition-colors">
        {card.title}
      </p>

      {/* Section badge + overdue */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {card.section && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-white/50 font-[family-name:var(--font-display)]">
            {card.section}
          </span>
        )}
        <span className={`text-[11px] px-2 py-0.5 rounded-md font-[family-name:var(--font-display)] ${CARD_STATUS_STYLE[status]}`}>
          {COLUMNS.find(c => c.id === status)?.label ?? status}
        </span>
        {overdue && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 font-[family-name:var(--font-display)] flex items-center gap-1">
            <AlertCircle size={10} />
            متأخر
          </span>
        )}
      </div>

      {/* Footer: assignee + due date */}
      <div className="flex items-center justify-between gap-2">
        {/* Assignee */}
        <div className="flex items-center gap-1.5 min-w-0">
          {card.assigneeAvatar ? (
            <img
              src={card.assigneeAvatar}
              alt={card.assigneeName ?? ''}
              className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-white/10"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold/40 to-bronze/40 flex items-center justify-center flex-shrink-0 border border-gold/20">
              <span className="text-[10px] text-white font-bold">
                {getInitials(card.assigneeName)}
              </span>
            </div>
          )}
          <span className="text-white/50 text-[11px] font-[family-name:var(--font-display)] truncate">
            {card.assigneeName ?? card.authorName ?? 'غير معين'}
          </span>
        </div>

        {/* Due date */}
        {card.dueDate && (
          <span className={`flex items-center gap-1 text-[11px] font-[family-name:var(--font-display)] flex-shrink-0 ${overdue ? 'text-red-400' : 'text-white/40'}`}>
            <Calendar size={10} />
            {formatDate(card.dueDate)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: KanbanColumn;
  cards: ArticleAssignment[];
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, colId: BoardStatus) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, colId: BoardStatus) => void;
}

function KanbanColumnView({
  column,
  cards,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: KanbanColumnProps) {
  return (
    <div
      className={`flex flex-col min-w-[280px] max-w-[280px] h-full rounded-xl border transition-all duration-200 ${
        isDragOver
          ? 'border-gold/40 bg-gold/5 shadow-[0_0_0_2px_rgba(221,168,83,0.15)]'
          : 'border-gold/8 bg-midnight/30'
      }`}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column Header */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-t-xl border-b ${column.headerClass}`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${column.dotClass}`} />
        <span className="text-white font-[family-name:var(--font-display)] font-semibold text-sm flex-1">
          {column.label}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${column.countClass}`}>
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
        <AnimatePresence>
          {cards.map(card => (
            <ArticleCard
              key={card.id}
              card={card}
              onDragStart={onDragStart}
            />
          ))}
        </AnimatePresence>

        {/* Drop zone hint when dragging over empty column */}
        {isDragOver && cards.length === 0 && (
          <div className="h-20 border-2 border-dashed border-gold/30 rounded-xl flex items-center justify-center">
            <span className="text-gold/50 text-xs font-[family-name:var(--font-display)]">
              أفلت هنا
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssignmentsClient() {
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Local board state for optimistic updates
  const [localStatuses, setLocalStatuses] = useState<Record<string, BoardStatus>>({});

  // Drag state
  const dragCardId = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<BoardStatus | null>(null);

  const { data, isLoading, mutate } = useSWR<ApiResponse<ArticleAssignment[]>>(
    '/api/admin/assignments',
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const rawCards = data?.data ?? [];

  // Merge server state with optimistic local overrides
  const cards: ArticleAssignment[] = rawCards.map(c => ({
    ...c,
    status: localStatuses[c.id] ?? canonicalStatus(c.status),
  }));

  // Derive unique sections for filter dropdown
  const sections = Array.from(
    new Set(cards.map(c => c.section).filter(Boolean) as string[])
  ).sort();

  // Apply client-side filters
  const filteredCards = cards.filter(card => {
    if (search && !card.title.includes(search)) return false;
    if (sectionFilter && card.section !== sectionFilter) return false;
    if (overdueOnly && !isOverdue(card.dueDate)) return false;
    return true;
  });

  // Group into columns
  const columnCards = (colId: BoardStatus) =>
    filteredCards.filter(c => (localStatuses[c.id] ?? canonicalStatus(c.status)) === colId);

  // ─── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    dragCardId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colId: BoardStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStatus: BoardStatus) => {
      e.preventDefault();
      setDragOverCol(null);

      const id = dragCardId.current ?? e.dataTransfer.getData('text/plain');
      dragCardId.current = null;
      if (!id) return;

      const card = cards.find(c => c.id === id);
      if (!card) return;

      const currentStatus = localStatuses[id] ?? canonicalStatus(card.status);
      if (currentStatus === targetStatus) return;

      // Optimistic update
      setLocalStatuses(prev => ({ ...prev, [id]: targetStatus }));

      // Persist — the articles [id] PUT endpoint accepts status
      // Map pending_approval → review since the DB enum may not have pending_approval
      const dbStatus = targetStatus === 'pending_approval' ? 'review' : targetStatus;

      try {
        await updateArticle(id, { status: dbStatus });
        toast.success(`تم نقل المقال إلى "${COLUMNS.find(c => c.id === targetStatus)?.label}"`);
        mutate();
      } catch (err: unknown) {
        // Rollback optimistic update on failure
        setLocalStatuses(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        const message = err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث الحالة';
        toast.error(message);
      }
    },
    [cards, localStatuses, mutate]
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1 flex items-center gap-2">
            <LayoutGrid size={22} className="text-gold" />
            لوحة المهام التحريرية
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {filteredCards.length} مقال — اسحب البطاقات لتغيير الحالة
          </p>
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all font-[family-name:var(--font-display)] text-sm ${
            showFilters || sectionFilter || overdueOnly
              ? 'bg-gold/10 border-gold/30 text-gold'
              : 'bg-white/5 border-gold/10 text-white/70 hover:text-white'
          }`}
        >
          <Filter size={iconSizes.md} />
          تصفية
          {(sectionFilter || overdueOnly) && (
            <span className="w-2 h-2 rounded-full bg-gold" />
          )}
          <ChevronDown
            size={iconSizes.sm}
            className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Filter Bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
                    size={iconSizes.md}
                  />
                  <input
                    type="text"
                    placeholder="بحث في عناوين المقالات..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors text-sm"
                  />
                </div>

                {/* Section dropdown */}
                <select
                  value={sectionFilter}
                  onChange={e => setSectionFilter(e.target.value)}
                  className="bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 transition-colors min-w-[160px]"
                >
                  <option value="" className="bg-midnight">كل الأقسام</option>
                  {sections.map(s => (
                    <option key={s} value={s} className="bg-midnight">{s}</option>
                  ))}
                </select>

                {/* Overdue toggle */}
                <button
                  onClick={() => setOverdueOnly(v => !v)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all font-[family-name:var(--font-display)] text-sm flex-shrink-0 ${
                    overdueOnly
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : 'bg-white/5 border-gold/10 text-white/60 hover:text-white'
                  }`}
                >
                  <AlertCircle size={iconSizes.md} />
                  المتأخرة فقط
                </button>

                {/* Clear filters */}
                {(search || sectionFilter || overdueOnly) && (
                  <button
                    onClick={() => { setSearch(''); setSectionFilter(''); setOverdueOnly(false); }}
                    className="flex items-center gap-2 px-4 py-2.5 border border-white/10 rounded-xl text-white/50 hover:text-white text-sm font-[family-name:var(--font-display)] transition-colors flex-shrink-0"
                  >
                    <X size={iconSizes.sm} />
                    مسح
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      <SectionErrorBoundary section="assignments-board">
        {isLoading && rawCards.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-gold/50" />
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max" style={{ minHeight: '60vh' }}>
              {COLUMNS.map(col => (
                <KanbanColumnView
                  key={col.id}
                  column={col}
                  cards={columnCards(col.id)}
                  isDragOver={dragOverCol === col.id}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state — only shown when filters are active and nothing matches */}
        {!isLoading && rawCards.length > 0 && filteredCards.length === 0 && (
          <div className="text-center py-16">
            <User size={40} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/40 font-[family-name:var(--font-display)] text-sm">
              لا توجد مقالات تطابق معايير التصفية
            </p>
          </div>
        )}
      </SectionErrorBoundary>
    </div>
  );
}
