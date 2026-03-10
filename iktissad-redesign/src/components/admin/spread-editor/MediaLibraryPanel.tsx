'use client';

import { useState, useCallback } from 'react';
import useSWRInfinite from 'swr/infinite';
import { useDraggable } from '@dnd-kit/core';
import Image from 'next/image';
import { Search, Loader2, Images } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ApiResponse, MediaItem } from '@/types';

// ─── Draggable media item ─────────────────────────────────────────

function DraggableMediaItem({
  item,
  onSelect,
}: {
  item: MediaItem;
  onSelect?: (item: MediaItem) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `media-${item.id}`,
    data: { type: 'media', item },
  });

  const handleClick = () => {
    if (onSelect) onSelect(item);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border border-gold/10 hover:border-gold/30 transition-all group ${
        isDragging ? 'opacity-40 shadow-2xl scale-95' : ''
      }`}
      title={item.alt || item.filename}
    >
      <Image
        src={item.url}
        alt={item.alt || item.filename}
        fill
        className="object-cover pointer-events-none"
        sizes="90px"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
    </div>
  );
}

// ─── SWR Infinite key builder ─────────────────────────────────────

const PAGE_SIZE = 24;

function getKey(
  pageIndex: number,
  _previousPageData: ApiResponse<MediaItem[]> | null,
  query: string
): string | null {
  const params = new URLSearchParams({
    page: String(pageIndex + 1),
    pageSize: String(PAGE_SIZE),
  });
  if (query) params.set('q', query);
  return `/api/media?${params.toString()}`;
}

// ─── MediaLibraryPanel ─────────────────────────────────────────────

interface Props {
  onSelect?: (mediaItem: MediaItem) => void;
}

export default function MediaLibraryPanel({ onSelect }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef[0]) clearTimeout(debounceRef[0]);
      debounceRef[1](
        setTimeout(() => setDebouncedQuery(value), 400)
      );
    },
    [debounceRef]
  );

  const { data, size, setSize, isLoading } = useSWRInfinite<ApiResponse<MediaItem[]>>(
    (pageIndex, previousPageData) => getKey(pageIndex, previousPageData, debouncedQuery),
    async (url: string) => {
      const res = await fetch(url);
      return res.json();
    },
    { revalidateFirstPage: false }
  );

  const allItems: MediaItem[] = (data ?? []).flatMap((page) => page?.data ?? []);
  const lastPage = data?.[data.length - 1];
  const hasMore =
    lastPage?.pagination
      ? lastPage.pagination.page < lastPage.pagination.totalPages
      : false;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gold/10 flex-shrink-0">
        <p className="text-white/60 text-[10px] uppercase tracking-widest font-mono mb-2">
          مكتبة الوسائط
        </p>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('admin.spreads.mediaLibrary.search')}
            className="w-full bg-white/5 border border-gold/10 rounded-lg py-1.5 ps-7 pe-3 text-white text-xs font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && allItems.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-gold/50" />
          </div>
        )}

        {!isLoading && allItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Images size={24} className="text-white/15 mb-2" />
            <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">
              {t('admin.spreads.mediaLibrary.empty')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5">
          {allItems.map((item) => (
            <DraggableMediaItem key={item.id} item={item} onSelect={onSelect} />
          ))}

          {/* Loading skeleton */}
          {isLoading &&
            allItems.length > 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="aspect-square rounded-lg bg-white/5 animate-pulse"
              />
            ))}
        </div>

        {/* Load more */}
        {hasMore && (
          <button
            onClick={() => setSize(size + 1)}
            disabled={isLoading}
            className="w-full mt-2 py-2 text-gold/70 hover:text-gold text-xs font-[family-name:var(--font-display)] transition-colors"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin mx-auto" />
            ) : (
              t('admin.spreads.mediaLibrary.loadMore')
            )}
          </button>
        )}
      </div>
    </div>
  );
}
