'use client';

import React, { useEffect, useState, useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { MessageCircle, PenLine, User, ChevronDown, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { swrFetcher } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import type { ApiResponse } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentUser {
  id: string;
  name: string | null;
  avatar: string | null;
}

interface Comment {
  id: string;
  article_id: string;
  user_id: string | null;
  parent_id: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user: CommentUser | null;
}

interface CommentsApiResponse {
  data: Comment[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return '؟';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Avatar circle ────────────────────────────────────────────────────────────

function AvatarCircle({ user, size = 'md' }: { user: CommentUser | null; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div
      className={`${sizeClass} rounded-full bg-obsidian flex items-center justify-center flex-shrink-0 font-[family-name:var(--font-display)] font-bold text-gold`}
    >
      {user?.name ? getInitials(user.name) : <User size={size === 'sm' ? 10 : 12} className="text-gold" />}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-4 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-sand/60 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 bg-sand/60 rounded" />
        <div className="h-3 w-full bg-sand/40 rounded" />
        <div className="h-3 w-3/4 bg-sand/40 rounded" />
      </div>
    </div>
  );
}

// ─── Single comment ───────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  articleId: string;
  currentUserId: string | null;
  onReplyPosted: (reply: Comment) => void;
}

function CommentItem({ comment, articleId, currentUserId, onReplyPosted }: CommentItemProps) {
  const { t } = useTranslation();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingMsg, setPendingMsg] = useState('');

  async function submitReply() {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, body: replyText.trim(), parentId: comment.id }),
        credentials: 'include',
      });
      if (res.ok) {
        const json: ApiResponse<Comment> = await res.json();
        if (json.data) {
          onReplyPosted(json.data);
        }
        setReplyText('');
        setReplyOpen(false);
        setPendingMsg(t('comments.pending'));
        setTimeout(() => setPendingMsg(''), 4000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex gap-3 py-4 border-b border-sand/40 last:border-0">
      <AvatarCircle user={comment.user} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-[family-name:var(--font-display)] font-bold text-obsidian">
            {comment.user?.name ?? 'مجهول'}
          </span>
          <span className="text-[10px] text-charcoal/35">
            {formatDate(comment.created_at)}
          </span>
        </div>
        <p className="text-[13px] font-[family-name:var(--font-display)] text-navy/80 leading-relaxed whitespace-pre-wrap">
          {comment.body}
        </p>

        {/* Reply trigger — only if user is logged in */}
        {currentUserId && !replyOpen && (
          <button
            onClick={() => setReplyOpen(true)}
            className="mt-1.5 flex items-center gap-1 text-[11px] font-[family-name:var(--font-display)] text-charcoal/40 hover:text-gold transition-colors"
          >
            <MessageCircle size={11} />
            {t('comments.reply')}
          </button>
        )}

        {/* Pending confirmation */}
        {pendingMsg && (
          <p className="mt-1.5 text-[11px] font-[family-name:var(--font-display)] text-charcoal/50 italic">
            {pendingMsg}
          </p>
        )}

        {/* Inline reply form */}
        {replyOpen && (
          <div className="mt-3 flex gap-2 items-start">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t('comments.placeholder')}
              rows={2}
              dir="rtl"
              className="flex-1 resize-none text-[12px] font-[family-name:var(--font-display)] bg-cream border border-sand/60 focus:border-gold/50 focus:outline-none px-3 py-2 text-obsidian placeholder:text-charcoal/30 transition-colors"
            />
            <button
              onClick={submitReply}
              disabled={submitting || !replyText.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-[family-name:var(--font-display)] font-bold bg-obsidian text-gold hover:bg-obsidian/80 disabled:opacity-40 transition-colors"
            >
              {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              {t('comments.submit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ArticleCommentsProps {
  articleId: string;
}

export default function ArticleComments({ articleId }: ArticleCommentsProps) {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();

  const [page, setPage] = useState(1);
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [newReplies, setNewReplies] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingMsg, setPendingMsg] = useState('');

  // Check auth state once on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const swrKey = articleId
    ? `/api/comments?article_id=${articleId}&status=approved&page=${page}&pageSize=10`
    : null;

  const { data, isLoading } = useSWR<CommentsApiResponse>(swrKey, swrFetcher as unknown as (url: string) => Promise<CommentsApiResponse>);

  // Accumulate pages
  useEffect(() => {
    if (!data?.data) return;
    if (page === 1) {
      setAllComments(data.data);
    } else {
      setAllComments((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        const next = data.data.filter((c) => !ids.has(c.id));
        return [...prev, ...next];
      });
    }
  }, [data, page]);

  const totalPages = data?.pagination?.totalPages ?? 1;
  const hasMore = page < totalPages;

  // Top-level comments only (parent_id is null)
  const topLevel = allComments.filter((c) => c.parent_id === null);
  // Replies from DB keyed by parent_id
  const repliesMap: Record<string, Comment[]> = {};
  allComments.filter((c) => c.parent_id !== null).forEach((c) => {
    if (!repliesMap[c.parent_id!]) repliesMap[c.parent_id!] = [];
    repliesMap[c.parent_id!].push(c);
  });
  // Add optimistically-added replies
  newReplies.forEach((r) => {
    if (!r.parent_id) return;
    if (!repliesMap[r.parent_id]) repliesMap[r.parent_id] = [];
    if (!repliesMap[r.parent_id].find((x) => x.id === r.id)) {
      repliesMap[r.parent_id].push(r);
    }
  });

  const handleReplyPosted = useCallback((reply: Comment) => {
    setNewReplies((prev) => [...prev, reply]);
  }, []);

  async function submitComment() {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);

    // Optimistic placeholder
    const optimistic: Comment = {
      id: `optimistic-${Date.now()}`,
      article_id: articleId,
      user_id: currentUserId,
      parent_id: null,
      body: commentText.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
      user: null,
    };

    setAllComments((prev) => [optimistic, ...prev]);
    const text = commentText;
    setCommentText('');

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, body: text.trim() }),
        credentials: 'include',
      });

      if (res.ok) {
        setPendingMsg(t('comments.pending'));
        setTimeout(() => setPendingMsg(''), 5000);
        // Remove optimistic entry — the real comment will appear after moderation
        setAllComments((prev) => prev.filter((c) => c.id !== optimistic.id));
        // Revalidate
        void mutate(swrKey);
      } else {
        // Revert optimistic on error
        setAllComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      }
    } catch {
      setAllComments((prev) => prev.filter((c) => c.id !== optimistic.id));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-12 pt-10 border-t border-sand/60" dir="rtl">
      {/* Section heading */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-[3px] h-5 bg-gold flex-shrink-0" />
        <h2 className="text-[15px] font-[family-name:var(--font-display)] font-black text-obsidian tracking-wide">
          {t('comments.title')}
        </h2>
        {(data?.pagination?.total ?? 0) > 0 && (
          <span className="text-[11px] font-[family-name:var(--font-display)] text-charcoal/40 mt-0.5">
            ({data!.pagination.total})
          </span>
        )}
      </div>

      {/* Comment form */}
      {currentUserId ? (
        <div className="mb-8 bg-cream border border-sand/60 p-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={t('comments.placeholder')}
            rows={3}
            dir="rtl"
            className="w-full resize-none text-[13px] font-[family-name:var(--font-display)] bg-transparent focus:outline-none text-obsidian placeholder:text-charcoal/30 leading-relaxed"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-sand/40">
            {pendingMsg ? (
              <p className="text-[11px] font-[family-name:var(--font-display)] text-charcoal/50 italic">
                {pendingMsg}
              </p>
            ) : (
              <span />
            )}
            <button
              onClick={submitComment}
              disabled={submitting || !commentText.trim()}
              className="flex items-center gap-2 px-5 py-2 text-[12px] font-[family-name:var(--font-display)] font-bold bg-obsidian text-gold hover:bg-obsidian/80 disabled:opacity-40 transition-colors"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {t('comments.submit')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 flex items-center gap-3 p-4 bg-cream border border-sand/60">
          <PenLine size={15} className="text-gold flex-shrink-0" />
          <p className="text-[13px] font-[family-name:var(--font-display)] text-charcoal/60">
            {t('comments.login_prompt')}{' '}
            <Link href="/login" className="text-gold hover:underline font-bold">
              {t('comments.login_prompt')}
            </Link>
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && page === 1 && (
        <div className="divide-y divide-sand/40">
          <CommentSkeleton />
          <CommentSkeleton />
          <CommentSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && topLevel.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <PenLine size={28} className="text-charcoal/20" />
          <p className="text-[13px] font-[family-name:var(--font-display)] text-charcoal/40">
            {t('comments.empty')}
          </p>
        </div>
      )}

      {/* Comment list */}
      {topLevel.length > 0 && (
        <div>
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                articleId={articleId}
                currentUserId={currentUserId}
                onReplyPosted={handleReplyPosted}
              />
              {/* One level of replies */}
              {repliesMap[comment.id]?.length > 0 && (
                <div className="mr-10 border-r border-gold/20 pr-4 mb-2">
                  {repliesMap[comment.id].map((reply) => (
                    <div key={reply.id} className="flex gap-2.5 py-3 border-b border-sand/30 last:border-0">
                      <AvatarCircle user={reply.user} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12px] font-[family-name:var(--font-display)] font-bold text-obsidian">
                            {reply.user?.name ?? 'مجهول'}
                          </span>
                          <span className="text-[9px] text-charcoal/30">
                            {formatDate(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-[12px] font-[family-name:var(--font-display)] text-navy/75 leading-relaxed whitespace-pre-wrap">
                          {reply.body}
                        </p>
                        {reply.status === 'pending' && (
                          <p className="mt-1 text-[10px] font-[family-name:var(--font-display)] text-charcoal/40 italic">
                            {t('comments.pending')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full mt-4 py-3 text-[12px] font-[family-name:var(--font-display)] font-bold text-charcoal/50 border border-sand/60 hover:border-gold hover:text-gold transition-all"
            >
              {isLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ChevronDown size={12} />
              )}
              {t('comments.load_more')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
