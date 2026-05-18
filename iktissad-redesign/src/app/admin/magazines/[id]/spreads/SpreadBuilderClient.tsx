'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  Save,
  Plus,
  ArrowRight,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse, MagazineIssue, MagazineSpread, MediaItem } from '@/types';
import { SPREAD_TEMPLATE_MAP } from '@/lib/spread-templates';
import { useSpreadPresence } from '@/hooks/useSpreadPresence';
import SpreadCanvas from '@/components/admin/spread-editor/SpreadCanvas';
import SpreadThumbnail from '@/components/admin/spread-editor/SpreadThumbnail';
import ZoneInspector from '@/components/admin/spread-editor/ZoneInspector';
import TemplatePicker from '@/components/admin/spread-editor/TemplatePicker';
import MediaLibraryPanel from '@/components/admin/spread-editor/MediaLibraryPanel';

// ─── State ───────────────────────────────────────────────────────

interface ZoneContent {
  text?: string;
  imageUrl?: string;
  focalX?: number;
  focalY?: number;
  fit?: 'cover' | 'contain' | 'fill';
  caption?: string;
  credit?: string;
  fontSize?: 'small' | 'normal' | 'large' | 'xl';
  fontWeight?: 'normal' | 'medium' | 'bold';
  color?: string;
  adId?: string;
  adUrl?: string;
  chartType?: 'bar' | 'line' | 'pie';
  chartData?: string;
  bgColor?: string;
  padding?: string;
  sectionId?: string;
  [key: string]: unknown;
}

interface BuilderState {
  spreads: MagazineSpread[];
  selectedSpreadIndex: number;
  selectedZoneId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  showTemplatePicker: boolean;
  templatePickerMode: 'new' | 'change';
}

type BuilderAction =
  | { type: 'SET_SPREADS'; payload: MagazineSpread[] }
  | { type: 'SELECT_SPREAD'; index: number }
  | { type: 'SELECT_ZONE'; zoneId: string | null }
  | { type: 'REORDER_SPREADS'; from: number; to: number }
  | { type: 'UPDATE_ZONE'; spreadId: string; zoneId: string; content: ZoneContent }
  | { type: 'ADD_SPREAD'; spread: MagazineSpread }
  | { type: 'DELETE_SPREAD'; spreadId: string }
  | { type: 'CHANGE_TEMPLATE'; spreadId: string; templateId: string }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'MARK_SAVED' }
  | { type: 'OPEN_TEMPLATE_PICKER'; mode: 'new' | 'change' }
  | { type: 'CLOSE_TEMPLATE_PICKER' };

function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_SPREADS':
      return { ...state, spreads: action.payload, isDirty: false };

    case 'SELECT_SPREAD':
      return {
        ...state,
        selectedSpreadIndex: action.index,
        selectedZoneId: null,
      };

    case 'SELECT_ZONE':
      return { ...state, selectedZoneId: action.zoneId };

    case 'REORDER_SPREADS':
      return {
        ...state,
        spreads: arrayMove(state.spreads, action.from, action.to),
        isDirty: true,
      };

    case 'UPDATE_ZONE': {
      const spreads = state.spreads.map((s) => {
        if (s.id !== action.spreadId) return s;
        return {
          ...s,
          zones: {
            ...s.zones,
            [action.zoneId]: action.content,
          },
        };
      });
      return { ...state, spreads, isDirty: true };
    }

    case 'ADD_SPREAD':
      return {
        ...state,
        spreads: [...state.spreads, action.spread],
        selectedSpreadIndex: state.spreads.length,
        isDirty: true,
        showTemplatePicker: false,
      };

    case 'DELETE_SPREAD': {
      const spreads = state.spreads.filter((s) => s.id !== action.spreadId);
      const selectedSpreadIndex = Math.min(
        state.selectedSpreadIndex,
        Math.max(0, spreads.length - 1)
      );
      return { ...state, spreads, selectedSpreadIndex, isDirty: true };
    }

    case 'CHANGE_TEMPLATE': {
      const spreads = state.spreads.map((s) => {
        if (s.id !== action.spreadId) return s;
        return { ...s, templateId: action.templateId, zones: {} };
      });
      return { ...state, spreads, isDirty: true, showTemplatePicker: false };
    }

    case 'SET_SAVING':
      return { ...state, isSaving: action.value };

    case 'MARK_SAVED':
      return { ...state, isDirty: false, isSaving: false };

    case 'OPEN_TEMPLATE_PICKER':
      return { ...state, showTemplatePicker: true, templatePickerMode: action.mode };

    case 'CLOSE_TEMPLATE_PICKER':
      return { ...state, showTemplatePicker: false };

    default:
      return state;
  }
}

const initialState: BuilderState = {
  spreads: [],
  selectedSpreadIndex: 0,
  selectedZoneId: null,
  isDirty: false,
  isSaving: false,
  showTemplatePicker: false,
  templatePickerMode: 'new',
};

// ─── Component ───────────────────────────────────────────────────

