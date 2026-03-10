'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRight,
  GripVertical,
  Plus,
  Trash2,
  Loader2,
  Layers,
  Check,
  X,
} from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import type { ApiResponse } from '@/types';
import type { MagazineSection } from '@/app/api/magazines/[id]/sections/route';

// ─── Single Section Row ───────────────────────────────────────────────────────

interface SectionRowProps {
  section: MagazineSection;
  onUpdate: (id: string, data: Partial<MagazineSection>) => Promise<void>;
  onDelete: (id: string) => void;
  isNew?: boolean;
}

function SectionRow({ section, onUpdate, onDelete, isNew = false }: SectionRowProps) {
  const { t } = useTranslation();
  const [editingName, setEditingName] = useState(isNew);
  const [editingNameEn, setEditingNameEn] = useState(false);
  const [nameVal, setNameVal] = useState(section.name);
  const [nameEnVal, setNameEnVal] = useState(section.nameEn);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameEnInputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  useEffect(() => {
    if (editingNameEn && nameEnInputRef.current) {
      nameEnInputRef.current.focus();
      nameEnInputRef.current.select();
    }
  }, [editingNameEn]);

  const saveName = useCallback(async () => {
    if (!nameVal.trim() || nameVal === section.name) {
      setEditingName(false);
      setNameVal(section.name);
      return;
    }
    setIsSaving(true);
    try {
      await onUpdate(section.id, { name: nameVal.trim() });
      setEditingName(false);
    } catch {
      setNameVal(section.name);
    } finally {
      setIsSaving(false);
    }
  }, [nameVal, section.name, section.id, onUpdate]);

  const saveNameEn = useCallback(async () => {
    if (nameEnVal === section.nameEn) {
      setEditingNameEn(false);
      return;
    }
    setIsSaving(true);
    try {
      await onUpdate(section.id, { nameEn: nameEnVal });
      setEditingNameEn(false);
    } catch {
      setNameEnVal(section.nameEn);
    } finally {
      setIsSaving(false);
    }
  }, [nameEnVal, section.nameEn, section.id, onUpdate]);

  const handleColorChange = useCallback(
    async (color: string) => {
      try {
        await onUpdate(section.id, { themeColor: color });
      } catch {
        toast.error('فشل تحديث اللون');
      }
    },
    [section.id, onUpdate]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-midnight/50 border border-gold/10 rounded-xl hover:border-gold/20 transition-colors group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-white/20 hover:text-white/60 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
        aria-label="إعادة ترتيب"
      >
        <GripVertical size={18} />
      </button>

      {/* Color swatch / picker */}
      <div className="relative flex-shrink-0">
        <label className="block w-7 h-7 rounded-lg cursor-pointer border-2 border-white/10 hover:border-white/30 transition-colors overflow-hidden">
          <div
            className="w-full h-full"
            style={{ backgroundColor: section.themeColor }}
          />
          <input
            type="color"
            value={section.themeColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            aria-label={t('admin.sections.colorPicker')}
          />
        </label>
      </div>

      {/* Name AR (editable inline) */}
      <div className="flex-1 min-w-0">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              ref={nameInputRef}
              type="text"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') { setEditingName(false); setNameVal(section.name); }
              }}
              className="flex-1 bg-white/10 border border-gold/30 rounded-lg py-1.5 px-3 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/60"
            />
            {isSaving && <Loader2 size={14} className="animate-spin text-gold flex-shrink-0" />}
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-white font-[family-name:var(--font-display)] text-sm text-start hover:text-gold transition-colors truncate max-w-full block"
          >
            {section.name || <span className="text-white/30">اسم القسم...</span>}
          </button>
        )}
      </div>

      {/* Name EN (editable inline) */}
      <div className="flex-1 min-w-0 hidden md:block">
        {editingNameEn ? (
          <div className="flex items-center gap-2">
            <input
              ref={nameEnInputRef}
              type="text"
              value={nameEnVal}
              onChange={(e) => setNameEnVal(e.target.value)}
              onBlur={saveNameEn}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveNameEn();
                if (e.key === 'Escape') { setEditingNameEn(false); setNameEnVal(section.nameEn); }
              }}
              className="flex-1 bg-white/10 border border-gold/30 rounded-lg py-1.5 px-3 text-white text-sm focus:outline-none focus:border-gold/60"
              dir="ltr"
            />
            {isSaving && <Loader2 size={14} className="animate-spin text-gold flex-shrink-0" />}
          </div>
        ) : (
          <button
            onClick={() => setEditingNameEn(true)}
            className="text-white/50 text-sm text-start hover:text-white transition-colors truncate max-w-full block"
            dir="ltr"
          >
            {section.nameEn || <span className="text-white/20">Section name...</span>}
          </button>
        )}
      </div>

      {/* Article count badge */}
      <span className="flex-shrink-0 px-2.5 py-1 bg-gold/10 text-gold text-xs rounded-lg font-[family-name:var(--font-display)]">
        {section.articleCount ?? 0} {t('admin.sections.articleCount')}
      </span>

      {/* Delete button */}
      {showDeleteConfirm ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onDelete(section.id)}
            className="p-1.5 bg-loss/20 text-loss hover:bg-loss/30 rounded-lg transition-colors"
            aria-label="تأكيد الحذف"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="إلغاء"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 text-white/20 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
          aria-label={t('admin.sections.deleteConfirm')}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

