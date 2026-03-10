'use client';

/**
 * Admin Audit Log Client
 * IKTISSAD Design System
 *
 * Timeline layout with before/after JSON diff, filters, and search.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import useSWR from 'swr';
import {
  FileText,
  BookOpen,
  User,
  CreditCard,
  MessageSquare,
  ChevronDown,
  Search,
  Filter,
  Loader2,
  Clock,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { swrFetcher } from '@/lib/api-client';
import { Button } from '@/components/ui';
import type { ApiResponse } from '@/types';

// ─── Types ───────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function getResourceIcon(type: string) {
  switch (type) {
    case 'article':
      return <FileText size={16} className="text-gold" />;
    case 'magazine':
      return <BookOpen size={16} className="text-blue-400" />;
    case 'user':
      return <User size={16} className="text-profit" />;
    case 'subscriber':
      return <CreditCard size={16} className="text-purple-400" />;
    case 'comment':
      return <MessageSquare size={16} className="text-orange-400" />;
    default:
      return <FileText size={16} className="text-white/50" />;
  }
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    delete_comment: 'حذف تعليق',
    moderate_comment_approved: 'اعتماد تعليق',
    moderate_comment_rejected: 'رفض تعليق',
    moderate_comment_spam: 'تصنيف سبام',
    create_article: 'إنشاء مقالة',
    update_article: 'تعديل مقالة',
    delete_article: 'حذف مقالة',
    create_magazine: 'إنشاء مجلة',
    update_magazine: 'تعديل مجلة',
    delete_magazine: 'حذف مجلة',
    update_subscriber: 'تعديل اشتراك',
    delete_subscriber: 'حذف مشترك',
  };
  return map[action] ?? action;
}

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

// ─── JSON Diff Component ─────────────────────────────────────────

function JsonDiff({
  oldValues,
  newValues,
}: {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}) {
  const { t } = useTranslation();

  if (!oldValues && !newValues) {
    return (
      <p className="text-white/30 text-xs font-[family-name:var(--font-display)] ps-2">
        {t('admin.auditLog.noChanges')}
      </p>
    );
  }

  const allKeys = Array.from(
    new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})])
  );

  return (
    <div className="grid grid-cols-2 gap-4 mt-3">
      <div>
        <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-2 font-semibold uppercase tracking-wide">
          {t('admin.auditLog.before')}
        </p>
        <div className="bg-white/3 rounded-lg p-3 space-y-1.5">
          {allKeys.map((key) => {
            const oldVal = oldValues?.[key];
            const newVal = newValues?.[key];
            const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
            return (
              <div
                key={key}
                className={`flex items-start gap-2 text-xs ${changed ? 'text-loss' : 'text-white/50'}`}
              >
                <span className="text-white/30 shrink-0">{key}:</span>
                <span className="font-mono break-all">{JSON.stringify(oldVal ?? null)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-2 font-semibold uppercase tracking-wide">
          {t('admin.auditLog.after')}
        </p>
        <div className="bg-white/3 rounded-lg p-3 space-y-1.5">
          {allKeys.map((key) => {
            const oldVal = oldValues?.[key];
            const newVal = newValues?.[key];
            const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
            return (
              <div
                key={key}
                className={`flex items-start gap-2 text-xs ${changed ? 'text-gold' : 'text-white/50'}`}
              >
                <span className="text-white/30 shrink-0">{key}:</span>
                <span className="font-mono break-all">{JSON.stringify(newVal ?? null)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Audit Entry Row ─────────────────────────────────────────────

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = !!(entry.old_values || entry.new_values);

  return (
    <div className="flex gap-4">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-obsidian border border-gold/30 flex items-center justify-center shrink-0 mt-1">
          {getResourceIcon(entry.resource_type)}
        </div>
        <div className="flex-1 w-px bg-gold/10 my-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="bg-midnight/60 border border-gold/10 rounded-xl p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Actor */}
              <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold shrink-0">
                {(entry.actor_email ?? '?').charAt(0).toUpperCase()}
              </div>
              <span className="text-white/60 text-sm font-[family-name:var(--font-display)]">
                {entry.actor_email ?? 'System'}
              </span>
              <span className="text-white/30 text-xs">—</span>
              <span className="text-white font-[family-name:var(--font-display)] text-sm font-semibold">
                {formatAction(entry.action)}
              </span>
              {entry.resource_id && (
                <span className="text-white/30 text-xs font-mono">
                  #{entry.resource_id.slice(0, 8)}
                </span>
              )}
            </div>

            {/* Timestamp */}
            <span
              className="text-white/30 text-xs font-[family-name:var(--font-display)] shrink-0 flex items-center gap-1"
              title={new Date(entry.created_at).toLocaleString('ar-SA')}
            >
              <Clock size={11} />
              {relativeTime(entry.created_at)}
            </span>
          </div>

          {/* Expand diff button */}
          {hasChanges && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 flex items-center gap-1.5 text-white/40 hover:text-gold text-xs font-[family-name:var(--font-display)] transition-colors"
            >
              <ChevronDown
                size={12}
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
              {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل (قبل / بعد)'}
            </button>
          )}

          {/* Diff panel */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <JsonDiff oldValues={entry.old_values} newValues={entry.new_values} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

const RESOURCE_TYPES = ['article', 'magazine', 'user', 'subscriber', 'comment'];
const ACTION_TYPES = [
  'create_article', 'update_article', 'delete_article',
  'create_magazine', 'update_magazine', 'delete_magazine',
  'moderate_comment_approved', 'moderate_comment_rejected', 'delete_comment',
  'update_subscriber', 'delete_subscriber',
];

export default function AuditLogClient() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const buildKey = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (filterAction) params.set('action', filterAction);
    if (filterResourceType) params.set('resource_type', filterResourceType);
    if (filterDateFrom) params.set('date_from', filterDateFrom);
    if (filterDateTo) params.set('date_to', filterDateTo);
    return `/api/admin/audit-log?${params.toString()}`;
  }, [page, search, filterAction, filterResourceType, filterDateFrom, filterDateTo]);

  const { data, isLoading } = useSWR<ApiResponse<AuditEntry[]>>(
    buildKey(),
    swrFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const entries = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
          {t('admin.auditLog.title')}
        </h1>
        <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
          {pagination?.total ?? 0} {t('admin.auditLog.totalEntries')}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={t('admin.auditLog.searchPlaceholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 rounded-xl border transition-all text-sm font-[family-name:var(--font-display)] ${
              showFilters
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-white/5 border-gold/10 text-white/70 hover:text-white'
            }`}
          >
            <Filter size={iconSizes.md} />
            {t('admin.auditLog.filters')}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-gold/10 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    {t('admin.auditLog.filterAction')}
                  </label>
                  <select
                    value={filterAction}
                    onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    <option value="" className="bg-midnight">كل الإجراءات</option>
                    {ACTION_TYPES.map((a) => (
                      <option key={a} value={a} className="bg-midnight">{formatAction(a)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    {t('admin.auditLog.filterResourceType')}
                  </label>
                  <select
                    value={filterResourceType}
                    onChange={(e) => { setFilterResourceType(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  >
                    <option value="" className="bg-midnight">كل الأنواع</option>
                    {RESOURCE_TYPES.map((r) => (
                      <option key={r} value={r} className="bg-midnight">{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    {t('admin.auditLog.dateFrom')}
                  </label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                    {t('admin.auditLog.dateTo')}
                  </label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Timeline */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
        {isLoading && entries.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-gold/50" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 font-[family-name:var(--font-display)]">
              {t('admin.auditLog.empty')}
            </p>
          </div>
        ) : (
          <div>
            {entries.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {/* Load More */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-gold/10">
            <span className="text-white/40 text-sm font-[family-name:var(--font-display)]">
              {t('admin.articles.pagination.showing', {
                from: (page - 1) * 20 + 1,
                to: Math.min(page * 20, pagination?.total ?? 0),
                total: pagination?.total ?? 0,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('admin.articles.pagination.previous')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                {t('admin.articles.pagination.next')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
