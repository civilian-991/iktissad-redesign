'use client';

/**
 * Contact Submissions — read-only inbox for the public /contact form.
 * IKTISSAD admin design system.
 */

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Mail,
  Search,
  Trash2,
  RefreshCw,
  Loader2,
  Inbox,
  X,
} from 'lucide-react';
import { useFormatters } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { swrFetcher, deleteContactSubmission } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { ContactSubmission } from '@/app/api/admin/contact-submissions/route';

export default function ContactSubmissionsClient() {
  const { fmtDate } = useFormatters();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);

  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', '20');
    return `/api/admin/contact-submissions?${params.toString()}`;
  }, [search, page]);

  const { data, isLoading, mutate } = useSWR<ApiResponse<ContactSubmission[]>>(
    swrKey,
    swrFetcher,
    { revalidateOnFocus: false },
  );

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    try {
      await deleteContactSubmission(id);
      toast.success('تم الحذف');
      if (selected?.id === id) setSelected(null);
      mutate();
    } catch {
      toast.error('فشل الحذف');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            رسائل التواصل
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {pagination?.total ?? 0} رسالة من نموذج التواصل
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث بالاسم، البريد، الموضوع، أو نص الرسالة..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-gold animate-spin" size={32} />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20">
          <Inbox size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40 font-[family-name:var(--font-display)] text-lg">
            لا توجد رسائل
          </p>
        </div>
      ) : (
        <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm font-[family-name:var(--font-display)]">
            <thead className="bg-white/5 border-b border-gold/10 text-white/50 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-start px-4 py-3 font-semibold">المرسل</th>
                <th className="text-start px-4 py-3 font-semibold">الموضوع</th>
                <th className="text-start px-4 py-3 font-semibold">التاريخ</th>
                <th className="text-end px-4 py-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gold/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelected(r)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">
                        <Mail size={14} className="text-gold" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{r.name}</p>
                        <p className="text-white/40 text-xs truncate" dir="ltr">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/70 truncate max-w-xs">{r.subject}</td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                    {fmtDate(r.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                      className="p-2 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-white/40 text-sm font-[family-name:var(--font-display)]">
            صفحة {page} من {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white/5 border border-gold/10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-[family-name:var(--font-display)] text-sm"
            >
              السابق
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 bg-white/5 border border-gold/10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-[family-name:var(--font-display)] text-sm"
            >
              التالي
            </button>
          </div>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs font-[family-name:var(--font-display)] transition-colors"
          >
            <RefreshCw size={12} />
            تحديث
          </button>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-midnight border border-gold/20 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-midnight/95 backdrop-blur-md border-b border-gold/10 p-4 flex items-center justify-between">
              <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
                {selected.subject}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 font-[family-name:var(--font-display)]">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/40 mb-1 text-xs">الاسم</p>
                  <p className="text-white">{selected.name}</p>
                </div>
                <div>
                  <p className="text-white/40 mb-1 text-xs">البريد</p>
                  <p className="text-white" dir="ltr">{selected.email}</p>
                </div>
                <div>
                  <p className="text-white/40 mb-1 text-xs">التاريخ</p>
                  <p className="text-white text-sm">
                    {fmtDate(selected.createdAt, {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {selected.ip && (
                  <div>
                    <p className="text-white/40 mb-1 text-xs">IP</p>
                    <p className="text-white/70 text-xs" dir="ltr">{selected.ip}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-white/40 mb-2 text-xs">الرسالة</p>
                <div className="bg-white/5 border border-gold/10 rounded-xl p-4 text-white/80 text-sm whitespace-pre-wrap leading-relaxed">
                  {selected.message}
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-gold/10">
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-ink rounded-lg font-semibold text-sm hover:bg-gold/90 transition-colors"
                >
                  <Mail size={14} />
                  الرد عبر البريد
                </a>
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-loss/15 border border-loss/30 text-loss rounded-lg font-semibold text-sm hover:bg-loss/25 transition-colors"
                >
                  <Trash2 size={14} />
                  حذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