interface Props {
  issueId: string;
}

export default function SpreadBuilderClient({ issueId }: Props) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ─── Data fetching ──────────────────────────────────────────────
  const { data: issueData } = useSWR<ApiResponse<MagazineIssue>>(
    `/api/magazines/${issueId}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const { isLoading } = useSWR<ApiResponse<MagazineSpread[]>>(
    `/api/magazines/${issueId}/spreads`,
    swrFetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (res) => {
        if (res?.data) {
          dispatch({ type: 'SET_SPREADS', payload: res.data });
        }
      },
    }
  );

  const magazine = issueData?.data;
  const selectedSpread = state.spreads[state.selectedSpreadIndex] ?? null;
  const selectedTemplate = selectedSpread
    ? SPREAD_TEMPLATE_MAP.get(selectedSpread.templateId) ?? null
    : null;
  const selectedZoneDef = selectedTemplate?.zones.find((z) => z.id === state.selectedZoneId) ?? null;

  // ─── Conflict detection ────────────────────────────────────────
  const presentUsers = useSpreadPresence(
    issueId,
    selectedSpread?.id ?? '',
    magazine?.title ?? 'editor'
  );

  // ─── Save spread ────────────────────────────────────────────────
  const saveSpread = useCallback(
    async (spread: MagazineSpread, showToast = false) => {
      try {
        dispatch({ type: 'SET_SAVING', value: true });
        const res = await fetch(`/api/magazines/${issueId}/spreads/${spread.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zones: spread.zones, metadata: spread.metadata }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Save failed');
        }
        dispatch({ type: 'MARK_SAVED' });
        if (showToast) toast.success(t('admin.spreads.saved'));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Save failed';
        toast.error(message);
        dispatch({ type: 'SET_SAVING', value: false });
      }
    },
    [issueId, t]
  );

  // ─── Auto-save (debounced 5s) ───────────────────────────────────
  useEffect(() => {
    if (!state.isDirty || !selectedSpread) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveSpread(selectedSpread, false);
    }, 5000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [state.isDirty, selectedSpread, saveSpread]);

  // ─── Manual save ────────────────────────────────────────────────
  const handleManualSave = () => {
    if (selectedSpread) saveSpread(selectedSpread, true);
  };

  // ─── Zone updates ───────────────────────────────────────────────
  const handleZoneUpdate = (zoneId: string, content: ZoneContent) => {
    if (!selectedSpread) return;
    dispatch({ type: 'UPDATE_ZONE', spreadId: selectedSpread.id, zoneId, content });
  };

  const handleZoneDrop = (zoneId: string, mediaItem: MediaItem | { url: string; [key: string]: unknown }) => {
    if (!selectedSpread) return;
    const currentContent = (selectedSpread.zones[zoneId] ?? {}) as ZoneContent;
    dispatch({
      type: 'UPDATE_ZONE',
      spreadId: selectedSpread.id,
      zoneId,
      content: { ...currentContent, imageUrl: mediaItem.url },
    });
  };

  // ─── Template picker ────────────────────────────────────────────
  const handleTemplateSelect = async (templateId: string) => {
    if (state.templatePickerMode === 'new') {
      // Create spread via API
      const nextPageNum = state.spreads.length > 0
        ? Math.max(...state.spreads.map((s) => s.pageNumber)) + 1
        : 1;

      try {
        const res = await fetch(`/api/magazines/${issueId}/spreads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageNumber: nextPageNum, templateId }),
        });
        if (!res.ok) throw new Error('Failed to create spread');
        const data = await res.json();
        dispatch({ type: 'ADD_SPREAD', spread: data.data });
        toast.success(t('admin.spreads.addPage'));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error';
        toast.error(message);
        dispatch({ type: 'CLOSE_TEMPLATE_PICKER' });
      }
    } else {
      // Change existing spread template
      if (selectedSpread) {
        dispatch({ type: 'CHANGE_TEMPLATE', spreadId: selectedSpread.id, templateId });
      }
    }
  };

  // ─── Delete spread ──────────────────────────────────────────────
  const handleDeleteSpread = async (spreadId: string) => {
    try {
      const res = await fetch(`/api/magazines/${issueId}/spreads/${spreadId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      dispatch({ type: 'DELETE_SPREAD', spreadId });
      toast.success('تم حذف الصفحة');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      toast.error(message);
    }
  };

  // ─── DnD for spread strip reorder ──────────────────────────────
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = state.spreads.findIndex((s) => s.id === active.id);
    const toIndex = state.spreads.findIndex((s) => s.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      dispatch({ type: 'REORDER_SPREADS', from: fromIndex, to: toIndex });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────
  if (isLoading && state.spreads.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden" dir="rtl">
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gold/10 bg-midnight/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/magazines/${issueId}`}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowRight size={18} />
          </Link>
          <div>
            <h1 className="text-white font-[family-name:var(--font-display)] font-bold text-base leading-tight">
              {t('admin.spreads.title')}
            </h1>
            {magazine && (
              <p className="text-white/50 text-xs">{magazine.title}</p>
            )}
          </div>

          {/* Conflict warning */}
          {presentUsers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs">
              <AlertTriangle size={14} />
              <span>{t('admin.spreads.conflict.warning').replace('{email}', presentUsers[0])}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {state.isDirty && (
            <span className="text-white/40 text-xs">{t('admin.spreads.unsavedChanges')}</span>
          )}
          <button
            onClick={handleManualSave}
            disabled={state.isSaving || !selectedSpread}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold to-gold/80 text-obsidian font-[family-name:var(--font-display)] font-bold text-sm rounded-xl hover:shadow-lg transition-all disabled:opacity-60"
          >
            {state.isSaving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {t('admin.spreads.save')}
          </button>

          <Link
            href={`/api/pdf/magazine/${issueId}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm rounded-xl hover:bg-white/15 transition-colors font-[family-name:var(--font-display)]"
          >
            <FileText size={15} />
            {t('admin.spreads.export')}
          </Link>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Spread Strip (150px) ── */}
        <div className="w-[150px] flex-shrink-0 border-l border-gold/10 bg-midnight/30 flex flex-col overflow-hidden">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={state.spreads.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {state.spreads.length === 0 && (
                  <p className="text-white/30 text-xs text-center py-8 leading-relaxed">
                    {t('admin.spreads.noSpreads')}
                  </p>
                )}
                {state.spreads.map((spread, index) => (
                  <SpreadThumbnail
                    key={spread.id}
                    spread={spread}
                    index={index}
                    isSelected={state.selectedSpreadIndex === index}
                    onClick={() => dispatch({ type: 'SELECT_SPREAD', index })}
                    onDelete={() => handleDeleteSpread(spread.id)}
                    onChangeTemplate={() => {
                      dispatch({ type: 'SELECT_SPREAD', index });
                      dispatch({ type: 'OPEN_TEMPLATE_PICKER', mode: 'change' });
                    }}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay />
          </DndContext>

          {/* Add spread button */}
          <div className="p-2 border-t border-gold/10 flex-shrink-0">
            <button
              onClick={() => dispatch({ type: 'OPEN_TEMPLATE_PICKER', mode: 'new' })}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-gold hover:bg-gold/10 rounded-xl transition-colors text-sm font-[family-name:var(--font-display)]"
            >
              <Plus size={16} />
              {t('admin.spreads.addPage')}
            </button>
          </div>
        </div>

        {/* ── Center: SpreadCanvas ── */}
        <div className="flex-1 flex items-center justify-center bg-obsidian/40 overflow-auto p-6">
          {selectedSpread && selectedTemplate ? (
            <SpreadCanvas
              template={selectedTemplate}
              zones={(selectedSpread.zones ?? {}) as Record<string, ZoneContent>}
              selectedZoneId={state.selectedZoneId}
              onZoneSelect={(zoneId) => dispatch({ type: 'SELECT_ZONE', zoneId })}
              onZoneDrop={handleZoneDrop}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <FileText size={48} className="text-white/20 mb-4" />
              <p className="text-white/40 font-[family-name:var(--font-display)]">
                {state.spreads.length === 0
                  ? t('admin.spreads.noSpreads')
                  : t('admin.spreads.selectSpread')}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Zone Inspector (300px) + Media Library ── */}
        <div className="w-[300px] flex-shrink-0 border-r border-gold/10 bg-midnight/30 flex flex-col overflow-hidden">
          {/* Zone Inspector */}
          <div className="flex-1 overflow-y-auto">
            <ZoneInspector
              selectedZone={selectedZoneDef ?? null}
              zoneContent={
                selectedSpread && state.selectedZoneId
                  ? ((selectedSpread.zones[state.selectedZoneId] ?? null) as ZoneContent | null)
                  : null
              }
              onUpdate={handleZoneUpdate}
              onStyleUpdate={(zoneId, style) => {
                if (!selectedSpread) return;
                const current = (selectedSpread.zones[zoneId] ?? {}) as ZoneContent;
                handleZoneUpdate(zoneId, { ...current, ...style });
              }}
            />
          </div>

          {/* Media Library Panel */}
          <div className="h-64 border-t border-gold/10 flex-shrink-0 overflow-hidden">
            <MediaLibraryPanel
              onSelect={(mediaItem: MediaItem) => {
                if (state.selectedZoneId && selectedSpread) {
                  handleZoneDrop(state.selectedZoneId, mediaItem);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Template Picker Modal */}
      {state.showTemplatePicker && (
        <TemplatePicker
          isOpen={state.showTemplatePicker}
          onSelect={handleTemplateSelect}
          onClose={() => dispatch({ type: 'CLOSE_TEMPLATE_PICKER' })}
          hasContent={
            state.templatePickerMode === 'change' &&
            selectedSpread != null &&
            Object.keys(selectedSpread.zones ?? {}).length > 0
          }
        />
      )}
    </div>
  );
}
