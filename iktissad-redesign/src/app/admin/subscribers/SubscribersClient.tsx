'use client';

/**
 * Subscribers List — TanStack Table v8 + Virtual Scroll
 * IKTISSAD Design System
 *
 * Handles 100k+ rows via @tanstack/react-virtual.
 * Client-side sort, search, filter, bulk actions, CSV/Excel export.
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import useSWR from 'swr';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
  Loader2,
  UserX,
  RefreshCw,
} from 'lucide-react';
import Papa from 'papaparse';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { swrFetcher, subscribersKey, updateSubscriber } from '@/lib/api-client';
import type { Subscriber, SubscriptionPlan, ApiResponse } from '@/lib/api-client';
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function relativeDate(
  dateStr: string,
  labels: { today: string; yesterday: string; daysAgo: string; monthsAgo: string; yearsAgo: string }
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;
  if (diffDays < 30) return labels.daysAgo.replace('{count}', diffDays.toLocaleString('ar-SA-u-ca-gregory'));
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return labels.monthsAgo.replace('{count}', diffMonths.toLocaleString('ar-SA-u-ca-gregory'));
  const diffYears = Math.floor(diffMonths / 12);
  return labels.yearsAgo.replace('{count}', diffYears.toLocaleString('ar-SA-u-ca-gregory'));
}

// ─── Badge configs ────────────────────────────────────────────

const PLAN_CLS: Record<string, string> = {
  free:    'bg-white/10 text-white/60',
  digital: 'bg-blue/20 text-blue-300',
  premium: 'bg-gold/20 text-gold',
};

const STATUS_CLS: Record<string, string> = {
  active:    'bg-profit/15 text-profit',
  trialing:  'bg-yellow-500/15 text-yellow-400',
  past_due:  'bg-orange-500/15 text-orange-400',
  canceled:  'bg-loss/15 text-loss',
  paused:    'bg-white/10 text-white/50',
  incomplete:'bg-white/10 text-white/40',
};

// ─── Row skeleton ─────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gold/5">
      <div className="w-4 h-4 bg-white/10 rounded animate-pulse" />
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
        <div className="space-y-1.5">
          <div className="w-32 h-3 bg-white/10 rounded animate-pulse" />
          <div className="w-44 h-2.5 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
      <div className="w-16 h-5 bg-white/10 rounded animate-pulse" />
      <div className="w-16 h-5 bg-white/10 rounded animate-pulse" />
      <div className="w-20 h-3 bg-white/10 rounded animate-pulse" />
      <div className="w-20 h-3 bg-white/10 rounded animate-pulse" />
      <div className="w-8 h-8 bg-white/10 rounded animate-pulse" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const columnHelper = createColumnHelper<Subscriber>();

export default function SubscribersClient() {
  const { t } = useTranslation();

  // ─── State ────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Data: load all into memory for virtual scroll ────────
  const { data, isLoading, mutate } = useSWR<ApiResponse<Subscriber[]>>(
    subscribersKey({ pageSize: 10000 }),
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // Plans for display
  const { data: plansData } = useSWR<ApiResponse<SubscriptionPlan[]>>(
    '/api/subscription-plans',
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const plans = plansData?.data ?? [];

  // ─── Client-side filtering ────────────────────────────────
  const filtered = useMemo(() => {
    let rows = data?.data ?? [];

    if (globalFilter) {
      const q = globalFilter.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          (r.name?.toLowerCase() ?? '').includes(q)
      );
    }
    if (statusFilter) {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (planFilter) {
      rows = rows.filter((r) => r.planId === planFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      rows = rows.filter((r) => new Date(r.createdAt).getTime() <= to);
    }
    return rows;
  }, [data, globalFilter, statusFilter, planFilter, dateFrom, dateTo]);

  // ─── Columns ──────────────────────────────────────────────
  const columns = useMemo(
    () => [
      // Checkbox
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="w-4 h-4 rounded border-gold/30 bg-transparent accent-gold cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 rounded border-gold/30 bg-transparent accent-gold cursor-pointer"
          />
        ),
        size: 48,
        enableSorting: false,
      }),

      // Subscriber
      columnHelper.accessor('name', {
        id: 'subscriber',
        header: () => t('admin.subscribers.columns.subscriber'),
        cell: ({ row }) => {
          const s = row.original;
          const initials = getInitials(s.name, s.email);
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                <span className="text-gold text-xs font-bold font-[family-name:var(--font-display)]">
                  {initials}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-[family-name:var(--font-display)] font-medium truncate">
                  {s.name ?? '—'}
                </p>
                <p className="text-white/40 text-xs truncate">{s.email}</p>
              </div>
            </div>
          );
        },
        size: 260,
      }),

      // Plan
      columnHelper.accessor('planId', {
        id: 'plan',
        header: () => t('admin.subscribers.columns.plan'),
        cell: ({ row }) => {
          const plan = plans.find((p) => p.id === row.original.planId);
          const label = plan?.nameAr ?? t('admin.subscribers.statuses.incomplete');
          const slug = plan?.nameAr?.includes('مميز') || plan?.nameAr?.toLowerCase().includes('premium')
            ? 'premium'
            : plan?.nameAr?.includes('رقمي') || plan?.nameAr?.toLowerCase().includes('digital')
            ? 'digital'
            : 'free';
          const cls = PLAN_CLS[slug] ?? PLAN_CLS.free;
          return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-[family-name:var(--font-display)] ${cls}`}>
              {label}
            </span>
          );
        },
        size: 120,
      }),

      // Status
      columnHelper.accessor('status', {
        header: () => t('admin.subscribers.columns.status'),
        cell: ({ getValue }) => {
          const status = getValue();
          const cls = STATUS_CLS[status] ?? STATUS_CLS.incomplete;
          const label = t(`admin.subscribers.statuses.${status}` as Parameters<typeof t>[0]) || status;
          return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-[family-name:var(--font-display)] ${cls}`}>
              {label}
            </span>
          );
        },
        size: 120,
      }),

      // MRR
      columnHelper.display({
        id: 'mrr',
        header: () => t('admin.subscribers.columns.mrr'),
        cell: ({ row }) => {
          const plan = plans.find((p) => p.id === row.original.planId);
          const amount = plan?.priceMonthly ?? 0;
          return (
            <span className="text-white/70 text-sm font-[family-name:var(--font-display)]">
              {amount > 0
                ? `${amount.toLocaleString('ar-SA-u-ca-gregory')} ${t('admin.subscribers.profile.currency')}`
                : '—'}
            </span>
          );
        },
        size: 110,
        enableSorting: false,
      }),

      // Join Date
      columnHelper.accessor('createdAt', {
        id: 'joinDate',
        header: () => t('admin.subscribers.columns.joinDate'),
        cell: ({ getValue }) => (
          <span className="text-white/50 text-xs font-[family-name:var(--font-display)]">
            {relativeDate(getValue(), {
              today: t('admin.subscribers.today'),
              yesterday: t('admin.subscribers.yesterday'),
              daysAgo: t('admin.subscribers.daysAgo'),
              monthsAgo: t('admin.subscribers.monthsAgo'),
              yearsAgo: t('admin.subscribers.yearsAgo'),
            })}
          </span>
        ),
        size: 130,
      }),

      // Actions
      columnHelper.display({
        id: 'actions',
        header: () => t('admin.subscribers.columns.actions'),
        cell: ({ row }) => (
          <Link
            href={`/admin/subscribers/${row.original.id}`}
            className="flex items-center gap-1 text-gold/70 hover:text-gold transition-colors text-sm font-[family-name:var(--font-display)]"
          >
            <ExternalLink size={iconSizes.sm} />
            <span>{t('admin.subscribers.view')}</span>
          </Link>
        ),
        size: 80,
        enableSorting: false,
      }),
    ],
    [t, plans]
  );

  // ─── Table ────────────────────────────────────────────────
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  // ─── Virtualizer ──────────────────────────────────────────
  const parentRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  const selectedIds = Object.keys(rowSelection);
  const selectedRows = filtered.filter((r) => rowSelection[r.id]);

  // ─── CSV Export ───────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    const toExport = selectedRows.length > 0 ? selectedRows : filtered;
    const csv = Papa.unparse(
      toExport.map((s) => {
        const plan = plans.find((p) => p.id === s.planId);
        return {
          الاسم: s.name ?? '',
          'البريد الإلكتروني': s.email,
          الخطة: plan?.nameAr ?? 'مجاني',
          الحالة: STATUS_CLS[s.status] ? (t(`admin.subscribers.statuses.${s.status}` as Parameters<typeof t>[0]) || s.status) : s.status,
          'تاريخ الانضمام': new Date(s.createdAt).toLocaleDateString('ar-SA-u-ca-gregory'),
        };
      })
    );
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subscribers.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('admin.subscribers.exportCsvSuccess'));
  }, [selectedRows, filtered, plans]);

  // ─── Excel Export ─────────────────────────────────────────
  const handleExportExcel = useCallback(() => {
    const url = '/api/admin/export/subscribers';
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subscribers.xlsx';
    link.click();
    toast.success(t('admin.subscribers.exportExcelSuccess'));
  }, []);

  // ─── Bulk Suspend ─────────────────────────────────────────
  const handleBulkSuspend = useCallback(async () => {
    try {
      await Promise.all(
        selectedIds.map((id) => updateSubscriber(id, { status: 'paused' }))
      );
      toast.success(t('admin.subscribers.bulkSuspendSuccess').replace('{count}', selectedIds.length.toLocaleString('ar-SA-u-ca-gregory')));
      setRowSelection({});
      mutate();
    } catch {
      toast.error(t('admin.subscribers.bulkSuspendError'));
    }
  }, [selectedIds, mutate]);

  // ─── Sort icon ────────────────────────────────────────────
  function SortIcon({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc' } }) {
    const sorted = column.getIsSorted();
    if (sorted === 'asc') return <ChevronUp size={12} className="text-gold" />;
    if (sorted === 'desc') return <ChevronDown size={12} className="text-gold" />;
    return <ChevronsUpDown size={12} className="text-white/30" />;
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.subscribers.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {t('admin.subscribers.totalCount').replace('{count}', filtered.length.toLocaleString('ar-SA-u-ca-gregory'))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm"
          >
            <FileSpreadsheet size={iconSizes.md} />
            {t('admin.subscribers.exportExcel')}
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={t('admin.subscribers.searchPlaceholder')}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 ps-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-all font-[family-name:var(--font-display)] text-sm ${
              showFilters
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-white/5 border-gold/10 text-white/70 hover:text-white'
            }`}
          >
            <Filter size={iconSizes.md} />
            {t('admin.subscribers.filters')}
            <ChevronDown size={iconSizes.sm} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="pt-4 border-t border-gold/10 grid md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                {t('admin.subscribers.filterStatus')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
              >
                <option value="" className="bg-midnight">{t('admin.subscribers.allStatuses')}</option>
                {Object.keys(STATUS_CLS).map((key) => (
                  <option key={key} value={key} className="bg-midnight">
                    {t(`admin.subscribers.statuses.${key}` as Parameters<typeof t>[0]) || key}
                  </option>
                ))}
              </select>
            </div>

            {/* Plan Filter */}
            <div>
              <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                {t('admin.subscribers.filterPlan')}
              </label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
              >
                <option value="" className="bg-midnight">{t('admin.subscribers.allPlans')}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id} className="bg-midnight">{p.nameAr}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                {t('admin.subscribers.dateFrom')}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                {t('admin.subscribers.dateTo')}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-gold/10 border border-gold/20 rounded-xl p-4 flex items-center justify-between">
          <span className="text-gold font-[family-name:var(--font-display)] text-sm">
            {t('admin.subscribers.selected', { count: selectedIds.length.toLocaleString('ar-SA-u-ca-gregory') })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-white text-sm font-[family-name:var(--font-display)] transition-colors"
            >
              <Download size={iconSizes.sm} />
              {t('admin.subscribers.bulkExport')}
            </button>
            <button
              onClick={handleBulkSuspend}
              className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg text-orange-400 text-sm font-[family-name:var(--font-display)] transition-colors"
            >
              <UserX size={iconSizes.sm} />
              {t('admin.subscribers.bulkSuspend')}
            </button>
            <button
              onClick={() => setRowSelection({})}
              className="px-3 py-2 text-white/50 hover:text-white text-sm font-[family-name:var(--font-display)] transition-colors"
            >
              {t('admin.subscribers.deselect')}
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <SectionErrorBoundary section="subscribers-table">
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
        {/* Sticky Header */}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 800 }}>
            <thead className="sticky top-0 z-10 bg-obsidian border-b border-gold/10">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold select-none"
                    >
                      {header.column.getCanSort() ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon column={header.column as Parameters<typeof SortIcon>[0]['column']} />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
          </table>
        </div>

        {/* Virtualized Body */}
        {isLoading ? (
          <div className="divide-y divide-gold/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 font-[family-name:var(--font-display)]">
              {t('admin.subscribers.empty')}
            </p>
          </div>
        ) : (
          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ height: Math.min(filtered.length * 60 + 4, 600) }}
          >
            <div
              style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
            >
              {virtualizer.getVirtualItems().map((vRow) => {
                const row = rows[vRow.index];
                return (
                  <div
                    key={row.id}
                    data-index={vRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      transform: `translateY(${vRow.start}px)`,
                      width: '100%',
                    }}
                    className={`flex items-center border-b border-gold/5 hover:bg-white/5 transition-colors ${
                      row.getIsSelected() ? 'bg-gold/5' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div
                        key={cell.id}
                        style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                        className="px-4 py-3 shrink-0"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gold/10 flex items-center justify-between">
            <span className="text-white/40 text-xs font-[family-name:var(--font-display)]">
              {t('admin.subscribers.totalCount').replace('{count}', filtered.length.toLocaleString('ar-SA-u-ca-gregory'))}
            </span>
            <button
              onClick={() => mutate()}
              className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs font-[family-name:var(--font-display)] transition-colors"
            >
              <RefreshCw size={12} />
              {t('admin.subscribers.refresh')}
            </button>
          </div>
        )}
      </div>
      </SectionErrorBoundary>
    </div>
  );
}
