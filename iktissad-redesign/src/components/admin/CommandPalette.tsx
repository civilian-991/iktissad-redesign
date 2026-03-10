'use client';

/**
 * Command Palette
 * Opens with ⌘K (Mac) / Ctrl+K (Windows/Linux)
 * Uses cmdk package for accessible command navigation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Users,
  Settings,
  MessageSquare,
  BarChart2,
  Plus,
  Tag,
  Search,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { Article, ApiResponse } from '@/types';

// ─── Navigation items ────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'لوحة التحكم', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'المقالات', href: '/admin/articles', icon: FileText },
  { label: 'المجلة', href: '/admin/magazines', icon: BookOpen },
  { label: 'المشتركون', href: '/admin/subscribers', icon: Users },
  { label: 'الإيرادات', href: '/admin/revenue', icon: BarChart2 },
  { label: 'التعليقات', href: '/admin/comments', icon: MessageSquare },
  { label: 'الإعدادات', href: '/admin/settings', icon: Settings },
];

const CREATE_ITEMS: NavItem[] = [
  { label: 'مقال جديد', href: '/admin/articles/new', icon: FileText },
  { label: 'عدد مجلة جديد', href: '/admin/magazines/new', icon: BookOpen },
  { label: 'كود ترويجي جديد', href: '/admin/promo-codes/new', icon: Tag },
];

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setArticles([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search articles when query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setArticles([]);
      return;
    }
    const controller = new AbortController();
    setIsSearching(true);
    fetch(`/api/articles?search=${encodeURIComponent(debouncedQuery)}&pageSize=5`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: ApiResponse<Article[]>) => {
        setArticles(data.data ?? []);
      })
      .catch(() => {/* aborted */})
      .finally(() => setIsSearching(false));

    return () => controller.abort();
  }, [debouncedQuery]);

  const navigate = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [router, onClose]
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-[10%] z-50 mx-auto max-w-2xl px-4"
          >
            <Command
              dir="rtl"
              className="rounded-2xl border border-gold/20 bg-obsidian shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden"
              shouldFilter={false}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 border-b border-gold/10 px-4 py-3">
                <Search size={18} className="text-white/40 flex-shrink-0" />
                <Command.Input
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder={t('admin.commandPalette.placeholder')}
                  className="flex-1 bg-transparent text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none text-base"
                />
                {isSearching && (
                  <Loader2 size={16} className="animate-spin text-gold/50 flex-shrink-0" />
                )}
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white/5 border border-gold/10 text-white/30 text-xs font-[family-name:var(--font-display)]">
                  ESC
                </kbd>
              </div>

              {/* List */}
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-white/40 text-sm font-[family-name:var(--font-display)]">
                  {t('admin.commandPalette.noResults')}
                </Command.Empty>

                {/* Article search results */}
                {articles.length > 0 && (
                  <Command.Group
                    heading={
                      <span className="text-xs text-white/40 font-[family-name:var(--font-display)] px-2 pb-1 block">
                        {t('admin.commandPalette.searchArticles')}
                      </span>
                    }
                  >
                    {articles.map((article) => (
                      <Command.Item
                        key={article.id}
                        value={`article-${article.id}`}
                        onSelect={() => navigate(`/admin/articles/${article.id}`)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-white/80 hover:text-white hover:bg-white/5 aria-selected:bg-gold/10 aria-selected:text-gold transition-colors"
                      >
                        <FileText size={16} className="flex-shrink-0 text-gold/60" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-[family-name:var(--font-display)] truncate">
                            {article.title}
                          </p>
                          {article.section && (
                            <span className="text-xs text-white/40 font-[family-name:var(--font-display)]">
                              {article.section}
                            </span>
                          )}
                        </div>
                        <ArrowLeft size={14} className="text-white/20 flex-shrink-0" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Navigation group */}
                {!query.trim() && (
                  <>
                    <Command.Group
                      heading={
                        <span className="text-xs text-white/40 font-[family-name:var(--font-display)] px-2 pb-1 block">
                          {t('admin.commandPalette.navigation')}
                        </span>
                      }
                    >
                      {NAV_ITEMS.map((item) => (
                        <Command.Item
                          key={item.href}
                          value={item.label}
                          onSelect={() => navigate(item.href)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-white/80 hover:text-white hover:bg-white/5 aria-selected:bg-gold/10 aria-selected:text-gold transition-colors"
                        >
                          <item.icon size={16} className="flex-shrink-0 text-gold/60" />
                          <span className="text-sm font-[family-name:var(--font-display)]">
                            {item.label}
                          </span>
                          <ArrowLeft size={14} className="text-white/20 ms-auto flex-shrink-0" />
                        </Command.Item>
                      ))}
                    </Command.Group>

                    <Command.Separator className="my-1 border-t border-gold/10" />

                    <Command.Group
                      heading={
                        <span className="text-xs text-white/40 font-[family-name:var(--font-display)] px-2 pb-1 block">
                          {t('admin.commandPalette.create')}
                        </span>
                      }
                    >
                      {CREATE_ITEMS.map((item) => (
                        <Command.Item
                          key={item.href}
                          value={item.label}
                          onSelect={() => navigate(item.href)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-white/80 hover:text-white hover:bg-white/5 aria-selected:bg-gold/10 aria-selected:text-gold transition-colors"
                        >
                          <div className="w-6 h-6 rounded-md bg-gold/10 flex items-center justify-center flex-shrink-0">
                            <Plus size={12} className="text-gold" />
                          </div>
                          <span className="text-sm font-[family-name:var(--font-display)]">
                            {item.label}
                          </span>
                          <ArrowLeft size={14} className="text-white/20 ms-auto flex-shrink-0" />
                        </Command.Item>
                      ))}
                    </Command.Group>
                  </>
                )}
              </Command.List>

              {/* Footer hint */}
              <div className="border-t border-gold/10 px-4 py-2 flex items-center gap-4">
                <span className="text-xs text-white/30 font-[family-name:var(--font-display)] flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-gold/10 text-[10px]">↑↓</kbd>
                  للتنقل
                </span>
                <span className="text-xs text-white/30 font-[family-name:var(--font-display)] flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-gold/10 text-[10px]">↵</kbd>
                  للاختيار
                </span>
                <span className="text-xs text-white/30 font-[family-name:var(--font-display)] flex items-center gap-1 me-auto">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-gold/10 text-[10px]">ESC</kbd>
                  للإغلاق
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
