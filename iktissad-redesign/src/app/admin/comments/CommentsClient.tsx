'use client';

/**
 * Admin Comments Moderation Client
 * IKTISSAD Design System
 *
 * Tab bar for all/pending/approved/rejected/spam statuses.
 * Real-time updates via Supabase Realtime.
 * Optimistic updates with SWR.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Check,
  X,
  ShieldAlert,
  Trash2,
  MessageSquare,
  Search,
  Loader2,
  User,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { formatRelativeTime } from '@/lib/i18n/format';
import { iconSizes } from '@/lib/design-tokens';
import {
  swrFetcher,
  updateComment as updateCommentApi,
  deleteComment as deleteCommentApi,
} from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

// ─── Types ───────────────────────────────────────────────────────

type CommentStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'spam';

interface CommentUser {
  id: string;
  name: string;
  avatar?: string;
}

interface CommentArticle {
  id: string;
  title: string;
  slug: string;
}

interface Comment {
  id: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  created_at: string;
  user: CommentUser | null;
  article: CommentArticle | null;
}

// ─── Tab Configuration ────────────────────────────────────────────

const TABS: { key: CommentStatus; labelKey: string }[] = [
  { key: 'all', labelKey: 'admin.comments.tabs.all' },
  { key: 'pending', labelKey: 'admin.comments.tabs.pending' },
  { key: 'approved', labelKey: 'admin.comments.tabs.approved' },
  { key: 'rejected', labelKey: 'admin.comments.tabs.rejected' },
  { key: 'spam', labelKey: 'admin.comments.tabs.spam' },
];

// ─── Main Component ───────────────────────────────────────────────

export default function CommentsClient() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<CommentStatus>('pending');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Build SWR key
  const swrKey = (() => {
    const params = new URLSearchParams();
    if (activeTab !== 'all') params.set('status', activeTab);
    if (debouncedSearch) params.set('search', debouncedSearch);
    return `/api/comments?${params.toString()}`;
  })();

  const { data, isLoading, mutate } = useSWR<ApiResponse<Comment[]>>(
    swrKey,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const comments = useMemo(() => data?.data ?? [], [data]);

  // Fetch pending count for badge
  const { data: pendingData } = useSWR<ApiResponse<Comment[]>>(
    '/api/comments?status=pending&pageSize=1',
    swrFetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  );

  useEffect(() => {
    setPendingCount(pendingData?.pagination?.total ?? 0);
  }, [pendingData]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-comments')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload: { new: Comment }) => {
          const newComment = payload.new;
          if (newComment.status === 'pending') {
            setPendingCount((prev) => prev + 1);
            toast.info(t('admin.comments.newCommentToast'), {
              description: newComment.body.slice(0, 80),
            });
            // Auto-prepend if on pending or all tab
            if (activeTab === 'pending' || activeTab === 'all') {
              mutate();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, mutate, t]);

  // ─── Actions ─────────────────────────────────────────────────────

  const moderateComment = useCallback(
    async (id: string, status: 'approved' | 'rejected' | 'spam') => {
      // Optimistic update
      const prevComments = comments;
      mutate(
        (prev) => {
          if (!prev) return prev;
          const prevData = prev.data ?? [];
          return {
            ...prev,
            data: prevData
              .filter((c) => (activeTab === 'all' ? true : c.id !== id))
              .map((c) => (c.id === id ? { ...c, status } : c)),
          };
        },
        { revalidate: false }
      );

      try {
        await updateCommentApi(id, { status });
        toast.success(t(`admin.comments.actions.${status}Success`));
        mutate();
      } catch {
        // Revert
        mutate(
          (prev) => {
            if (!prev) return prev;
            return { ...prev, data: prevComments as Comment[] };
          },
          { revalidate: false }
        );
        toast.error(t('admin.common.error'));
      }
    },
    [comments, mutate, activeTab, t]
  );

  const deleteComment = useCallback(
    async (id: string) => {
      try {
        await deleteCommentApi(id);
        toast.success(t('admin.comments.actions.deleteSuccess'));
        mutate();
      } catch {
        toast.error(t('admin.common.error'));
      }
    },
    [mutate, t]
  );

  const bulkModerate = useCallback(
    async (status: 'approved' | 'spam') => {
      try {
        await Promise.all(selected.map((id) => updateCommentApi(id, { status })));
        toast.success(
          status === 'approved'
            ? t('admin.comments.bulkApproveSuccess')
            : t('admin.comments.bulkSpamSuccess')
        );
        setSelected([]);
        mutate();
      } catch {
        toast.error(t('admin.common.error'));
      }
    },
    [selected, mutate, t]
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const toggleAll = () =>
    setSelected(selected.length === comments.length ? [] : comments.map((c) => c.id));

  // ─── Relative time ────────────────────────────────────────────────

  const relativeTime = (dateStr: string) => {
    return formatRelativeTime(dateStr, 'ar');
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
          {t('admin.comments.title')}
        </h1>
        <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
          {pendingCount} {t('admin.comments.pendingLabel')}
        </p>
      </div>

      {/* Search */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4">
        <div className="relative">
          <input
            type="text"
            placeholder={t('admin.comments.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gold/10 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelected([]); }}
            className={`relative px-5 py-3 text-sm font-[family-name:var(--font-display)] font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-gold'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t(tab.labelKey)}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="ms-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-loss text-white text-xs font-bold">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
            {activeTab === tab.key && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 start-0 end-0 h-0.5 bg-gold"
              />
            )}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gold/10 border border-gold/20 rounded-xl p-4 flex items-center justify-between"
          >
            <span className="text-gold font-[family-name:var(--font-display)] text-sm">
              {t('admin.articles.bulkActions.selected', { count: selected.length })}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkModerate('approved')}
                className="px-4 py-2 rounded-lg bg-profit/10 text-profit hover:bg-profit/20 text-sm font-[family-name:var(--font-display)] transition-colors"
              >
                {t('admin.comments.bulkApprove')}
              </button>
              <button
                onClick={() => bulkModerate('spam')}
                className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-sm font-[family-name:var(--font-display)] transition-colors"
              >
                {t('admin.comments.bulkSpam')}
              </button>
              <button
                onClick={() => setSelected([])}
                className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:text-white text-sm font-[family-name:var(--font-display)] transition-colors"
              >
                {t('admin.articles.bulkActions.deselect')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Table */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
        {isLoading && comments.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-gold/50" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 font-[family-name:var(--font-display)]">
              {t(`admin.comments.empty.${activeTab}`)}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              role="grid"
              aria-label={t('admin.comments.title')}
              className="w-full"
            >
              <thead>
                <tr className="border-b border-gold/10 bg-white/5">
                  <th className="p-4 text-right w-10">
                    <input
                      type="checkbox"
                      checked={selected.length === comments.length && comments.length > 0}
                      onChange={toggleAll}
                      aria-label={t('common.actions.selectAll')}
                      className="w-4 h-4 rounded border-gold/30 bg-transparent accent-gold"
                    />
                  </th>
                  <th className="p-4 text-right text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.comments.columns.user')}
                  </th>
                  <th className="p-4 text-right text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.comments.columns.comment')}
                  </th>
                  <th className="p-4 text-right text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold hidden md:table-cell">
                    {t('admin.comments.columns.article')}
                  </th>
                  <th className="p-4 text-right text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold hidden lg:table-cell">
                    {t('admin.comments.columns.date')}
                  </th>
                  <th className="p-4 text-right text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    {t('admin.comments.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comments.map((comment, index) => (
                  <motion.tr
                    key={comment.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={`border-b border-gold/5 hover:bg-white/5 transition-colors ${
                      selected.includes(comment.id) ? 'bg-gold/5' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selected.includes(comment.id)}
                        onChange={() => toggleSelect(comment.id)}
                        className="w-4 h-4 rounded border-gold/30 bg-transparent accent-gold"
                      />
                    </td>

                    {/* User */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {comment.user?.avatar ? (
                          <img
                            src={comment.user.avatar}
                            alt={comment.user.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                            <User size={14} className="text-gold" />
                          </div>
                        )}
                        <span className="text-white/80 text-sm font-[family-name:var(--font-display)] whitespace-nowrap">
                          {comment.user?.name ?? t('admin.comments.anonymousUser')}
                        </span>
                      </div>
                    </td>

                    {/* Comment text */}
                    <td className="p-4 max-w-xs">
                      <p className="text-white/70 text-sm font-[family-name:var(--font-display)] line-clamp-2">
                        {comment.body.length > 80
                          ? comment.body.slice(0, 80) + '...'
                          : comment.body}
                      </p>
                      {/* Status badge on mobile */}
                      <span className={`mt-1 inline-flex md:hidden text-xs px-2 py-0.5 rounded-full ${
                        comment.status === 'approved' ? 'bg-profit/10 text-profit' :
                        comment.status === 'pending' ? 'bg-gold/10 text-gold' :
                        comment.status === 'spam' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-loss/10 text-loss'
                      }`}>
                        {t(`admin.comments.tabs.${comment.status}`)}
                      </span>
                    </td>

                    {/* Article */}
                    <td className="p-4 hidden md:table-cell">
                      {comment.article ? (
                        <Link
                          href={`/${comment.article.slug}`}
                          target="_blank"
                          className="text-gold/70 hover:text-gold text-xs font-[family-name:var(--font-display)] line-clamp-2 transition-colors"
                        >
                          {comment.article.title}
                        </Link>
                      ) : (
                        <span className="text-white/30 text-xs">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-white/40 text-xs font-[family-name:var(--font-display)]">
                        {relativeTime(comment.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div role="group" aria-label={t('admin.comments.columns.actions')} className="flex items-center gap-1">
                        {comment.status !== 'approved' && (
                          <button
                            onClick={() => moderateComment(comment.id, 'approved')}
                            title={t('admin.comments.actions.approve')}
                            aria-label={`${t('admin.comments.actions.approve')} — ${comment.user?.name ?? t('admin.comments.anonymousUser')}`}
                            className="p-1.5 rounded-lg text-profit hover:bg-profit/10 transition-colors"
                          >
                            <Check size={iconSizes.sm} aria-hidden="true" />
                          </button>
                        )}
                        {comment.status !== 'rejected' && (
                          <button
                            onClick={() => moderateComment(comment.id, 'rejected')}
                            title={t('admin.comments.actions.reject')}
                            aria-label={`${t('admin.comments.actions.reject')} — ${comment.user?.name ?? t('admin.comments.anonymousUser')}`}
                            className="p-1.5 rounded-lg text-loss hover:bg-loss/10 transition-colors"
                          >
                            <X size={iconSizes.sm} aria-hidden="true" />
                          </button>
                        )}
                        {comment.status !== 'spam' && (
                          <button
                            onClick={() => moderateComment(comment.id, 'spam')}
                            title={t('admin.comments.actions.spam')}
                            aria-label={`${t('admin.comments.actions.spam')} — ${comment.user?.name ?? t('admin.comments.anonymousUser')}`}
                            className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors"
                          >
                            <ShieldAlert size={iconSizes.sm} aria-hidden="true" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteComment(comment.id)}
                          title={t('admin.comments.actions.delete')}
                          aria-label={`${t('admin.comments.actions.delete')} — ${comment.user?.name ?? t('admin.comments.anonymousUser')}`}
                          className="p-1.5 rounded-lg text-white/40 hover:text-loss hover:bg-loss/10 transition-colors"
                        >
                          <Trash2 size={iconSizes.sm} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
