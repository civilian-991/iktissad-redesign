'use client';

import { useEffect, useRef, useState } from 'react';
import { Tag as TagIcon, X, Plus, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getTags, createTag } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import type { Tag } from '@/types';

interface TagAutocompleteProps {
  /** Selected tag names (the canonical value stored on the article). */
  value: string[];
  onChange: (next: string[]) => void;
}

// Combobox for picking article tags from the managed vocabulary, with
// search-as-you-type suggestions and the ability to create a new tag inline.
export default function TagAutocomplete({ value, onChange }: TagAutocompleteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [creating, setCreating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search against /api/tags.
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getTags(query.trim(), 10);
        if (!cancelled) setResults(res.data ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const trimmed = query.trim();
  // Suggestions not already attached to the article.
  const suggestions = results.filter((r) => !value.includes(r.name));
  const exactExists =
    trimmed.length > 0 &&
    (value.includes(trimmed) ||
      results.some((r) => r.name.toLowerCase() === trimmed.toLowerCase()));
  const canCreate = trimmed.length > 0 && !exactExists;
  // Items in the dropdown: suggestions, then an optional "create" row.
  const optionCount = suggestions.length + (canCreate ? 1 : 0);

  const addTag = (name: string) => {
    const n = name.trim();
    if (n && !value.includes(n)) onChange([...value, n]);
    setQuery('');
    setHighlight(0);
    setOpen(true);
    inputRef.current?.focus();
  };

  const removeTag = (name: string) => {
    onChange(value.filter((v) => v !== name));
  };

  const handleCreate = async () => {
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const res = await createTag({ name: trimmed });
      const created = res.data;
      if (created) {
        addTag(created.name);
      } else {
        addTag(trimmed);
      }
    } catch (err) {
      toast.error((err as Error)?.message ?? t('admin.tags.createError'));
    } finally {
      setCreating(false);
    }
  };

  const selectHighlighted = () => {
    if (highlight < suggestions.length) {
      addTag(suggestions[highlight].name);
    } else if (canCreate) {
      handleCreate();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (optionCount === 0 ? 0 : (h + 1) % optionCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (optionCount === 0 ? 0 : (h - 1 + optionCount) % optionCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (optionCount > 0) selectHighlighted();
    } else if (e.key === 'Backspace' && query === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gold/15 text-gold text-xs font-[family-name:var(--font-display)] border border-gold/20"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-white transition-colors"
                aria-label={t('admin.tags.removeTag')}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Search
          size={14}
          className="absolute top-1/2 -translate-y-1/2 start-3 text-white/30 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('admin.articles.editor.tagSearchPlaceholder')}
          className="w-full bg-white/5 border border-gold/10 rounded-lg py-2 ps-9 pe-3 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
        />
      </div>

      {/* Dropdown */}
      {open && (loading || optionCount > 0 || trimmed.length > 0) && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gold/15 bg-midnight shadow-xl py-1">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-white/40 text-xs font-[family-name:var(--font-display)]">
              <Loader2 size={12} className="animate-spin" />
              {t('admin.tags.searching')}
            </div>
          )}

          {!loading &&
            suggestions.map((tag, i) => (
              <button
                key={tag.id}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => addTag(tag.name)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-start text-sm font-[family-name:var(--font-display)] transition-colors ${
                  highlight === i ? 'bg-gold/15 text-white' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <TagIcon size={12} className="text-gold/60 shrink-0" />
                  <span className="truncate">{tag.name}</span>
                  {tag.nameEn && (
                    <span className="text-white/30 text-xs truncate" dir="ltr">
                      {tag.nameEn}
                    </span>
                  )}
                </span>
                {tag.articleCount > 0 && (
                  <span className="text-white/30 text-xs shrink-0">{tag.articleCount}</span>
                )}
              </button>
            ))}

          {!loading && canCreate && (
            <button
              type="button"
              onMouseEnter={() => setHighlight(suggestions.length)}
              onClick={handleCreate}
              disabled={creating}
              className={`w-full flex items-center gap-2 px-3 py-2 text-start text-sm font-[family-name:var(--font-display)] transition-colors border-t border-gold/10 ${
                highlight === suggestions.length ? 'bg-gold/15 text-white' : 'text-gold hover:bg-white/5'
              }`}
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {(t('admin.tags.createOption') as string).replace('{name}', trimmed)}
            </button>
          )}

          {!loading && optionCount === 0 && trimmed.length > 0 && (
            <div className="px-3 py-2 text-white/40 text-xs font-[family-name:var(--font-display)]">
              {t('admin.tags.noResults')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
