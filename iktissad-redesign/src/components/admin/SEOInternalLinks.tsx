"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Link2, Copy, Check, Loader2 } from "lucide-react";
import type {
  InternalLinkSuggestion,
  InternalLinksResult,
} from "@/app/api/ai/seo-internal-links/route";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SEOInternalLinksProps {
  title: string;
  content: string;
  targetKeyword?: string;
  currentArticleId?: string;
}

// ---------------------------------------------------------------------------
// Debounce hook (inline, no external lib — mirrors SEOPanel.tsx pattern)
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ---------------------------------------------------------------------------
// Single suggestion row
// ---------------------------------------------------------------------------

interface SuggestionRowProps {
  suggestion: InternalLinkSuggestion;
}

function SuggestionRow({ suggestion }: SuggestionRowProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = `https://iktissad.com/news/${suggestion.slug}`;

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      // Reset the checkmark after 2 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard write failed silently — nothing to surface to user
    });
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const displayTitle =
    suggestion.title.length > 60
      ? suggestion.title.slice(0, 57) + "…"
      : suggestion.title;

  return (
    <li className="flex items-center gap-3 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5">
      {/* Article title — takes available space */}
      <span
        className="flex-1 text-sm text-white leading-snug text-start"
        title={suggestion.title}
      >
        {displayTitle}
      </span>

      {/* Views count */}
      <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
        {suggestion.views.toLocaleString("ar-SA-u-nu-latn")}
      </span>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "تم النسخ!" : `نسخ: ${url}`}
        className="shrink-0 flex items-center gap-1 rounded-md border border-zinc-600 bg-zinc-700 hover:bg-zinc-600 hover:border-amber-500 px-2 py-1 text-xs text-zinc-300 hover:text-amber-300 transition-colors"
      >
        {copied ? (
          <Check size={12} className="text-green-400" />
        ) : (
          <Copy size={12} />
        )}
        <span>ربط</span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SEOInternalLinks({
  title,
  content,
  targetKeyword,
  currentArticleId,
}: SEOInternalLinksProps) {
  const [result, setResult] = useState<InternalLinksResult | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce the two triggers (title + keyword) at 2000 ms
  const debouncedTitle = useDebounce(title, 2000);
  const debouncedKeyword = useDebounce(targetKeyword ?? "", 2000);

  const fetchSuggestions = useCallback(async () => {
    // Don't fire with an empty title — nothing useful to match on
    if (!debouncedTitle.trim()) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const res = await fetch("/api/ai/seo-internal-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: debouncedTitle,
          content,
          targetKeyword: debouncedKeyword || undefined,
          currentArticleId: currentArticleId || undefined,
        }),
        signal: controller.signal,
      });

      // On any non-OK response, absorb silently — don't crash the editor
      if (!res.ok) return;

      const json = await res.json();
      if (json.data) {
        setResult(json.data as InternalLinksResult);
      }
    } catch (err) {
      // AbortError is expected when a newer request supersedes this one
      if ((err as Error).name === "AbortError") return;
      // All other errors are swallowed — the panel should never crash the editor
    } finally {
      setLoading(false);
    }
  }, [debouncedTitle, debouncedKeyword, content, currentArticleId]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasResults =
    result !== null &&
    result.suggestions.length > 0 &&
    !result.insufficient;

  const showEmpty =
    !loading &&
    (result === null || result.insufficient || result.suggestions.length === 0);

  return (
    <div
      className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-4 text-start"
      dir="rtl"
    >
      {/* Panel header */}
      <div className="flex items-center gap-2">
        <Link2 size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-white">
          روابط داخلية مقترحة
        </h3>

        {/* Spinner — inline in the header so the panel doesn't jump */}
        {loading && (
          <Loader2
            size={13}
            className="animate-spin text-zinc-500 ms-auto"
          />
        )}
      </div>

      {/* Empty / insufficient state */}
      {showEmpty && !loading && (
        <p className="text-xs text-zinc-500 py-1">
          لم يُعثر على مقالات مرتبطة — قاعدة المحتوى لا تزال صغيرة
        </p>
      )}

      {/* Initial loading before any result */}
      {loading && result === null && (
        <p className="text-xs text-zinc-500 py-1">جاري البحث…</p>
      )}

      {/* Suggestion list */}
      {hasResults && (
        <ul className="space-y-2">
          {result!.suggestions.map((s) => (
            <SuggestionRow key={s.id} suggestion={s} />
          ))}
        </ul>
      )}

      {/* Helper label shown below results */}
      {hasResults && (
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          انقر «ربط» لنسخ الرابط إلى الحافظة ثم أضفه يدوياً في المحتوى.
        </p>
      )}
    </div>
  );
}
