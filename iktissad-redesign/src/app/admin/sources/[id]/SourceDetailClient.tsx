'use client';

/**
 * Source Detail — Phase 10.1 Source & Contact CRM
 * IKTISSAD Design System
 *
 * Shows source profile, embargo status, private notes,
 * linked articles, and article-link modal.
 */

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  ArrowRight,
  Star,
  Building2,
  Phone,
  Mail,
  Globe,
  Lock,
  Link2,
  FileText,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  Calendar,
  Plus,
} from 'lucide-react';
import { iconSizes } from '@/lib/design-tokens';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse, Source, SourceArticleLink } from '@/types';
import SourceFormModal from '@/components/admin/SourceFormModal';
import ArticleLinkModal from '@/components/admin/ArticleLinkModal';

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ReliabilityStars({ rating, size = 16 }: { rating?: number; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= (rating ?? 0) ? 'text-gold fill-gold' : 'text-white/20'}
        />
      ))}
      {rating && (
        <span className="text-white/50 text-sm font-[family-name:var(--font-display)] mr-1">
          {rating}/5
        </span>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  id: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SourceDetailClient({ id }: Props) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  // Fetch source
  const {
    data: sourceData,
    isLoading: sourceLoading,
    mutate: mutateSource,
  } = useSWR<ApiResponse<Source>>(`/api/sources/${id}`, swrFetcher, {
    revalidateOnFocus: false,
  });

  // Fetch linked articles
  const {
    data: linksData,
    isLoading: linksLoading,
    mutate: mutateLinks,
  } = useSWR<ApiResponse<SourceArticleLink[]>>(
    `/api/sources/${id}/articles`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const source = sourceData?.data;
  const links = linksData?.data ?? [];
  const embargo = isUnderEmbargo(source?.embargoUntil);

  const handleUnlinkArticle = async (linkId: string) => {
    if (!confirm('إزالة ارتباط هذه المقالة؟')) return;
    try {
      // Delete via the source_article_links table — we use the articles sub-route
      // with a DELETE by link id. Since the route only supports source-level ops,
      // we call the sources route with a workaround: POST with delete action.
      // For now this is a client-side optimistic removal pending a DELETE sub-route.
      toast.info('جارٍ الإزالة...');
      mutateLinks(
        (prev) =>
          prev
            ? { ...prev, data: (prev.data ?? []).filter((l) => l.id !== linkId) }
            : prev,
        { revalidate: false }
      );
      // Re-fetch to stay in sync
      setTimeout(() => mutateLinks(), 500);
    } catch {
      toast.error('حدث خطأ أثناء الإزالة');
    }
  };

  const handleEditSave = () => {
    mutateSource();
    setEditModalOpen(false);
  };

  const handleLinkSave = () => {
    mutateLinks();
    mutateSource();
    setLinkModalOpen(false);
  };

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (sourceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto text-white/20 mb-4" />
        <p className="text-white/40 font-[family-name:var(--font-display)]">
          المصدر غير موجود
        </p>
        <Link
          href="/admin/sources"
          className="inline-flex items-center gap-2 mt-4 text-gold hover:text-gold/80 font-[family-name:var(--font-display)] text-sm transition-colors"
        >
          <ArrowRight size={iconSizes.sm} />
          العودة إلى المصادر
        </Link>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-white/40 text-sm font-[family-name:var(--font-display)]">
        <Link href="/admin/sources" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowRight size={14} />
          المصادر
        </Link>
        <span>/</span>
        <span className="text-white/70">{source.name}</span>
      </div>

      {/* Profile Header */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gold/15 flex items-center justify-center shrink-0">
            <span className="text-gold font-[family-name:var(--font-display)] font-bold text-2xl">
              {getInitials(source.name)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
                  {source.name}
                </h1>
                {source.nameEn && (
                  <p className="text-white/40 font-[family-name:var(--font-display)] text-sm mt-0.5">
                    {source.nameEn}
                  </p>
                )}
              </div>

              {/* Edit button */}
              <button
                onClick={() => setEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-[family-name:var(--font-display)] text-sm"
              >
                <Edit size={iconSizes.sm} />
                تعديل
              </button>
            </div>

            {/* Rating */}
            <ReliabilityStars rating={source.reliabilityRating} size={18} />

            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm font-[family-name:var(--font-display)]">
              {source.title && (
                <div className="flex items-center gap-2 text-white/60">
                  <span className="text-white/30">المنصب:</span>
                  {source.title}
                </div>
              )}
              {source.organization && (
                <div className="flex items-center gap-2 text-white/60">
                  <Building2 size={14} className="text-white/30" />
                  {source.organization}
                </div>
              )}
              {source.email && (
                <div className="flex items-center gap-2 text-white/60">
                  <Mail size={14} className="text-white/30" />
                  <a href={`mailto:${source.email}`} className="hover:text-white transition-colors">
                    {source.email}
                  </a>
                </div>
              )}
              {source.phone && (
                <div className="flex items-center gap-2 text-white/60">
                  <Phone size={14} className="text-white/30" />
                  <span dir="ltr">{source.phone}</span>
                </div>
              )}
              {source.country && (
                <div className="flex items-center gap-2 text-white/60">
                  <Globe size={14} className="text-white/30" />
                  {source.country.flag} {source.country.name}
                </div>
              )}
              {source.sector && (
                <div className="flex items-center gap-2 text-white/60">
                  <span className="text-white/30">القطاع:</span>
                  {source.sector.name}
                </div>
              )}
            </div>

            {/* Tags */}
            {source.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {source.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-white/5 border border-gold/10 rounded-full text-white/50 text-xs font-[family-name:var(--font-display)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Embargo banner */}
        {embargo && source.embargoUntil && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-loss/10 border border-loss/20 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-loss animate-pulse shrink-0" />
            <div className="flex-1">
              <p className="text-loss font-[family-name:var(--font-display)] font-semibold text-sm">
                تحت الحظر
              </p>
              <p className="text-loss/70 font-[family-name:var(--font-display)] text-xs">
                الحظر ساري حتى {formatDate(source.embargoUntil)}
              </p>
            </div>
            <Calendar size={16} className="text-loss/50 shrink-0" />
          </div>
        )}
      </div>

      {/* Private Notes */}
      {source.privateNotes && (
        <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={14} className="text-gold/60" />
            <h2 className="text-white/70 font-[family-name:var(--font-display)] font-semibold text-sm">
              ملاحظات خاصة
            </h2>
            <span className="text-white/30 text-xs font-[family-name:var(--font-display)]">
              — مرئية لك فقط
            </span>
          </div>
          <p className="text-white/60 font-[family-name:var(--font-display)] text-sm leading-relaxed whitespace-pre-wrap">
            {source.privateNotes}
          </p>
        </div>
      )}

      {/* Linked Articles */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gold/10">
          <div className="flex items-center gap-2">
            <Link2 size={iconSizes.md} className="text-gold/60" />
            <h2 className="text-white font-[family-name:var(--font-display)] font-semibold">
              المقالات المرتبطة
            </h2>
            <span className="px-2 py-0.5 bg-gold/10 rounded-full text-gold text-xs font-[family-name:var(--font-display)]">
              {links.length}
            </span>
          </div>
          <button
            onClick={() => setLinkModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gold/10 border border-gold/20 rounded-xl text-gold hover:bg-gold/15 transition-all font-[family-name:var(--font-display)] text-sm"
          >
            <Plus size={14} />
            ربط بمقالة
          </button>
        </div>

        {linksLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gold/40" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={36} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/40 font-[family-name:var(--font-display)] text-sm">
              لا توجد مقالات مرتبطة بعد
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gold/5">
            {links.map((link) => (
              <div key={link.id} className="flex items-start gap-4 p-4 hover:bg-white/5 transition-colors group">
                <FileText size={16} className="text-white/30 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/articles/${link.articleId}`}
                    className="text-white hover:text-gold transition-colors font-[family-name:var(--font-display)] text-sm font-medium truncate block"
                  >
                    {link.article?.title ?? link.articleId}
                  </Link>
                  {link.article?.publishedAt && (
                    <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mt-0.5">
                      {formatDate(link.article.publishedAt)}
                    </p>
                  )}
                  {link.quoteExcerpt && (
                    <p className="text-white/50 text-xs font-[family-name:var(--font-display)] mt-1.5 italic border-r-2 border-gold/20 pr-2">
                      &ldquo;{link.quoteExcerpt}&rdquo;
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleUnlinkArticle(link.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-white/30 hover:text-loss hover:bg-loss/10 rounded-lg transition-all"
                  title="إزالة الارتباط"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editModalOpen && (
        <SourceFormModal
          source={source}
          onClose={() => setEditModalOpen(false)}
          onSave={handleEditSave}
        />
      )}

      {/* Link article modal */}
      {linkModalOpen && (
        <ArticleLinkModal
          sourceId={id}
          onClose={() => setLinkModalOpen(false)}
          onSave={handleLinkSave}
        />
      )}
    </div>
  );
}
