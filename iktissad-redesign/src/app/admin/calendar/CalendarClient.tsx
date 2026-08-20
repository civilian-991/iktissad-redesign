/**
 * Admin Editorial Calendar — Client Component
 * IKTISSAD Design System
 *
 * Phase 3.1 + 3.2:
 *  - Month / week view toggle
 *  - Articles plotted by published_at (or created_at for drafts)
 *  - Status-coloured chips with +N overflow
 *  - Click empty slot → quick-create modal (pre-filled date)
 *  - Click chip → navigate to /admin/articles/{id}
 *  - Drag chip → reschedule via PUT /api/articles/{id}
 *  - Section filter dropdown
 *  - Coverage gap glow on empty future days
 *  - 90-day publishing frequency heatmap
 *  - Stats row: this week / avg / sections with no content
 */

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, CalendarDays, Loader2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { swrFetcher, updateArticle, createArticle, sectionsKey } from '@/lib/api-client';
import type { ApiResponse, Section } from '@/types';
import type { CalendarArticle } from '@/app/api/admin/calendar/route';

// ─── Constants ────────────────────────────────────────────────────────────────

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

type ViewMode = 'month' | 'week';

// ─── Chip style by status ─────────────────────────────────────────────────────

const STATUS_CHIP: Record<CalendarArticle['status'], string> = {
  draft:     'bg-white/10 text-white/60 border border-white/10',
  review:    'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  scheduled: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  published: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
};

const STATUS_LABEL: Record<CalendarArticle['status'], string> = {
  draft:     'مسودة',
  review:    'مراجعة',
  scheduled: 'مجدول',
  published: 'منشور',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Returns the Sunday-aligned start of the week containing `date`. */
function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Returns the 35 or 42 cells that make up a month grid (always full weeks). */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const cells: Date[] = [];
  // Pad start to nearest Sunday
  for (let i = first.getDay(); i > 0; i--) {
    cells.push(addDays(first, -i));
  }
  // Month days
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  // Pad end to complete last week
  const remainder = cells.length % 7;
  if (remainder > 0) {
    for (let i = 1; i <= 7 - remainder; i++) {
      cells.push(addDays(last, i));
    }
  }
  return cells;
}

