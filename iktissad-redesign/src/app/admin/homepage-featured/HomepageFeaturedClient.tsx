'use client';

/**
 * Homepage Featured lineup
 *
 * Editors pin up to HOMEPAGE_FEATURED_SLOTS featured articles into the homepage Hero and drag
 * them into order (slot 1 = lead story). Unpinned slots preview the newest
 * featured articles that will fill them automatically.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Pin,
  PinOff,
  Search,
  Save,
  Loader2,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  swrFetcher,
  HOMEPAGE_FEATURED_ADMIN_KEY,
  saveHomepageFeaturedOrder,
  type HomepageFeaturedLineup,
} from '@/lib/api-client';
import { useTranslation, useFormatters } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { HOMEPAGE_FEATURED_SLOTS as SLOTS } from '@/lib/homepage-featured-slots';
import type { ApiResponse, Article } from '@/types';

function isEligible(a: Article): boolean {
  return a.status === 'published' && a.featured;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  article: Article;
  /** Homepage slot index, or -1 when the pin is not currently shown. */
  slot: number;
  onUnpin: () => void;
}

function ArticleThumb({ src }: { src?: string }) {
  return (
    <div className="relative w-16 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-ink/40">
      {src && <NextImage src={src} alt="" fill sizes="64px" className="object-cover" />}
    </div>
  );
}

function SlotLabel({ slot }: { slot: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex-shrink-0 w-24 text-center">
      <span className="block w-8 h-8 mx-auto rounded-full bg-gold/15 text-gold text-sm font-bold leading-8 font-[family-name:var(--font-display)]">
        {slot < 0 ? '—' : slot + 1}
      </span>
      {slot >= 0 && (
        <span className="block mt-1 text-[11px] text-white/40 font-[family-name:var(--font-display)]">
          {slot === 0 ? t('admin.homepageFeatured.slotLead') : t('admin.homepageFeatured.slotSide')}
        </span>
      )}
    </div>
  );
}

