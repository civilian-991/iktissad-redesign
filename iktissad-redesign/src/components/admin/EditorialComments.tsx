'use client';

/**
 * EditorialComments — Collapsible editorial notes panel for the article editor.
 *
 * Internal-only: not visible to readers. Provides a threaded comment layer
 * where editors can discuss, resolve threads, @mention teammates, and request
 * article reviews.
 *
 * Features:
 *  - Threaded replies (parent → children)
 *  - Resolve / unresolve per top-level thread
 *  - Filter: all / unresolved / mine
 *  - @mention autocomplete from /api/users
 *  - Supabase Realtime for live INSERT updates
 *  - "طلب مراجعة" (Request Review) shortcut
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Send,
  Loader2,
  AtSign,
  Eye,
  CornerDownRight,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse, AdminUser } from '@/types';

// ─── Types ───────────────────────────────────────────────────────

interface NoteAuthor {
  id: string;
  name: string;
  avatar: string | null;
}

interface EditorialNote {
  id: string;
  articleId: string;
  parentId: string | null;
  body: string;
  author: NoteAuthor | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  replies: EditorialNote[];
}

type FilterTab = 'all' | 'unresolved' | 'mine';

export interface EditorialCommentsProps {
  articleId: string;
  currentUserId?: string;
  isOpen: boolean;
  onToggle: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} ي`;
}

function Avatar({ author, size = 28 }: { author: NoteAuthor | null; size?: number }) {
  if (author?.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={author.avatar}
        alt={author.name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = author?.name?.slice(0, 2) ?? '؟';
  return (
    <div
      className="rounded-full bg-gold/20 flex items-center justify-center shrink-0 text-gold font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

// ─── @Mention Autocomplete Input ─────────────────────────────────

interface MentionInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  placeholder?: string;
}

function MentionInput({ value, onChange, onSubmit, submitting, placeholder }: MentionInputProps) {
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionAnchor, setMentionAnchor] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch users for mention autocomplete (only when dropdown is open)
  const { data: usersRes } = useSWR<ApiResponse<AdminUser[]>>(
    mentionOpen ? `/api/users?pageSize=20` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const users = usersRes?.data ?? [];
  const filtered = mentionQuery
    ? users.filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : users;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Detect @ trigger
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const atMatch = before.match(/@([a-zA-Z0-9_]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionAnchor(cursor - atMatch[0].length);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  };

  const handleMentionSelect = (name: string) => {
    const before = value.slice(0, mentionAnchor);
    const after = value.slice(mentionAnchor).replace(/^@[a-zA-Z0-9_]*/, '');
    const newVal = `${before}@${name} ${after}`;
    onChange(newVal);
    setMentionOpen(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!submitting && value.trim()) onSubmit();
    }
    if (e.key === 'Escape') setMentionOpen(false);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'أضف ملاحظة… (Ctrl+Enter للإرسال)'}
        dir="rtl"
        rows={3}
        className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 transition-colors resize-none font-[family-name:var(--font-display)]"
      />
      {/* Mention dropdown */}
      <AnimatePresence>
        {mentionOpen && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute bottom-full mb-1 right-0 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto"
          >
            {filtered.slice(0, 8).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleMentionSelect(u.name)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors text-right"
              >
                <Avatar author={{ id: u.id, name: u.name, avatar: (u as AdminUser & { avatar?: string }).avatar ?? null }} size={22} />
                <span className="text-sm text-white font-[family-name:var(--font-display)]">{u.name}</span>
                <span className="text-xs text-white/30 font-[family-name:var(--font-display)]">{u.role}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Single Reply ─────────────────────────────────────────────────

function ReplyItem({ note }: { note: EditorialNote }) {
  return (
    <div className="flex gap-2 mt-2 pe-1 ps-4 border-s border-gold/20">
      <Avatar author={note.author} size={22} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-white/80 font-[family-name:var(--font-display)]">
            {note.author?.name ?? 'مجهول'}
          </span>
          <span className="text-white/25 text-xs font-[family-name:var(--font-display)]">
            {relativeTime(note.createdAt)}
          </span>
        </div>
        <p className="text-xs text-white/70 leading-relaxed font-[family-name:var(--font-display)] whitespace-pre-wrap break-words">
          {note.body}
        </p>
      </div>
    </div>
  );
}

// ─── Thread (top-level note + replies + reply compose) ────────────

interface ThreadProps {
  note: EditorialNote;
  currentUserId?: string;
  articleId: string;
  onResolutionToggle: (noteId: string, resolved: boolean) => Promise<void>;
  onReplySubmit: (parentId: string, body: string) => Promise<void>;
}

function Thread({ note, currentUserId, onResolutionToggle, onReplySubmit }: ThreadProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [togglingResolve, setTogglingResolve] = useState(false);

  const isResolved = !!note.resolvedAt;

  const handleResolveToggle = async () => {
    setTogglingResolve(true);
    try {
      await onResolutionToggle(note.id, !isResolved);
    } finally {
      setTogglingResolve(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyBody.trim()) return;
    setSubmitting(true);
    try {
      await onReplySubmit(note.id, replyBody.trim());
      setReplyBody('');
      setReplyOpen(false);
      setShowReplies(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        isResolved
          ? 'border-zinc-700/40 bg-zinc-800/20 opacity-60'
          : 'border-zinc-700/60 bg-zinc-800/40'
      }`}
    >
      {/* Thread header */}
      <div className="flex items-start gap-2.5">
        <Avatar author={note.author} size={26} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white/90 font-[family-name:var(--font-display)]">
                {note.author?.name ?? 'مجهول'}
              </span>
              <span className="text-white/25 text-xs font-[family-name:var(--font-display)]">
                {relativeTime(note.createdAt)}
              </span>
            </div>
            {/* Resolve toggle */}
            <button
              onClick={handleResolveToggle}
              disabled={togglingResolve}
              title={isResolved ? 'إعادة فتح' : 'تعليم محلول'}
              className={`shrink-0 p-1 rounded-lg transition-colors ${
                isResolved
                  ? 'text-profit/60 hover:text-profit'
                  : 'text-white/25 hover:text-profit'
              }`}
            >
              {togglingResolve ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isResolved ? (
                <CheckCircle2 size={13} />
              ) : (
                <Circle size={13} />
              )}
            </button>
          </div>

          {/* Body */}
          <p className="text-sm text-white/80 leading-relaxed font-[family-name:var(--font-display)] whitespace-pre-wrap break-words">
            {note.body}
          </p>

          {/* Footer actions */}
          <div className="flex items-center gap-3 mt-2">
            {note.replies.length > 0 && (
              <button
                onClick={() => setShowReplies((v) => !v)}
                className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors font-[family-name:var(--font-display)]"
              >
                <CornerDownRight size={11} />
                {note.replies.length} {note.replies.length === 1 ? 'رد' : 'ردود'}
              </button>
            )}
            <button
              onClick={() => setReplyOpen((v) => !v)}
              className="text-xs text-white/40 hover:text-gold transition-colors font-[family-name:var(--font-display)]"
            >
              رد
            </button>
            {isResolved && (
              <span className="text-xs text-profit/60 font-[family-name:var(--font-display)] flex items-center gap-1">
                <CheckCircle2 size={10} />
                محلول
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      <AnimatePresence>
        {showReplies && note.replies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mt-1"
          >
            {note.replies.map((reply) => (
              <ReplyItem key={reply.id} note={reply} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply compose */}
      <AnimatePresence>
        {replyOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mt-2 ps-4 border-s border-gold/20"
          >
            <MentionInput
              value={replyBody}
              onChange={setReplyBody}
              onSubmit={handleReplySubmit}
              submitting={submitting}
              placeholder="اكتب رداً…"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleReplySubmit}
                disabled={submitting || !replyBody.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-obsidian text-xs font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-display)]"
              >
                {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                إرسال
              </button>
              <button
                onClick={() => { setReplyOpen(false); setReplyBody(''); }}
                className="text-xs text-white/40 hover:text-white/70 transition-colors font-[family-name:var(--font-display)]"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── EditorialComments (main panel) ──────────────────────────────

export default function EditorialComments({
  articleId,
  currentUserId,
  isOpen,
  onToggle,
}: EditorialCommentsProps) {
  const { mutate } = useSWRConfig();
  const swrKey = `/api/editorial-notes/${articleId}`;

  const { data: notesRes, isLoading } = useSWR<ApiResponse<EditorialNote[]>>(
    isOpen ? swrKey : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const notes = notesRes?.data ?? [];

  const [filter, setFilter] = useState<FilterTab>('all');
  const [composeBody, setComposeBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingReview, setSendingReview] = useState(false);

  // ── Supabase Realtime ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`editorial-notes-${articleId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'editorial_notes',
          filter: `article_id=eq.${articleId}`,
        },
        () => {
          // Re-fetch when a new note arrives from another user
          mutate(swrKey);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, articleId, swrKey, mutate]);

  // ── Filter logic ──────────────────────────────────────────────
  const visibleNotes = notes.filter((n) => {
    if (filter === 'unresolved') return !n.resolvedAt;
    if (filter === 'mine') return n.author?.id === currentUserId;
    return true;
  });

  const unresolvedCount = notes.filter((n) => !n.resolvedAt).length;

  // ── Actions ───────────────────────────────────────────────────

  const handleSubmit = useCallback(async (isReviewRequest = false) => {
    const body = composeBody.trim();
    if (!body && !isReviewRequest) return;

    const payload = isReviewRequest
      ? { body: body || 'طُلبت مراجعتك لهذا المقال.', isReviewRequest: true }
      : { body };

    setSubmitting(true);
    if (isReviewRequest) setSendingReview(true);

    try {
      const res = await fetch(`/api/editorial-notes/${articleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? 'فشل الإرسال');
      }

      setComposeBody('');
      mutate(swrKey);
      toast.success(isReviewRequest ? 'تم إرسال طلب المراجعة' : 'تمت إضافة الملاحظة');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setSendingReview(false);
    }
  }, [composeBody, articleId, swrKey, mutate]);

  const handleResolutionToggle = useCallback(async (noteId: string, resolved: boolean) => {
    try {
      const res = await fetch(`/api/editorial-notes/${articleId}/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? 'فشل التحديث');
      }
      mutate(swrKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      toast.error(msg);
    }
  }, [articleId, swrKey, mutate]);

  const handleReplySubmit = useCallback(async (parentId: string, body: string) => {
    const res = await fetch(`/api/editorial-notes/${articleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, parentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error ?? 'فشل الإرسال');
    }
    mutate(swrKey);
  }, [articleId, swrKey, mutate]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex h-full" dir="rtl">
      {/* Collapsed tab */}
      {!isOpen && (
        <button
          onClick={onToggle}
          title="فتح التعليقات التحريرية"
          className="flex flex-col items-center justify-center w-12 gap-2 border-r border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-colors text-white/50 hover:text-gold shrink-0"
          style={{ minHeight: 120 }}
        >
          <MessageSquare size={16} className="text-gold" />
          {unresolvedCount > 0 && (
            <span className="w-4 h-4 bg-gold rounded-full text-obsidian text-[9px] font-bold flex items-center justify-center">
              {unresolvedCount > 9 ? '9+' : unresolvedCount}
            </span>
          )}
          <span
            className="text-xs font-semibold text-white/50"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            ملاحظات
          </span>
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Open panel */}
      {isOpen && (
        <div className="flex flex-col w-72 shrink-0 border-r border-zinc-700 bg-zinc-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-700 bg-zinc-800/60 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-gold" />
              <span className="text-xs font-bold text-white tracking-wide font-[family-name:var(--font-display)]">
                التعليقات التحريرية
              </span>
              {unresolvedCount > 0 && (
                <span className="px-1.5 py-0.5 bg-gold/20 text-gold text-[10px] font-bold rounded-full">
                  {unresolvedCount}
                </span>
              )}
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-zinc-700 transition-colors"
              title="إغلاق"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-0.5 px-2.5 py-2 border-b border-zinc-700/60 shrink-0">
            {(
              [
                { key: 'all', label: 'الكل' },
                { key: 'unresolved', label: 'غير محلولة' },
                { key: 'mine', label: 'تعليقاتي' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex-1 py-1 text-xs rounded-lg transition-colors font-[family-name:var(--font-display)] ${
                  filter === key
                    ? 'bg-gold/15 text-gold font-semibold'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gold/50" />
              </div>
            ) : visibleNotes.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare size={28} className="mx-auto text-white/15 mb-2" />
                <p className="text-white/30 text-xs font-[family-name:var(--font-display)]">
                  {filter === 'unresolved'
                    ? 'لا توجد تعليقات غير محلولة'
                    : filter === 'mine'
                    ? 'لم تضف أي تعليقات بعد'
                    : 'لا توجد تعليقات بعد'}
                </p>
              </div>
            ) : (
              visibleNotes.map((note) => (
                <Thread
                  key={note.id}
                  note={note}
                  currentUserId={currentUserId}
                  articleId={articleId}
                  onResolutionToggle={handleResolutionToggle}
                  onReplySubmit={handleReplySubmit}
                />
              ))
            )}
          </div>

          {/* Compose area */}
          <div className="shrink-0 border-t border-zinc-700/60 p-2.5 space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <AtSign size={11} className="text-white/30" />
              <span className="text-xs text-white/30 font-[family-name:var(--font-display)]">
                اكتب @ للإشارة إلى زميل
              </span>
            </div>
            <MentionInput
              value={composeBody}
              onChange={setComposeBody}
              onSubmit={() => handleSubmit(false)}
              submitting={submitting}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting || !composeBody.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-obsidian text-xs font-bold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-display)]"
              >
                {submitting && !sendingReview ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Send size={11} />
                )}
                إضافة
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={sendingReview}
                title="إرسال طلب مراجعة للكاتب"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white/70 hover:text-white text-xs rounded-lg transition-colors disabled:opacity-40 font-[family-name:var(--font-display)]"
              >
                {sendingReview ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Eye size={11} />
                )}
                طلب مراجعة
              </button>
              {composeBody && (
                <button
                  onClick={() => setComposeBody('')}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors"
                  title="مسح"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
