'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRight,
  User,
  Calendar,
  Loader2,
  FileText,
  KanbanSquare,
} from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import type { ApiResponse } from '@/types';
import type { BoardArticle } from '@/app/api/magazines/[id]/articles/route';

// ─── Status columns configuration (RTL: right → left reading order) ────────

interface Column {
  id: string;
  labelKey: string;
  color: string;
}

const COLUMNS: Column[] = [
  { id: 'idea',      labelKey: 'admin.board.columns.idea',      color: 'bg-white/20' },
  { id: 'assigned',  labelKey: 'admin.board.columns.assigned',  color: 'bg-blue/20' },
  { id: 'draft',     labelKey: 'admin.board.columns.draft',     color: 'bg-white/10' },
  { id: 'submitted', labelKey: 'admin.board.columns.submitted', color: 'bg-teal/20' },
  { id: 'review',    labelKey: 'admin.board.columns.review',    color: 'bg-gold/10' },
  { id: 'approved',  labelKey: 'admin.board.columns.approved',  color: 'bg-profit/10' },
  { id: 'layout',    labelKey: 'admin.board.columns.layout',    color: 'bg-gold/20' },
];

// ─── Article Card ────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  overlay = false,
}: {
  article: BoardArticle;
  overlay?: boolean;
}) {
  const isOverdue =
    article.dueDate != null && new Date(article.dueDate) < new Date();

  return (
    <div
      className={`bg-midnight border border-gold/10 rounded-xl p-3 space-y-2 select-none ${
        overlay ? 'shadow-elevated rotate-2 opacity-90' : 'hover:border-gold/30 transition-colors'
      }`}
    >
      {/* Section badge */}
      {article.sectionName && (
        <span
          className="inline-block px-2 py-0.5 rounded-md text-xs font-[family-name:var(--font-display)] text-obsidian font-semibold"
          style={{ backgroundColor: article.sectionColor ?? '#DDA853' }}
        >
          {article.sectionName}
        </span>
      )}

      {/* Headline */}
      <p className="text-white text-sm font-[family-name:var(--font-display)] leading-snug line-clamp-2">
        {article.title}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        {/* Author */}
        <div className="flex items-center gap-1.5 min-w-0">
          {article.author?.avatar ? (
            <img
              src={article.author.avatar}
              alt={article.author.name}
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
              <User size={10} className="text-gold" />
            </div>
          )}
          <span className="text-white/50 text-xs truncate font-[family-name:var(--font-display)]">
            {article.author?.name ?? article.assignee?.name ?? '—'}
          </span>
        </div>

        {/* Due date */}
        {article.dueDate && (
          <span
            className={`flex items-center gap-1 text-xs font-[family-name:var(--font-display)] flex-shrink-0 ${
              isOverdue ? 'text-loss' : 'text-white/40'
            }`}
          >
            <Calendar size={10} />
            {new Date(article.dueDate).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Sortable Article Card ────────────────────────────────────────────────────

function SortableArticleCard({ article }: { article: BoardArticle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: article.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <ArticleCard article={article} />
    </div>
  );
}

// ─── Column Component ─────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  articles,
  label,
}: {
  column: Column;
  articles: BoardArticle[];
  label: string;
}) {
  const ids = articles.map((a) => a.id);

  return (
    <div className="flex-shrink-0 w-64 flex flex-col gap-2">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${column.color} border border-gold/10`}>
        <span className="text-white font-[family-name:var(--font-display)] font-bold text-sm">
          {label}
        </span>
        <span className="text-xs px-1.5 py-0.5 bg-black/20 rounded-md text-white/70 font-[family-name:var(--font-display)]">
          {articles.length}
        </span>
      </div>

      {/* Card list */}
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-14rem)] pe-1">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {articles.map((article) => (
            <SortableArticleCard key={article.id} article={article} />
          ))}
        </SortableContext>
        {articles.length === 0 && (
          <div className="text-center py-6 text-white/20 text-xs font-[family-name:var(--font-display)] border border-dashed border-gold/10 rounded-xl">
            لا توجد مقالات
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Board Component ─────────────────────────────────────────────────────

export function BoardClient({ issueId }: { issueId: string }) {
  const { t } = useTranslation();

  const { data, isLoading, mutate } = useSWR<ApiResponse<BoardArticle[]>>(
    `/api/magazines/${issueId}/articles`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const [articles, setArticles] = useState<BoardArticle[] | null>(null);
  const [activeArticle, setActiveArticle] = useState<BoardArticle | null>(null);

  // Use local articles state when available (after optimistic update), else use SWR data
  const displayArticles = useMemo(() => articles ?? data?.data ?? [], [articles, data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Group articles by status
  const grouped = COLUMNS.reduce<Record<string, BoardArticle[]>>((acc, col) => {
    acc[col.id] = displayArticles.filter(
      (a) => (a.status || 'draft') === col.id
    );
    return acc;
  }, {});

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const found = displayArticles.find((a) => a.id === event.active.id);
      setActiveArticle(found ?? null);
    },
    [displayArticles]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveArticle(null);
      const { active, over } = event;
      if (!over) return;

      // Determine target column from the over id (column id or article id)
      let targetStatus = COLUMNS.find((c) => c.id === over.id)?.id;
      if (!targetStatus) {
        // Over an article — find which column that article is in
        const overArticle = displayArticles.find((a) => a.id === over.id);
        targetStatus = overArticle?.status;
      }

      if (!targetStatus) return;

      const draggedArticle = displayArticles.find((a) => a.id === active.id);
      if (!draggedArticle || draggedArticle.status === targetStatus) return;

      // Optimistic update
      const optimistic = displayArticles.map((a) =>
        a.id === draggedArticle.id ? { ...a, status: targetStatus! } : a
      );
      setArticles(optimistic);

      try {
        const res = await fetch(`/api/articles/${draggedArticle.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus }),
        });
        if (!res.ok) {
          throw new Error('فشل تحديث الحالة');
        }
        mutate();
      } catch (err: unknown) {
        // Revert optimistic update
        setArticles(null);
        toast.error((err as Error).message || 'حدث خطأ أثناء تحديث الحالة');
      }
    },
    [displayArticles, mutate]
  );

  const TAB_LINKS = [
    { href: `/admin/magazines/${issueId}`, label: t('admin.board.tabs.overview') },
    { href: `/admin/magazines/${issueId}/board`, label: t('admin.board.tabs.board') },
    { href: `/admin/magazines/${issueId}/sections`, label: t('admin.board.tabs.sections') },
    { href: `/admin/magazines/${issueId}/spreads`, label: t('admin.board.tabs.spreads') },
    { href: `/admin/magazines/${issueId}/analytics`, label: t('admin.board.tabs.analytics') },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/magazines"
          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowRight size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <KanbanSquare size={20} className="text-gold" />
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
            {t('admin.board.title')}
          </h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gold/10 overflow-x-auto">
        {TAB_LINKS.map((tab) => {
          const isActive = typeof window !== 'undefined'
            ? window.location.pathname === tab.href
            : tab.href.endsWith('/board');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-[family-name:var(--font-display)] whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-gold text-gold'
                  : 'border-transparent text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Board */}
      {isLoading && !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold/50" />
        </div>
      ) : displayArticles.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={48} className="text-white/20 mb-4" />
          <p className="text-white/40 font-[family-name:var(--font-display)]">
            {t('admin.board.empty')}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* RTL: flex-row-reverse so columns read right-to-left */}
          <div className="flex flex-row-reverse gap-3 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                articles={grouped[col.id] ?? []}
                label={t(col.labelKey)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeArticle && (
              <ArticleCard article={activeArticle} overlay />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
