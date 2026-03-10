'use client';

/**
 * Admin Plans Page
 * IKTISSAD Design System
 *
 * Lists subscription plans with enable/disable toggle and edit links.
 */

import useSWR from 'swr';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Edit, Loader2, Layers, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { swrFetcher, subscriptionPlansKey, updatePlan } from '@/lib/api-client';
import type { SubscriptionPlan, ApiResponse } from '@/lib/api-client';

export default function PlansPage() {
  const { t } = useTranslation();

  const { data, isLoading, mutate } = useSWR<ApiResponse<SubscriptionPlan[]>>(
    subscriptionPlansKey(),
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const plans = data?.data ?? [];

  const handleToggle = async (plan: SubscriptionPlan) => {
    try {
      await updatePlan(plan.id, { isActive: !plan.isActive });
      toast.success(plan.isActive ? 'تم تعطيل الخطة' : 'تم تفعيل الخطة');
      mutate();
    } catch {
      toast.error('حدث خطأ');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            {t('admin.plans.title')}
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {plans.length.toLocaleString('ar-SA')} خطة
          </p>
        </div>
        <Link
          href="/admin/plans/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] text-sm font-bold hover:bg-gold/90 transition-colors"
        >
          <Plus size={iconSizes.md} />
          {t('admin.plans.add')}
        </Link>
      </div>

      {/* Plans List */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-gold/50" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <Layers size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 font-[family-name:var(--font-display)]">لا توجد خطط بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gold/5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Status indicator */}
                  <div className={`w-2 h-10 rounded-full shrink-0 ${plan.isActive ? 'bg-profit' : 'bg-white/20'}`} />
                  {/* Plan info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-[family-name:var(--font-display)] font-bold">
                        {plan.nameAr}
                      </h3>
                      {plan.isActive ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-profit/15 text-profit font-[family-name:var(--font-display)]">نشطة</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/40 font-[family-name:var(--font-display)]">غير نشطة</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-white/50 text-sm font-[family-name:var(--font-display)]">
                      <span>{plan.priceMonthly.toLocaleString('ar-SA')} ر.س / شهر</span>
                      {plan.priceAnnual && (
                        <span>{plan.priceAnnual.toLocaleString('ar-SA')} ر.س / سنة</span>
                      )}
                    </div>
                    {plan.descriptionAr && (
                      <p className="text-white/30 text-xs mt-1 font-[family-name:var(--font-display)] truncate">
                        {plan.descriptionAr}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(plan)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title={plan.isActive ? 'تعطيل' : 'تفعيل'}
                  >
                    {plan.isActive ? (
                      <CheckCircle size={iconSizes.md} className="text-profit" />
                    ) : (
                      <XCircle size={iconSizes.md} className="text-white/30" />
                    )}
                  </button>
                  {/* Edit */}
                  <Link
                    href={`/admin/plans/${plan.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-[family-name:var(--font-display)]"
                  >
                    <Edit size={iconSizes.sm} />
                    {t('admin.plans.edit')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
