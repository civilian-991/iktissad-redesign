'use client';

/**
 * SemanticSearchInput — Phase 9.4
 *
 * Archive search widget for the admin editor sidebar and standalone use.
 * Supports two modes toggled by the user:
 *   - بحث بسيط  (simple)   — keyword ILIKE, fast and reliable
 *   - بحث دلالي (semantic) — full-text ranked search (tsvector + ILIKE fallback)
 *
 * Props:
 *   onSelect    — called when the user clicks an article result
 *   placeholder — overrides the default Arabic placeholder
 *   className   — extra CSS classes for the root container
 */

import { useState, useRef, useCallback } from 'react';
import { Search, Loader2, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import type { ApiResponse } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResultArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  section?: string;
}

export interface SemanticSearchInputProps {
  onSelect?: (article: { id: string; title: string; slug: string }) => void;
  placeholder?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SemanticSearchInput({
  onSelect,
  placeholder = 'البحث الدلالي في الأرشيف...',
  className = '',
}: SemanticSearchInputProps) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<SearchResultArticle[]>([]);
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(false);
  const [semantic, setSemantic]     = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const abortRef                    = useRef<AbortController | null>(null);

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSearched(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams({
        q,
        pageSize: '12',
        ...(semantic ? { semantic: 'true' } : {}),
      });

      const res = await fetch(`/api/search?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as ApiResponse<never>).error ?? `خطأ ${res.status}`);
      }

      const body = (await res.json()) as ApiResponse<SearchResultArticle[]>;
      setResults(body.data ?? []);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // Cancelled — ignore
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }, [query, semantic]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleToggle = () => {
    setSemantic((prev) => !prev);
    // Re-run search immediately with new mode if results already exist
    if (searched && query.trim()) {
      // State update is async; pass current inversion directly
      const nextSemantic = !semantic;
      const q = query.trim();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      setResults([]);

      const params = new URLSearchParams({
        q,
        pageSize: '12',
        ...(nextSemantic ? { semantic: 'true' } : {}),
      });

      fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((body: ApiResponse<SearchResultArticle[]>) => {
          setResults(body.data ?? []);
        })
        .catch((err) => {
          if ((err as Error).name === 'AbortError') return;
          setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
        })
        .finally(() => setLoading(false));
    }
  };

  return (
    <div className={`space-y-3 ${className}`} dir="rtl">

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="
            flex-1 bg-midnight border border-gold/20 rounded-lg
            px-4 py-2.5 text-white text-sm
            placeholder:text-white/30
            focus:outline-none focus:border-gold/50
            font-[family-name:var(--font-display)]
          "
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          aria-label="بحث"
          className="
            px-4 py-2.5 bg-gold/10 border border-gold/20 text-gold
            rounded-lg hover:bg-gold/20 transition-colors
            disabled:opacity-40 flex items-center gap-2
          "
        >
          {loading
            ? <Loader2 size={16} className="animate-spin" />
            : <Search size={16} />}
          <span className="text-sm font-[family-name:var(--font-display)] hidden sm:inline">
            بحث
          </span>
        </button>
      </div>

      {/* ── Mode toggle ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors font-[family-name:var(--font-display)]"
          aria-pressed={semantic}
          title={semantic ? 'التبديل إلى البحث البسيط' : 'التبديل إلى البحث الدلالي'}
        >
          {semantic
            ? <ToggleRight size={18} className="text-gold" />
            : <ToggleLeft  size={18} className="text-white/40" />}
          <span>{semantic ? 'بحث دلالي' : 'بحث بسيط'}</span>
        </button>
        {searched && !loading && (
          <span className="text-white/30 text-xs font-[family-name:var(--font-display)]">
            — {results.length} نتيجة
          </span>
        )}
      </div>

      {/* ── Error state ────────────────────────────────────────────────── */}
      {error && (
        <p className="text-red-400 text-sm text-center py-4 font-[family-name:var(--font-display)]">
          {error}
        </p>
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {searched && !loading && !error && results.length === 0 && (
        <p className="text-white/40 text-sm text-center py-8 font-[family-name:var(--font-display)]">
          لا توجد نتائج لـ &quot;{query}&quot;
        </p>
      )}

      {/* ── Results list ───────────────────────────────────────────────── */}
      {results.length > 0 && (
        <ul className="space-y-2 max-h-80 overflow-y-auto ps-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gold/20">
          {results.map((article) => (
            <li key={article.id}>
              <button
                onClick={() => onSelect?.({ id: article.id, title: article.title, slug: article.slug })}
                className="
                  w-full text-start px-3 py-2.5
                  bg-white/[0.03] hover:bg-white/[0.07]
                  border border-white/5 hover:border-gold/20
                  rounded-lg transition-colors group
                "
              >
                {/* Title row */}
                <div className="flex items-start gap-2">
                  <FileText
                    size={14}
                    className="text-gold/50 group-hover:text-gold mt-0.5 shrink-0 transition-colors"
                  />
                  <span className="text-sm text-white font-[family-name:var(--font-display)] line-clamp-2 text-start leading-snug">
                    {article.title}
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-1.5 ps-5">
                  {article.section && (
                    <span className="text-xs text-gold/60 font-[family-name:var(--font-display)]">
                      {article.section}
                    </span>
                  )}
                  {article.publishedAt && (
                    <span className="text-xs text-white/30 font-[family-name:var(--font-display)]">
                      {formatDate(article.publishedAt)}
                    </span>
                  )}
                </div>

                {/* Excerpt */}
                {article.excerpt && (
                  <p className="text-xs text-white/40 mt-1 ps-5 line-clamp-2 text-start leading-relaxed font-[family-name:var(--font-display)]">
                    {article.excerpt}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