/** Returns the 7 days of a week starting on Sunday. */
function buildWeekGrid(anchor: Date): Date[] {
  const start = weekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// ─── SWR key ─────────────────────────────────────────────────────────────────

function calendarKey(year: number, month: number): string {
  return `/api/admin/calendar?year=${year}&month=${month + 1}`;
}

/** Key for the 90-day heatmap (covers 3 calendar months). */
function heatmapKey(today: Date): string {
  const start = addDays(today, -89);
  return `/api/admin/calendar?start=${start.toISOString()}&end=${today.toISOString()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ArticleChipProps {
  article: CalendarArticle;
  onDragStart: (e: React.DragEvent, article: CalendarArticle) => void;
}

function ArticleChip({ article, onDragStart }: ArticleChipProps) {
  const router = useRouter();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, article)}
      onClick={(e) => { e.stopPropagation(); router.push(`/admin/articles/${article.id}`); }}
      title={`${article.title} — ${STATUS_LABEL[article.status]}`}
      className={`cursor-pointer truncate rounded px-1.5 py-0.5 text-[10px] font-[family-name:var(--font-display)] leading-tight select-none transition-opacity hover:opacity-80 active:opacity-60 ${STATUS_CHIP[article.status]}`}
    >
      {article.title}
    </div>
  );
}

// ─── Quick Create Modal ───────────────────────────────────────────────────────

interface QuickCreateModalProps {
  date: Date | null;
  sections: Section[];
  onClose: () => void;
  onCreated: (id: string) => void;
}

function QuickCreateModal({ date, sections, onClose, onCreated }: QuickCreateModalProps) {
  const [title, setTitle] = useState('');
  const [sectionSlug, setSectionSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setSaving(true);
    try {
      // Generate a simple slug from the title
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u0600-\u06FF-]/g, '')
        .substring(0, 80) + '-' + Date.now();

      const result = await createArticle({
        title: title.trim(),
        slug,
        status: 'draft',
        publishedAt: date.toISOString(),
        ...(sectionSlug ? { sectionSlug } : {}),
      });

      if (result.data) {
        toast.success('تم إنشاء المقال بنجاح');
        onCreated(result.data.id);
        router.push(`/admin/articles/${result.data.id}`);
      } else {
        toast.error(result.error ?? 'حدث خطأ أثناء إنشاء المقال');
      }
    } catch {
      toast.error('حدث خطأ أثناء إنشاء المقال');
    } finally {
      setSaving(false);
    }
  }, [title, sectionSlug, date, onCreated, router]);

  if (!date) return null;

  const dateLabel = date.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-midnight border border-gold/20 rounded-2xl shadow-elevated p-6"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
              مقال جديد
            </h2>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mt-0.5">
              {dateLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-1.5">
              عنوان المقال <span className="text-loss">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="أدخل عنوان المقال…"
              required
              autoFocus
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors text-sm"
            />
          </div>

          {/* Section */}
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-1.5">
              القسم
            </label>
            <select
              value={sectionSlug}
              onChange={(e) => setSectionSlug(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="" className="bg-midnight">بدون قسم</option>
              {sections.map((s) => (
                <option key={s.slug} value={s.slug} className="bg-midnight">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date (read-only display) */}
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-1.5">
              تاريخ النشر المبدئي
            </label>
            <div className="w-full bg-white/5 border border-gold/5 rounded-xl py-3 px-4 text-white/60 font-[family-name:var(--font-display)] text-sm">
              {dateLabel}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gold text-ink font-[family-name:var(--font-display)] font-semibold text-sm rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              إنشاء المقال
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-white/5 border border-white/10 text-white/70 hover:text-white font-[family-name:var(--font-display)] text-sm rounded-xl transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

interface HeatmapProps {
  articles: CalendarArticle[];
  today: Date;
}

function PublishingHeatmap({ articles, today }: HeatmapProps) {
  // Build a count map for the last 90 days
  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of articles) {
      const key = toDateKey(new Date(a.date));
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [articles]);

  // Build 13 weeks (91 cells) aligned to today's weekday so the last cell = today
  const cells = useMemo(() => {
    const result: Date[] = [];
    const startDay = addDays(today, -(12 * 7 + today.getDay())); // align to Sunday 13 weeks ago
    for (let i = 0; i < 13 * 7; i++) {
      result.push(addDays(startDay, i));
    }
    return result;
  }, [today]);

  const weeks: Date[][] = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < 13; i++) {
      w.push(cells.slice(i * 7, i * 7 + 7));
    }
    return w;
  }, [cells]);

  function heatColor(count: number): string {
    if (count === 0) return 'bg-white/5';
    if (count === 1) return 'bg-amber-500/20';
    if (count === 2) return 'bg-amber-500/40';
    return 'bg-amber-500';
  }

  return (
    <div dir="ltr" className="flex gap-[3px] overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day) => {
            const key = toDateKey(day);
            const count = countMap[key] ?? 0;
            const isFuture = day > today;
            return (
              <div
                key={key}
                title={`${day.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn')} — ${count} مقال`}
                className={`w-3 h-3 rounded-sm transition-colors ${
                  isFuture ? 'bg-white/[0.03]' : heatColor(count)
                }`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

interface StatsRowProps {
  articles: CalendarArticle[];
  sections: Section[];
  today: Date;
}

function StatsRow({ articles, sections, today }: StatsRowProps) {
  const stats = useMemo(() => {
    const thisWeekStart = weekStart(today);
    const thisWeekEnd = addDays(thisWeekStart, 6);

    const thisWeekArticles = articles.filter((a) => {
      const d = new Date(a.date);
      return d >= thisWeekStart && d <= thisWeekEnd &&
        (a.status === 'published' || a.status === 'scheduled');
    });

    // Average per week over last 4 weeks
    const fourWeeksAgo = addDays(thisWeekStart, -28);
    const last4WeeksArticles = articles.filter((a) => {
      const d = new Date(a.date);
      return d >= fourWeeksAgo && d < thisWeekStart &&
        (a.status === 'published' || a.status === 'scheduled');
    });
    const avgPerWeek = Math.round(last4WeeksArticles.length / 4);

    // Sections with no published/scheduled content this week
    const activeSectionIds = new Set(
      thisWeekArticles.map((a) => a.section).filter(Boolean)
    );
    const sectionsNoContent = sections.filter(
      (s) => !activeSectionIds.has(s.name)
    ).length;

    return { thisWeek: thisWeekArticles.length, avgPerWeek, sectionsNoContent };
  }, [articles, sections, today]);

  const cards = [
    {
      label: 'مقالات هذا الأسبوع',
      value: stats.thisWeek,
      hint: 'منشور + مجدول',
    },
    {
      label: 'متوسط/أسبوع',
      value: stats.avgPerWeek,
      hint: 'آخر 4 أسابيع',
    },
    {
      label: 'أقسام بلا محتوى',
      value: stats.sectionsNoContent,
      hint: 'هذا الأسبوع',
      warn: stats.sectionsNoContent > 0,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-midnight/50 backdrop-blur-sm border rounded-xl p-4 ${
            card.warn ? 'border-red-500/30' : 'border-gold/10'
          }`}
        >
          <p className={`text-2xl font-[family-name:var(--font-display)] font-bold ${
            card.warn ? 'text-red-400' : 'text-gold'
          }`}>
            {card.value}
          </p>
          <p className="text-white font-[family-name:var(--font-display)] text-sm font-semibold mt-1">
            {card.label}
          </p>
          <p className="text-white/40 font-[family-name:var(--font-display)] text-xs mt-0.5">
            {card.hint}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Day Cell ─────────────────────────────────────────────────────────────────

interface DayCellProps {
  date: Date;
  articles: CalendarArticle[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isFutureEmpty: boolean;
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  onClickEmpty: (date: Date) => void;
  onDragStart: (e: React.DragEvent, article: CalendarArticle) => void;
}

function DayCell({
  date,
  articles,
  isCurrentMonth,
  isToday,
  isFutureEmpty,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClickEmpty,
  onDragStart,
}: DayCellProps) {
  const MAX_VISIBLE = 3;
  const visible = articles.slice(0, MAX_VISIBLE);
  const overflow = articles.length - MAX_VISIBLE;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, date)}
      onClick={() => { if (articles.length === 0) onClickEmpty(date); }}
      className={`relative min-h-[100px] p-1.5 border-b border-l border-gold/5 transition-all ${
        !isCurrentMonth ? 'opacity-30' : ''
      } ${dragOver ? 'bg-gold/10 border-gold/30' : ''} ${
        articles.length === 0 && isCurrentMonth ? 'cursor-pointer hover:bg-white/[0.02]' : ''
      } ${isFutureEmpty ? 'ring-1 ring-inset ring-red-500/20' : ''}`}
    >
      {/* Day number */}
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-[family-name:var(--font-display)] font-semibold mb-1 ${
        isToday
          ? 'bg-gold text-ink'
          : isCurrentMonth
            ? 'text-white/70'
            : 'text-white/30'
      }`}>
        {date.getDate()}
      </span>

      {/* Chips */}
      <div className="space-y-0.5">
        {visible.map((a) => (
          <ArticleChip key={a.id} article={a} onDragStart={onDragStart} />
        ))}
        {overflow > 0 && (
          <div className="text-[10px] text-white/40 font-[family-name:var(--font-display)] px-1">
            +{overflow} أخرى
          </div>
        )}
      </div>

      {/* Gap warning tooltip */}
      {isFutureEmpty && (
        <div className="absolute bottom-1 left-1 right-1 pointer-events-none">
          <div className="text-[9px] text-red-400/60 font-[family-name:var(--font-display)] text-center truncate">
            لا مقالات مجدولة
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarClient() {
  const today = useMemo(() => new Date(), []);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');

  // Modal state
  const [modalDate, setModalDate] = useState<Date | null>(null);

  // Drag state
  const draggingRef = useRef<CalendarArticle | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // Fetch sections for filter + modal
  const { data: sectionsData } = useSWR<ApiResponse<Section[]>>(
    sectionsKey(),
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const sections = sectionsData?.data ?? [];

  // Fetch calendar articles for current month view
  const swrKey = viewMode === 'month'
    ? calendarKey(currentYear, currentMonth)
    : (() => {
        const ws = weekStart(weekAnchor);
        const we = addDays(ws, 6);
        return `/api/admin/calendar?start=${ws.toISOString()}&end=${we.toISOString()}`;
      })();

  const { data, isLoading, mutate } = useSWR<ApiResponse<CalendarArticle[]>>(
    swrKey,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // Fetch heatmap data (last 90 days, separate SWR key)
  const { data: heatmapData } = useSWR<ApiResponse<CalendarArticle[]>>(
    heatmapKey(today),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // Build date-keyed article map (filtered by section if needed)
  const articlesByDate = useMemo(() => {
    const map: Record<string, CalendarArticle[]> = {};
    for (const a of (data?.data ?? [])) {
      if (sectionFilter && a.section !== sectionFilter) continue;
      if (statusFilter && a.status !== statusFilter) continue;
      if (authorFilter && a.author !== authorFilter) continue;
      const key = toDateKey(new Date(a.date));
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [data?.data, sectionFilter, statusFilter, authorFilter]);

  // Navigation
  const goToPrevMonth = useCallback(() => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  }, [currentMonth]);

  const goToPrevWeek = useCallback(() => setWeekAnchor(d => addDays(d, -7)), []);
  const goToNextWeek = useCallback(() => setWeekAnchor(d => addDays(d, 7)), []);
  const goToToday = useCallback(() => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setWeekAnchor(today);
  }, [today]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, article: CalendarArticle) => {
    draggingRef.current = article;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(dateKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverKey(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverKey(null);
    const article = draggingRef.current;
    draggingRef.current = null;
    if (!article) return;

    const newISO = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      12, 0, 0
    ).toISOString();

    // Optimistic: mutate local data immediately
    mutate(
      (prev) => {
        if (!prev?.data) return prev;
        return {
          ...prev,
          data: prev.data.map((a) =>
            a.id === article.id ? { ...a, date: newISO } : a
          ),
        };
      },
      { revalidate: false }
    );

    try {
      await updateArticle(article.id, { publishedAt: newISO });
      toast.success('تم تحديث تاريخ النشر');
      mutate();
    } catch {
      toast.error('فشل تحديث التاريخ');
      mutate(); // revert
    }
  }, [mutate]);

  // Quick create
  const handleClickEmpty = useCallback((date: Date) => {
    setModalDate(date);
  }, []);

  const handleCreated = useCallback((_id: string) => {
    setModalDate(null);
    mutate();
  }, [mutate]);

  // Build grid cells
  const gridDays = viewMode === 'month'
    ? buildMonthGrid(currentYear, currentMonth)
    : buildWeekGrid(weekAnchor);

  // Section filter options (unique sections from loaded articles)
  const sectionOptions = useMemo(() => {
    const names = new Set<string>();
    for (const a of (data?.data ?? [])) {
      if (a.section) names.add(a.section);
    }
    return Array.from(names).sort();
  }, [data?.data]);

  // Author filter options (unique authors from loaded articles)
  const authorOptions = useMemo(() => {
    const names = new Set<string>();
    for (const a of (data?.data ?? [])) {
      if (a.author) names.add(a.author);
    }
    return Array.from(names).sort();
  }, [data?.data]);

  // Header label
  const headerLabel = viewMode === 'month'
    ? `${ARABIC_MONTHS[currentMonth]} ${currentYear}`
    : (() => {
        const ws = weekStart(weekAnchor);
        const we = addDays(ws, 6);
        return `${ws.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      })();

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1 flex items-center gap-2">
            <CalendarDays size={22} className="text-gold" />
            التقويم التحريري
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            جدول نشر المقالات وتتبع الفجوات التحريرية
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 border border-gold/10 rounded-xl p-1">
            {(['month', 'week'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] font-semibold transition-all ${
                  viewMode === mode
                    ? 'bg-gold text-ink'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {mode === 'month' ? 'شهري' : 'أسبوعي'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Calendar Card ────────────────────────────────────────── */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gold/10">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={viewMode === 'month' ? goToPrevMonth : goToPrevWeek}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="السابق"
            >
              <ChevronRight size={16} />
            </button>
            <span className="text-white font-[family-name:var(--font-display)] font-semibold text-sm min-w-[140px] text-center">
              {headerLabel}
            </span>
            <button
              onClick={viewMode === 'month' ? goToNextMonth : goToNextWeek}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="التالي"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 font-[family-name:var(--font-display)] rounded-lg transition-colors"
            >
              اليوم
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="bg-white/5 border border-gold/10 rounded-xl py-1.5 px-3 text-white/70 font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="" className="bg-midnight">كل الأقسام</option>
              {sectionOptions.map((name) => (
                <option key={name} value={name} className="bg-midnight">{name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-gold/10 rounded-xl py-1.5 px-3 text-white/70 font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="" className="bg-midnight">كل الحالات</option>
              <option value="published" className="bg-midnight">منشور</option>
              <option value="scheduled" className="bg-midnight">مجدول</option>
              <option value="review" className="bg-midnight">مراجعة</option>
              <option value="draft" className="bg-midnight">مسودة</option>
            </select>

            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="bg-white/5 border border-gold/10 rounded-xl py-1.5 px-3 text-white/70 font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 transition-colors"
            >
              <option value="" className="bg-midnight">كل الكتّاب</option>
              {authorOptions.map((name) => (
                <option key={name} value={name} className="bg-midnight">{name}</option>
              ))}
            </select>

            {isLoading && (
              <Loader2 size={16} className="animate-spin text-gold/50" />
            )}
          </div>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-gold/10">
          {ARABIC_DAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-white/40 text-xs font-[family-name:var(--font-display)] font-semibold"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className={`grid grid-cols-7 ${viewMode === 'week' ? 'min-h-[200px]' : ''}`}>
          {gridDays.map((day) => {
            const key = toDateKey(day);
            const dayArticles = articlesByDate[key] ?? [];
            const isCurrentMonth = viewMode === 'month'
              ? day.getMonth() === currentMonth
              : true;
            const isToday = isSameDay(day, today);
            const isFuture = day > today && isSameDay(day, today) === false;
            const isFutureEmpty = isFuture && isCurrentMonth && dayArticles.length === 0;

            return (
              <DayCell
                key={key}
                date={day}
                articles={dayArticles}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                isFutureEmpty={isFutureEmpty}
                dragOver={dragOverKey === key}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClickEmpty={handleClickEmpty}
                onDragStart={handleDragStart}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-gold/10">
          {(Object.entries(STATUS_CHIP) as [CalendarArticle['status'], string][]).map(([status, cls]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded-sm ${cls}`} />
              <span className="text-white/50 text-xs font-[family-name:var(--font-display)]">
                {STATUS_LABEL[status]}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm ring-1 ring-inset ring-red-500/30" />
            <span className="text-white/50 text-xs font-[family-name:var(--font-display)]">يوم فارغ</span>
          </div>
        </div>
      </div>

      {/* ── Coverage Gap Section ──────────────────────────────────── */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6 space-y-5">
        <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-base flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold inline-block" />
          تحليل تواتر النشر — آخر 90 يوماً
        </h2>

        {/* Day-of-week labels for heatmap */}
        <div dir="ltr" className="flex gap-[3px]">
          {Array.from({ length: 13 }, (_, i) => i).map((wi) => (
            <div key={wi} className="w-3 flex flex-col gap-[3px]">
              {[0, 1, 2, 3, 4, 5, 6].map((di) => {
                // Only show day labels on the first column
                if (wi !== 0) return <div key={di} className="w-3 h-3" />;
                const label = ['ح','ن','ث','ر','خ','ج','س'][di];
                return (
                  <div key={di} className="w-3 h-3 flex items-center justify-center text-[8px] text-white/20 font-[family-name:var(--font-display)]">
                    {label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Actual heatmap */}
        <PublishingHeatmap articles={heatmapData?.data ?? []} today={today} />

        {/* Colour scale */}
        <div dir="ltr" className="flex items-center gap-2 text-xs text-white/30 font-[family-name:var(--font-display)]">
          <span>أقل</span>
          <div className="flex gap-[3px]">
            {['bg-white/5', 'bg-amber-500/20', 'bg-amber-500/40', 'bg-amber-500'].map((c) => (
              <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
          </div>
          <span>أكثر</span>
        </div>

        {/* Stats */}
        <StatsRow articles={heatmapData?.data ?? []} sections={sections} today={today} />
      </div>

      {/* ── Quick Create Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {modalDate && (
          <QuickCreateModal
            date={modalDate}
            sections={sections}
            onClose={() => setModalDate(null)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
