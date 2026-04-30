'use client';

/**
 * Free-tier newsletter subscribers — distinct from /admin/subscribers
 * which manages paid `subscribers`. This view backs the
 * `newsletter_subscribers` table populated by the public footer signup.
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
  UserCheck,
  UserX,
  Download,
} from 'lucide-react';
import { useFormatters } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { NewsletterSubscriber } from '@/app/api/admin/newsletter-subscribers/route';

type StatusFilter = '' | 'active' | 'unsubscribed';

export default function NewsletterSubscribersClient() {
  const { fmtDate, fmtNumber } = useFormatters();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);

  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    params.set('page', String(page));
    params.set('limit', '25');
    return `/api/admin/newsletter-subscribers?${params.toString()}`;
  }, [search, statusFilter, page]);

  const { data, isLoading, mutate } = useSWR<ApiResponse<NewsletterSubscriber[]>>(
    swrKey,
    swrFetcher,
    { revalidateOnFocus: false },
  );

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  const handleToggle = async (id: string, current: 'active' | 'unsubscribed') => {
    const next = current === 'active' ? 'unsubscribed' : 'active';
    try {
      const res = await fetch(`/api/admin/newsletter-subscribers/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next === 'active' ? 'تم التفعيل' : 'تم إلغاء الاشتراك');
      mutate();
    } catch {
      toast.error('فشلت العملية');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف نهائي للمشترك (لا يمكن التراجع)؟')) return;
    try {
      const res = await fetch(`/api/admin/newsletter-subscribers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('تم الحذف');
      mutate();
    } catch {
      toast.error('فشل الحذف');
    }
  };

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = 'email,status,subscribed_at\n';
    const lines = rows
      .map((r) => `${r.email},${r.status},${r.subscribedAt}`)
      .join('\n');
    const blob = new Blob([header + lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            المشتركون في النشرة الإخبارية
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {fmtNumber(pagination?.total ?? 0)} مشترك في القائمة المجانية
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 text-white/80 rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Download size={iconSizes.sm} />
          تصدير CSV (الصفحة الحالية)
        </button>
      </div>

      {/* Filters */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="ابحث بالبريد الإلكتروني..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            dir="ltr"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
          className="bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 min-w-[180px]"
        >
          <option value="" className="bg-midnight">كل الحالات</option>
          <option value="active" className="bg-midnight">مفعّل</option>
          <option value="unsubscribed" className="bg-midnight">ملغى</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-gold animate-spin" size={32} />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20">
          <Mail size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40 font-[family-name:var(--font-display)] text-lg">
            لا يوجد مشتركون
          </p>
        </div>
      ) : (
        <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm font-[family-name:var(--font-display)]">
            <thead className="bg-white/5 border-b border-gold/10 text-white/50 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-start px-4 py-3 font-semibold">البريد الإلكتروني</th>
                <th className="text-start px-4 py-3 font-semibold">الحالة</th>
                <th className="text-start px-4 py-3 font-semibold">تاريخ الاشتراك</th>
                <th className="text-end px-4 py-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gold/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white" dir="ltr">{r.email}</td>
                  <td className="px-4 py-3">
                    {r.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gain/15 border border-gain/30 rounded-full text-gain text-xs">
                        <UserCheck size={11} />
                        مفعّل
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-full text-white/50 text-xs">
                        <UserX size={11} />
                        ملغى
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">
                    {fmtDate(r.subscribedAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleToggle(r.id, r.status)}
                        className="px-3 py-1 text-xs text-white/60 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                      >
                        {r.status === 'active' ? 'إلغاء الاشتراك' : 'إعادة التفعيل'}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-2 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                        title="حذف نهائي"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
    </div>
  );
}
