'use client';

/**
 * Admin Promo Codes Page
 * IKTISSAD Design System
 */

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Tag,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { swrFetcher, promoCodesKey, updatePromoCode, deletePromoCode } from '@/lib/api-client';
import type { PromoCode, ApiResponse } from '@/lib/api-client';

export default function PromoCodesPage() {
  const { t } = useTranslation();
  const [activeOnly, setActiveOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const swrKey = promoCodesKey(activeOnly ? { isActive: true } : {});
  const { data, isLoading, mutate } = useSWR<ApiResponse<PromoCode[]>>(swrKey, swrFetcher, {
    revalidateOnFocus: false,
  });
  const promoCodes = data?.data ?? [];

  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success(t('admin.promoCodes.copied'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = async (promo: PromoCode) => {
    try {
      await updatePromoCode(promo.id, { isActive: !promo.isActive });
      toast.success(promo.isActive ? 'تم تعطيل الكوبون' : 'تم تفعيل الكوبون');
      mutate();
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    try {
      await deletePromoCode(id);
      toast.success('تم حذف الكوبون');
      mutate();
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const formatDiscount = (promo: PromoCode) => {
    if (promo.discountType === 'percent') {
      return `${promo.discountValue.toLocaleString('ar-SA-u-ca-gregory-nu-latn')}%`;
    }
    return `${promo.discountValue.toLocaleString('ar-SA-u-ca-gregory-nu-latn')} ر.س`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.promoCodes.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {promoCodes.length.toLocaleString('ar-SA-u-ca-gregory-nu-latn')} كوبون
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Active filter toggle */}
          <button
            onClick={() => setActiveOnly(!activeOnly)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all font-[family-name:var(--font-display)] text-sm ${
              activeOnly
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-white/5 border-gold/10 text-white/70 hover:text-white'
            }`}
          >
            <CheckCircle size={iconSizes.sm} />
            النشطة فقط
          </button>
          <Link
            href="/admin/promo-codes/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-ink rounded-xl font-[family-name:var(--font-display)] text-sm font-bold hover:bg-gold/90 transition-colors"
          >
            <Plus size={iconSizes.md} />
            {t('admin.promoCodes.create')}
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-gold/50" />
          </div>
        ) : promoCodes.length === 0 ? (
          <div className="text-center py-16">
            <Tag size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 font-[family-name:var(--font-display)]">
              {t('admin.promoCodes.empty')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 bg-white/5">
                  {['الكود', 'الخصم', 'الاستخدامات', 'صلاحية حتى', 'الحالة', 'إجراءات'].map((h) => (
                    <th key={h} className="text-right p-4 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((promo) => {
                  const usesMax = promo.maxUses ?? null;
                  const usesPct = usesMax ? Math.min((promo.usesCount / usesMax) * 100, 100) : null;

                  return (
                    <tr
                      key={promo.id}
                      className="border-b border-gold/5 hover:bg-white/5 transition-colors"
                    >
                      {/* Code */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-white/10 text-gold px-2.5 py-1 rounded-lg text-sm font-mono font-bold tracking-wider">
                            {promo.code}
                          </code>
                          <button
                            onClick={() => handleCopy(promo.code, promo.id)}
                            className="p-1.5 text-white/40 hover:text-white rounded transition-colors"
                          >
                            {copiedId === promo.id ? (
                              <Check size={12} className="text-profit" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Discount */}
                      <td className="p-4">
                        <span className="text-white font-[family-name:var(--font-display)] text-sm font-bold">
                          {formatDiscount(promo)}
                        </span>
                      </td>

                      {/* Uses */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-white/70 text-sm font-[family-name:var(--font-display)]">
                            {promo.usesCount.toLocaleString('ar-SA-u-ca-gregory-nu-latn')}
                            {usesMax ? ` / ${usesMax.toLocaleString('ar-SA-u-ca-gregory-nu-latn')}` : ''}
                          </span>
                          {usesPct !== null && (
                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gold rounded-full"
                                style={{ width: `${usesPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Valid Until */}
                      <td className="p-4">
                        <span className="text-white/50 text-sm font-[family-name:var(--font-display)]">
                          {promo.validUntil
                            ? new Date(promo.validUntil).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn')
                            : 'غير محدد'}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggle(promo)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          {promo.isActive ? (
                            <CheckCircle size={iconSizes.md} className="text-profit" />
                          ) : (
                            <XCircle size={iconSizes.md} className="text-white/30" />
                          )}
                        </button>
                      </td>

                      {/* Delete */}
                      <td className="p-4">
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="p-2 text-white/40 hover:text-loss hover:bg-loss/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={iconSizes.md} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
