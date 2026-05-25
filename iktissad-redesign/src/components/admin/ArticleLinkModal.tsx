'use client';

/**
 * ArticleLinkModal — Phase 10.1 Source & Contact CRM
 * IKTISSAD Design System
 *
 * Search for an article and link it to a source,
 * optionally adding a quote excerpt.
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { X, Search, FileText, Loader2, Link2 } from 'lucide-react';
import { iconSizes } from '@/lib/design-tokens';
import { swrFetcher } from '@/lib/api-client';
import useSWR from 'swr';
import type { ApiResponse, Article } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  sourceId: string;
  onClose: () => void;
  onSave: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArticleLinkModal({ sourceId, onClose, onSave }: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [quoteExcerpt, setQuoteExcerpt] = useState('');
  const [saving, setSaving] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch articles matching search
  const articlesKey = debouncedSearch.length >= 2
    ? `/api/articles?search=${encodeURIComponent(debouncedSearch)}&pageSize=10&status=published`
    : null;

  const { data: articlesData, isLoading: articlesLoading } = useSWR<ApiResponse<Article[]>>(
    articlesKey,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const articles = articlesData?.data ?? [];

  const handleLink = async () => {
    if (!selectedArticle) {
      toast.error('اختر مقالة أولاً');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/sources/${sourceId}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: selectedArticle.id,
          quoteExcerpt: quoteExcerpt.trim() || undefined,
        }),
      });
      const json: ApiResponse<unknown> = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'حدث خطأ');
      toast.success('تم ربط المقالة بالمصدر');
      onSave();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="bg-midnight border border-gold/15 rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gold/10">
          <div className="flex items-center gap-2">
            <Link2 size={iconSizes.md} className="text-gold/60" />
            <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-base">
              ربط المصدر بمقالة
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={iconSizes.md} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن مقالة..."
              autoFocus
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors text-sm"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          </div>

          {/* Results */}
          {debouncedSearch.length >= 2 && (
            <div className="border border-gold/10 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              {articlesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-gold/40" />
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/40 font-[family-name:var(--font-display)] text-sm">
                    لا توجد نتائج
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gold/5">
                  {articles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className={`w-full flex items-start gap-3 p-3 text-right transition-colors ${
                        selectedArticle?.id === article.id
                          ? 'bg-gold/15'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <FileText
                        size={14}
                        className={`mt-0.5 shrink-0 ${
                          selectedArticle?.id === article.id ? 'text-gold' : 'text-white/30'
                        }`}
                      />
                      <div className="min-w-0 text-right">
                        <p
                          className={`text-sm font-[family-name:var(--font-display)] font-medium truncate ${
                            selectedArticle?.id === article.id ? 'text-gold' : 'text-white'
                          }`}
                        >
                          {article.title}
                        </p>
                        {article.publishedAt && (
                          <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mt-0.5">
                            {new Date(article.publishedAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn')}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected article */}
          {selectedArticle && (
            <div className="flex items-center gap-2 p-3 bg-gold/5 border border-gold/15 rounded-xl">
              <FileText size={14} className="text-gold shrink-0" />
              <p className="text-gold text-sm font-[family-name:var(--font-display)] font-medium truncate flex-1">
                {selectedArticle.title}
              </p>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-white/30 hover:text-white shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Quote excerpt */}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
              مقتطف الاقتباس (اختياري)
            </label>
            <textarea
              value={quoteExcerpt}
              onChange={(e) => setQuoteExcerpt(e.target.value)}
              placeholder="أدخل مقتطفاً من المقالة ينسب إلى هذا المصدر..."
              rows={3}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gold/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-white/60 hover:text-white font-[family-name:var(--font-display)] text-sm transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleLink}
            disabled={!selectedArticle || saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            ربط المقالة
          </button>
        </div>
      </div>
    </div>
  );
}
