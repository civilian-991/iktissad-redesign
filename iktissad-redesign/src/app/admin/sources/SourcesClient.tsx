'use client';

/**
 * Sources List — Phase 10.1 Source & Contact CRM
 * IKTISSAD Design System
 *
 * Card grid of journalist sources with search, sector/country filters,
 * reliability stars, embargo badges, and a modal-based create flow.
 */

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Users2,
  Search,
  Filter,
  ChevronDown,
  Plus,
  Star,
  RefreshCw,
  Building2,
  Phone,
  Mail,
  FileText,
  Trash2,
  Edit,
  Loader2,
} from 'lucide-react';
import { iconSizes } from '@/lib/design-tokens';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse, Source } from '@/types';
import SourceFormModal from '@/components/admin/SourceFormModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function isUnderEmbargo(embargoUntil?: string): boolean {
  if (!embargoUntil) return false;
  return new Date(embargoUntil) > new Date();
}

function ReliabilityStars({ rating }: { rating?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= (rating ?? 0) ? 'text-gold fill-gold' : 'text-white/20'}
        />
      ))}
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-midnight/50 border border-gold/10 rounded-xl p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-white/10 rounded w-2/3" />
          <div className="h-2.5 bg-white/5 rounded w-1/2" />
        </div>
      </div>
      <div className="h-2 bg-white/5 rounded w-full" />
      <div className="h-2 bg-white/5 rounded w-3/4" />
    </div>
  );
}

// ─── Source Card ─────────────────────────────────────────────────────────────

interface SourceCardProps {
  source: Source;
  onEdit: (source: Source) => void;
  onDelete: (id: string) => void;
}

function SourceCard({ source, onEdit, onDelete }: SourceCardProps) {
  const embargo = isUnderEmbargo(source.embargoUntil);

  return (
    <div className="group bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5 hover:border-gold/25 transition-all space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
          <span className="text-gold font-[family-name:var(--font-display)] font-bold text-sm">
            {getInitials(source.name)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-white font-[family-name:var(--font-display)] font-semibold text-sm truncate">
                {source.name}
              </p>
              {source.nameEn && (
                <p className="text-white/40 text-xs font-[family-name:var(--font-display)] truncate">
                  {source.nameEn}
                </p>
              )}
            </div>
            {/* Action buttons — visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => onEdit(source)}
                className="p-1.5 text-white/40 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                title="تعديل"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => onDelete(source.id)}
                className="p-1.5 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                title="حذف"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Stars */}
          <div className="mt-1">
            <ReliabilityStars rating={source.reliabilityRating} />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-1.5 text-xs font-[family-name:var(--font-display)]">
        {source.title && (
          <p className="text-white/60 truncate">{source.title}</p>
        )}
        {source.organization && (
          <div className="flex items-center gap-1.5 text-white/50">
            <Building2 size={11} />
            <span className="truncate">{source.organization}</span>
          </div>
        )}
        {source.phone && (
          <div className="flex items-center gap-1.5 text-white/40">
            <Phone size={11} />
            <span dir="ltr">{source.phone}</span>
          </div>
        )}
        {source.email && (
          <div className="flex items-center gap-1.5 text-white/40">
            <Mail size={11} />
            <span className="truncate">{source.email}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {source.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {source.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-white/5 border border-gold/10 rounded-full text-white/50 text-xs font-[family-name:var(--font-display)]"
            >
              {tag}
            </span>
          ))}
          {source.tags.length > 4 && (
            <span className="px-2 py-0.5 text-white/30 text-xs font-[family-name:var(--font-display)]">
              +{source.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gold/5">
        {/* Embargo badge */}
        {embargo ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-loss/15 border border-loss/20 rounded-lg text-loss text-xs font-[family-name:var(--font-display)]">
            <span className="w-1.5 h-1.5 rounded-full bg-loss animate-pulse" />
            تحت الحظر
          </span>
        ) : (
          <span />
        )}

        {/* Article count */}
        {(source.articleCount ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-white/40 text-xs font-[family-name:var(--font-display)]">
            <FileText size={11} />
            <span>{source.articleCount} مقالة</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SourcesClient() {
  const [search, setSearch] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [countryId, setCountryId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  // Build SWR key
  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sectorId) params.set('sector_id', sectorId);
    if (countryId) params.set('country_id', countryId);
    params.set('page', String(page));
    params.set('limit', '24');
    return `/api/sources?${params.toString()}`;
  }, [search, sectorId, countryId, page]);

  const { data, isLoading, mutate } = useSWR<ApiResponse<Source[]>>(
    swrKey,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // Sectors & countries for filters
  const { data: sectorsData } = useSWR<ApiResponse<Array<{ id: string; name: string }>>>(
    '/api/sectors',
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const { data: countriesData } = useSWR<ApiResponse<Array<{ id: string; name: string }>>>(
    '/api/countries',
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const sources = data?.data ?? [];
  const pagination = data?.pagination;
  const sectors = sectorsData?.data ?? [];
  const countries = countriesData?.data ?? [];

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصدر؟')) return;
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل الحذف');
      toast.success('تم حذف المصدر');
      mutate();
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleEdit = (source: Source) => {
    setEditingSource(source);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingSource(null);
  };

  const handleModalSave = () => {
    mutate();
    handleModalClose();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            المصادر الصحفية
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {pagination?.total ?? 0} مصدر في قاعدة البيانات
          </p>
        </div>
        <button
          onClick={() => { setEditingSource(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/90 transition-colors"
        >
          <Plus size={iconSizes.md} />
          مصدر جديد
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="ابحث بالاسم أو المنظمة أو البريد..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-all font-[family-name:var(--font-display)] text-sm ${
              showFilters || sectorId || countryId
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-white/5 border-gold/10 text-white/70 hover:text-white'
            }`}
          >
            <Filter size={iconSizes.md} />
            تصفية
            <ChevronDown
              size={iconSizes.sm}
              className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {showFilters && (
          <div className="pt-4 border-t border-gold/10 grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                القطاع
              </label>
              <select
                value={sectorId}
                onChange={(e) => { setSectorId(e.target.value); setPage(1); }}
                className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
              >
                <option value="" className="bg-midnight">جميع القطاعات</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id} className="bg-midnight">{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
                الدولة
              </label>
              <select
                value={countryId}
                onChange={(e) => { setCountryId(e.target.value); setPage(1); }}
                className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
              >
                <option value="" className="bg-midnight">جميع الدول</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id} className="bg-midnight">{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-20">
          <Users2 size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40 font-[family-name:var(--font-display)] text-lg mb-2">
            لا توجد مصادر
          </p>
          <p className="text-white/25 font-[family-name:var(--font-display)] text-sm">
            أضف أول مصدر صحفي إلى قاعدة البيانات
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <SourceFormModal
          source={editingSource}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