function SortablePinnedRow({ article, slot, onUnpin }: RowProps) {
  const { t } = useTranslation();
  const { fmtDate: formatDate } = useFormatters();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: article.id });
  const eligible = isEligible(article);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={`flex items-center gap-3 p-3 bg-midnight/60 border rounded-xl ${
        isDragging ? 'border-gold/50 shadow-lg opacity-80' : 'border-gold/20'
      } ${slot === 0 ? 'ring-1 ring-gold/30' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={t('admin.homepageFeatured.dragHint')}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-white/30 hover:text-white/70 transition-colors touch-none"
      >
        <GripVertical size={iconSizes.md} />
      </button>
      <SlotLabel slot={slot} />
      <ArticleThumb src={article.featuredImage} />
      <div className="flex-1 min-w-0">
        <p className="text-white font-[family-name:var(--font-display)] font-semibold text-sm line-clamp-2">
          {article.title}
        </p>
        <p className="text-white/40 text-xs mt-1 font-[family-name:var(--font-display)] flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-gold">
            <Pin size={12} /> {t('admin.homepageFeatured.pinned')}
          </span>
          {article.publishedAt && <span>{formatDate(article.publishedAt)}</span>}
        </p>
        {!eligible && (
          <p className="text-loss text-xs mt-1 flex items-center gap-1 font-[family-name:var(--font-display)]">
            <AlertTriangle size={12} /> {t('admin.homepageFeatured.notEligible')}
          </p>
        )}
      </div>
      <button
        onClick={onUnpin}
        title={t('admin.homepageFeatured.unpin')}
        aria-label={t('admin.homepageFeatured.unpin')}
        className="flex-shrink-0 p-2 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
      >
        <PinOff size={iconSizes.sm} />
      </button>
    </div>
  );
}

function AutomaticRow({ article, slot }: { article?: Article; slot: number }) {
  const { t } = useTranslation();
  const { fmtDate: formatDate } = useFormatters();
  return (
    <div className="flex items-center gap-3 p-3 border border-dashed border-white/10 rounded-xl">
      <span className="w-5 flex-shrink-0" />
      <SlotLabel slot={slot} />
      {article ? (
        <>
          <ArticleThumb src={article.featuredImage} />
          <div className="flex-1 min-w-0 opacity-70">
            <p className="text-white font-[family-name:var(--font-display)] text-sm line-clamp-2">
              {article.title}
            </p>
            <p className="text-white/40 text-xs mt-1 font-[family-name:var(--font-display)] flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <Sparkles size={12} /> {t('admin.homepageFeatured.automatic')} · {t('admin.homepageFeatured.automaticHint')}
              </span>
              {article.publishedAt && <span>{formatDate(article.publishedAt)}</span>}
            </p>
          </div>
        </>
      ) : (
        <p className="flex-1 text-white/30 text-sm font-[family-name:var(--font-display)]">
          {t('admin.homepageFeatured.emptySlot')}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomepageFeaturedClient() {
  const { t } = useTranslation();
  const { fmtDate: formatDate } = useFormatters();

  const { data: lineupData, isLoading, mutate } = useSWR<ApiResponse<HomepageFeaturedLineup>>(
    HOMEPAGE_FEATURED_ADMIN_KEY,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // Newest featured articles — fills unpinned slots in the preview.
  const { data: latestData } = useSWR<ApiResponse<Article[]>>(
    `/api/articles?status=published&featured=true&pageSize=${SLOTS * 2}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(handle);
  }, [search]);

  const { data: pickData, isLoading: pickLoading } = useSWR<ApiResponse<Article[]>>(
    `/api/articles?status=published&featured=true&pageSize=20${
      debounced ? `&search=${encodeURIComponent(debounced)}` : ''
    }`,
    swrFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  // Local, editable copy of the pinned list. null = untouched since last load.
  const [draft, setDraft] = useState<Article[] | null>(null);
  const [saving, setSaving] = useState(false);

  const saved = useMemo(() => lineupData?.data?.articles ?? [], [lineupData]);
  const pinned = draft ?? saved;
  const dirty =
    draft !== null && draft.map((a) => a.id).join() !== saved.map((a) => a.id).join();

  const pinnedIds = useMemo(() => new Set(pinned.map((a) => a.id)), [pinned]);
  const visiblePinned = pinned.filter(isEligible);

  const autoFill = useMemo(
    () => (latestData?.data ?? []).filter((a) => !pinnedIds.has(a.id)),
    [latestData, pinnedIds]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = pinned.findIndex((a) => a.id === active.id);
      const to = pinned.findIndex((a) => a.id === over.id);
      if (from === -1 || to === -1) return;
      setDraft(arrayMove(pinned, from, to));
    },
    [pinned]
  );

  const pin = (article: Article) => {
    if (pinned.length >= SLOTS || pinnedIds.has(article.id)) return;
    setDraft([...pinned, article]);
  };

  const unpin = (id: string) => setDraft(pinned.filter((a) => a.id !== id));

  const save = async (order: string[]) => {
    setSaving(true);
    try {
      const res = await saveHomepageFeaturedOrder(order);
      await mutate(res, { revalidate: false });
      setDraft(null);
      toast.success(t('admin.homepageFeatured.saveSuccess'));
    } catch (err) {
      toast.error((err as Error)?.message || t('admin.homepageFeatured.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Build the four-slot preview: eligible pins first, then automatic fill.
  // Ineligible pins are still listed (so they can be unpinned) but don't take a slot.
  const autoSlots = Math.max(0, SLOTS - visiblePinned.length);
  const pickList = pickData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.homepageFeatured.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.homepageFeatured.description')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2.5 text-white/60 hover:text-white text-sm rounded-xl border border-white/10 hover:border-white/20 transition-colors font-[family-name:var(--font-display)]"
          >
            <ExternalLink size={iconSizes.sm} />
            {t('admin.homepageFeatured.viewHomepage')}
          </Link>
          {pinned.length > 0 && (
            <button
              onClick={() => setDraft([])}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2.5 text-white/60 hover:text-white text-sm rounded-xl border border-white/10 hover:border-white/20 transition-colors disabled:opacity-50 font-[family-name:var(--font-display)]"
            >
              <RotateCcw size={iconSizes.sm} />
              {t('admin.homepageFeatured.reset')}
            </button>
          )}
          <button
            onClick={() => save(pinned.map((a) => a.id))}
            disabled={!dirty || saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-gold text-ink rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={iconSizes.md} className="animate-spin" /> : <Save size={iconSizes.md} />}
            {saving ? t('admin.homepageFeatured.saving') : t('admin.homepageFeatured.save')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Lineup */}
        <section className="xl:col-span-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
              {t('admin.homepageFeatured.dragHint')}
            </p>
            {dirty && (
              <span className="text-gold text-xs font-[family-name:var(--font-display)]">
                {t('admin.homepageFeatured.unsaved')}
              </span>
            )}
          </div>

          {isLoading ? (
            Array.from({ length: SLOTS }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-midnight/50 border border-gold/10 animate-pulse" />
            ))
          ) : (
            <>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={pinned.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                  {(() => {
                    let slot = 0;
                    return pinned.map((article) => (
                      <SortablePinnedRow
                        key={article.id}
                        article={article}
                        slot={isEligible(article) ? slot++ : -1}
                        onUnpin={() => unpin(article.id)}
                      />
                    ));
                  })()}
                </SortableContext>
              </DndContext>
              {Array.from({ length: autoSlots }).map((_, i) => (
                <AutomaticRow
                  key={`auto-${i}`}
                  slot={visiblePinned.length + i}
                  article={autoFill[i]}
                />
              ))}
            </>
          )}
        </section>

        {/* Picker */}
        <section className="xl:col-span-2 bg-midnight/40 border border-gold/10 rounded-2xl p-4 space-y-3 h-fit">
          <div>
            <h2 className="text-white font-[family-name:var(--font-display)] font-semibold">
              {t('admin.homepageFeatured.pickTitle')}
            </h2>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
              {pinned.length >= SLOTS
                ? t('admin.homepageFeatured.slotsFull')
                : t('admin.homepageFeatured.pickDescription')}
            </p>
          </div>
          <div className="relative">
            <Search
              size={16}
              className="absolute top-1/2 -translate-y-1/2 start-3 text-white/30 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.homepageFeatured.searchPlaceholder')}
              className="w-full bg-midnight/50 border border-gold/10 rounded-xl py-2.5 ps-10 pe-4 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
          </div>
          <div className="space-y-1 max-h-[560px] overflow-y-auto">
            {pickLoading && pickList.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 size={iconSizes.md} className="animate-spin text-white/30" />
              </div>
            ) : pickList.length === 0 ? (
              <p className="text-center py-8 text-white/40 text-sm font-[family-name:var(--font-display)]">
                {t('admin.homepageFeatured.noResults')}
              </p>
            ) : (
              pickList.map((article) => {
                const isPinned = pinnedIds.has(article.id);
                return (
                  <div
                    key={article.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <ArticleThumb src={article.featuredImage} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm line-clamp-2 font-[family-name:var(--font-display)]">
                        {article.title}
                      </p>
                      {article.publishedAt && (
                        <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
                          {formatDate(article.publishedAt)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => pin(article)}
                      disabled={isPinned || pinned.length >= SLOTS}
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-display)]"
                    >
                      <Pin size={12} />
                      {isPinned ? t('admin.homepageFeatured.pinned') : t('admin.homepageFeatured.pin')}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