// ─── Main Sections Client ─────────────────────────────────────────────────────

export function SectionsClient({ issueId }: { issueId: string }) {
  const { t } = useTranslation();

  const { data, isLoading, mutate } = useSWR<ApiResponse<MagazineSection[]>>(
    `/api/magazines/${issueId}/sections`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const [sections, setSections] = useState<MagazineSection[] | null>(null);
  const displaySections = sections ?? data?.data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Update section via API
  const handleUpdate = useCallback(
    async (id: string, updates: Partial<MagazineSection>) => {
      const body: Record<string, unknown> = {};
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.nameEn !== undefined) body.nameEn = updates.nameEn;
      if (updates.themeColor !== undefined) body.themeColor = updates.themeColor;
      if (updates.sortOrder !== undefined) body.sortOrder = updates.sortOrder;

      const res = await fetch(`/api/magazines/${issueId}/sections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'فشل حفظ التغييرات');
      }

      // Optimistically update local state
      setSections((prev) =>
        (prev ?? data?.data ?? []).map((s) =>
          s.id === id ? { ...s, ...updates } : s
        )
      );

      toast.success('تم حفظ التغييرات');
      mutate();
    },
    [issueId, data?.data, mutate]
  );

  // Delete section
  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/magazines/${issueId}/sections/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || 'فشل حذف القسم');
        return;
      }

      setSections((prev) =>
        (prev ?? data?.data ?? []).filter((s) => s.id !== id)
      );
      toast.success('تم حذف القسم');
      mutate();
    },
    [issueId, data?.data, mutate]
  );

  // Add new section
  const handleAddSection = useCallback(async () => {
    const res = await fetch(`/api/magazines/${issueId}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'قسم جديد',
        nameEn: 'New Section',
        themeColor: '#DDA853',
        sortOrder: displaySections.length,
      }),
    });

    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error || 'فشل إنشاء القسم');
      return;
    }

    await mutate();
    setSections(null); // Reset local state so SWR data takes over with new section
  }, [issueId, displaySections.length, mutate]);

  // Drag reorder
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = displaySections.findIndex((s) => s.id === active.id);
      const newIndex = displaySections.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(displaySections, oldIndex, newIndex);
      setSections(reordered);

      // Update sort_order for all affected sections
      try {
        await Promise.all(
          reordered.map((section, index) =>
            fetch(`/api/magazines/${issueId}/sections/${section.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sortOrder: index }),
            })
          )
        );
        mutate();
      } catch {
        toast.error('فشل حفظ الترتيب');
        setSections(null);
      }
    },
    [displaySections, issueId, mutate]
  );

  const TAB_LINKS = [
    { href: `/admin/magazines/${issueId}`, label: t('admin.board.tabs.overview') },
    { href: `/admin/magazines/${issueId}/board`, label: t('admin.board.tabs.board') },
    { href: `/admin/magazines/${issueId}/sections`, label: t('admin.board.tabs.sections') },
    { href: `/admin/magazines/${issueId}/spreads`, label: t('admin.board.tabs.spreads') },
    { href: `/admin/magazines/${issueId}/analytics`, label: t('admin.board.tabs.analytics') },
  ];

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/magazines"
          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowRight size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-gold" />
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
            {t('admin.sections.title')}
          </h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gold/10 overflow-x-auto">
        {TAB_LINKS.map((tab) => {
          const isActive = typeof window !== 'undefined'
            ? window.location.pathname === tab.href
            : tab.href.endsWith('/sections');
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

      {/* Column headers */}
      {!isLoading && (
        <div className="flex items-center gap-3 px-3 text-white/30 text-xs font-[family-name:var(--font-display)]">
          <div className="w-5" /> {/* drag handle */}
          <div className="w-7" /> {/* color */}
          <div className="flex-1">اسم القسم (عربي)</div>
          <div className="flex-1 hidden md:block">Section Name (EN)</div>
          <div className="w-20 text-center">المقالات</div>
          <div className="w-8" /> {/* delete */}
        </div>
      )}

      {/* Sections list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-gold/50" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displaySections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {displaySections.map((section) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add section button */}
      <button
        onClick={handleAddSection}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gold/20 rounded-xl text-gold/60 hover:text-gold hover:border-gold/40 transition-colors font-[family-name:var(--font-display)]"
      >
        <Plus size={18} />
        {t('admin.sections.addSection')}
      </button>
    </div>
  );
}
