/**
 * Admin Newsletters List Page — Phase 4.3
 *
 * Shows all newsletters with status, open rate, send date.
 * Fetches from /api/newsletters via SWR.
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Plus,
  Mail,
  Send,
  Eye,
  Calendar,
  Trash2,
  Pencil,
  Loader2,
  MoreVertical,
  Users,
  MousePointerClick,
  FileText,
} from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import { iconSizes } from '@/lib/design-tokens';
import type { Newsletter, ApiResponse } from '@/types';

// ─── Status badge ────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Newsletter['status'],
  { label: string; className: string }
> = {
  draft: {
    label: 'مسودة',
    className: 'bg-zinc-700/40 text-zinc-300 border border-zinc-600/40',
  },
  scheduled: {
    label: 'مجدول',
    className: 'bg-blue-700/20 text-blue-300 border border-blue-600/30',
  },
  sent: {
    label: 'تم الإرسال',
    className: 'bg-green-700/20 text-green-300 border border-green-600/30',
  },
  cancelled: {
    label: 'ملغي',
    className: 'bg-red-700/20 text-red-300 border border-red-600/30',
  },
  partial: {
    label: 'إرسال جزئي',
    className: 'bg-amber-700/20 text-amber-300 border border-amber-600/30',
  },
  failed: {
    label: 'فشل الإرسال',
    className: 'bg-red-700/30 text-red-200 border border-red-600/40',
  },
};

function StatusBadge({ status }: { status: Newsletter['status'] }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-[family-name:var(--font-display)] ${c.className}`}
    >
      {c.label}
    </span>
  );
}

// ─── Open-rate display ───────────────────────────────────────────

function OpenRate({ newsletter }: { newsletter: Newsletter }) {
  if (newsletter.status !== 'sent' || !newsletter.recipientCount) {
    return <span className="text-white/30 text-sm">—</span>;
  }
  const rate =
    newsletter.recipientCount > 0
      ? ((newsletter.openCount / newsletter.recipientCount) * 100).toFixed(1)
      : '0.0';
  return (
    <span className="text-white/70 text-sm font-[family-name:var(--font-display)]">
      {rate}%
    </span>
  );
}

// ─── Page component ──────────────────────────────────────────────

export default function NewslettersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pageSize = 20;

  const swrKey = `/api/newsletters?page=${page}&pageSize=${pageSize}${
    statusFilter !== 'all' ? `&status=${statusFilter}` : ''
  }`;

  const { data, isLoading, mutate } = useSWR<ApiResponse<Newsletter[]>>(
    swrKey,
    swrFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const newsletters = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 1;

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذه النشرة؟')) return;
      try {
        const res = await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'فشل الحذف');
        }
        toast.success('تم حذف النشرة');
        setOpenMenu(null);
        mutate();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'حدث خطأ');
      }
    },
    [mutate]
  );

  const statusTabs = [
    { key: 'all', label: 'الكل' },
    { key: 'draft', label: 'مسودة' },
    { key: 'scheduled', label: 'مجدول' },
    { key: 'sent', label: 'مُرسَل' },
    { key: 'cancelled', label: 'ملغي' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1 flex items-center gap-2">
            <Mail size={24} className="text-gold" />
            النشرات البريدية
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {total} نشرة
          </p>
        </div>
        <Link href="/admin/newsletters/new">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold/80 text-obsidian font-[family-name:var(--font-display)] font-bold rounded-xl hover:shadow-lg hover:shadow-gold/20 transition-all text-sm">
            <Plus size={iconSizes.md} />
            نشرة جديدة
          </button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-[family-name:var(--font-display)] transition-all ${
              statusFilter === tab.key
                ? 'bg-gold text-obsidian font-bold'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
        {isLoading && newsletters.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-gold/50" />
          </div>
        ) : newsletters.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto text-white/10 mb-4" />
            <p className="text-white/40 font-[family-name:var(--font-display)] text-sm">
              لا توجد نشرات بريدية بعد
            </p>
            <Link href="/admin/newsletters/new">
              <button className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-gold/10 text-gold hover:bg-gold/20 rounded-xl transition-colors text-sm font-[family-name:var(--font-display)] mx-auto">
                <Plus size={iconSizes.sm} />
                أنشئ أول نشرة
              </button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 bg-white/5">
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    النشرة
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    الحالة
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold hidden md:table-cell">
                    الجمهور
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold hidden lg:table-cell">
                    معدل الفتح
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold hidden lg:table-cell">
                    النقرات
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold hidden md:table-cell">
                    التاريخ
                  </th>
                  <th className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {newsletters.map((nl, index) => (
                  <motion.tr
                    key={nl.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="border-b border-gold/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/newsletters/${nl.id}`}
                          className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm font-semibold line-clamp-1"
                        >
                          {nl.title}
                        </Link>
                        <p className="text-white/40 text-xs mt-0.5 line-clamp-1">
                          {nl.subject}
                        </p>
                      </div>
                    </td>

                    <td className="p-4">
                      <StatusBadge status={nl.status} />
                    </td>

                    <td className="p-4 hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-white/60 text-sm font-[family-name:var(--font-display)]">
                        <Users size={12} className="text-white/30" />
                        {nl.segment === 'all'
                          ? 'الكل'
                          : nl.segment === 'premium'
                          ? 'المميزون'
                          : 'المجانيون'}
                        {nl.recipientCount != null && (
                          <span className="text-white/30">({nl.recipientCount.toLocaleString()})</span>
                        )}
                      </span>
                    </td>

                    <td className="p-4 hidden lg:table-cell">
                      <span className="flex items-center gap-1.5 text-white/60 text-sm">
                        <Eye size={12} className="text-white/30" />
                        <OpenRate newsletter={nl} />
                      </span>
                    </td>

                    <td className="p-4 hidden lg:table-cell">
                      <span className="flex items-center gap-1.5 text-white/60 text-sm">
                        <MousePointerClick size={12} className="text-white/30" />
                        {nl.status === 'sent' ? nl.clickCount.toLocaleString() : '—'}
                      </span>
                    </td>

                    <td className="p-4 hidden md:table-cell">
                      <span className="text-white/50 text-xs font-[family-name:var(--font-display)] flex items-center gap-1">
                        <Calendar size={12} />
                        {nl.sentAt
                          ? new Date(nl.sentAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn')
                          : nl.scheduledAt
                          ? new Date(nl.scheduledAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn')
                          : new Date(nl.createdAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn')}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === nl.id ? null : nl.id)
                          }
                          className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <MoreVertical size={iconSizes.md} />
                        </button>

                        <AnimatePresence>
                          {openMenu === nl.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute left-0 top-full mt-1 w-44 bg-midnight border border-gold/10 rounded-xl shadow-xl overflow-hidden z-10"
                            >
                              <Link
                                href={`/admin/newsletters/${nl.id}`}
                                className="flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]"
                                onClick={() => setOpenMenu(null)}
                              >
                                <Pencil size={iconSizes.sm} />
                                تحرير
                              </Link>
                              {nl.status !== 'sent' && nl.status !== 'cancelled' && (
                                <button
                                  onClick={async () => {
                                    setOpenMenu(null);
                                    const res = await fetch(
                                      `/api/newsletters/${nl.id}/send`,
                                      { method: 'POST' }
                                    );
                                    if (res.ok) {
                                      toast.success('تم إرسال النشرة');
                                      mutate();
                                    } else {
                                      const err = await res.json();
                                      toast.error(err.error || 'فشل الإرسال');
                                    }
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-[family-name:var(--font-display)]"
                                >
                                  <Send size={iconSizes.sm} />
                                  إرسال الآن
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(nl.id)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-400/10 transition-colors text-sm font-[family-name:var(--font-display)]"
                              >
                                <Trash2 size={iconSizes.sm} />
                                حذف
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gold/10 flex items-center justify-between">
            <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
              {total} نشرة
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors disabled:opacity-30"
              >
                السابق
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors ${
                      p === page
                        ? 'bg-gold text-obsidian font-bold'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors disabled:opacity-30"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
