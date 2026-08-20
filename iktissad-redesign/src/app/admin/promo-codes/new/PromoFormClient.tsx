'use client';

/**
 * Promo Code Form — Create
 * IKTISSAD Design System
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, Zap } from 'lucide-react';
import useSWR from 'swr';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { createPromoCode, swrFetcher, subscriptionPlansKey } from '@/lib/api-client';
import type { SubscriptionPlan, ApiResponse } from '@/lib/api-client';

export default function PromoFormClient() {
  const { t } = useTranslation();
  const router = useRouter();

  const { data: plansData } = useSWR<ApiResponse<SubscriptionPlan[]>>(
    subscriptionPlansKey(),
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const plans = plansData?.data ?? [];

  const [form, setForm] = useState({
    code: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '',
    maxUses: '',
    validFrom: '',
    validUntil: '',
    isActive: true,
  });
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleCodeChange = (v: string) => {
    setForm({ ...form, code: v.toUpperCase().replace(/[^A-Z0-9_-]/g, '') });
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    setForm({ ...form, code });
  };

  const togglePlan = (id: string) => {
    setSelectedPlans((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = useCallback(async () => {
    if (!form.code.trim()) {
      toast.error('الكود مطلوب');
      return;
    }
    if (!form.discountValue) {
      toast.error('قيمة الخصم مطلوبة');
      return;
    }

    setSaving(true);
    try {
      await createPromoCode({
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
        validFrom: form.validFrom || new Date().toISOString(),
        validUntil: form.validUntil || null,
        isActive: form.isActive,
        plans: selectedPlans.length > 0 ? selectedPlans : null,
      });
      toast.success('تم إنشاء الكوبون بنجاح');
      router.push('/admin/promo-codes');
    } catch (err: any) {
      toast.error(err.message ?? t('admin.common.error'));
    } finally {
      setSaving(false);
    }
  }, [form, selectedPlans, router, t]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
          {t('admin.promoCodes.create')}
        </h1>
      </div>

      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-2xl p-6 space-y-5">
        {/* Code */}
        <div>
          <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
            {t('admin.promoCodes.fields.code')} *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="flex-1 bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-gold font-mono font-bold tracking-wider focus:outline-none focus:border-gold/30 uppercase"
              placeholder="SUMMER30"
              maxLength={20}
            />
            <button
              onClick={generateCode}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-gold/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors font-[family-name:var(--font-display)] text-sm"
            >
              <Zap size={14} />
              توليد
            </button>
          </div>
        </div>

        {/* Discount Type + Value */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
              {t('admin.promoCodes.fields.discountType')}
            </label>
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value as 'percent' | 'fixed' })}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
            >
              <option value="percent" className="bg-midnight">نسبة مئوية (%)</option>
              <option value="fixed" className="bg-midnight">مبلغ ثابت (ر.س)</option>
            </select>
          </div>
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
              {t('admin.promoCodes.fields.discountValue')} *
            </label>
            <input
              type="number"
              min="0"
              step={form.discountType === 'percent' ? '1' : '0.01'}
              max={form.discountType === 'percent' ? '100' : undefined}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
              placeholder={form.discountType === 'percent' ? '30' : '50'}
            />
          </div>
        </div>

        {/* Max Uses */}
        <div>
          <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
            {t('admin.promoCodes.fields.maxUses')} (اتركه فارغاً لعدد غير محدود)
          </label>
          <input
            type="number"
            min="1"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
            placeholder="100"
          />
        </div>

        {/* Valid From / Until */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
              صالح من
            </label>
            <input
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
              {t('admin.promoCodes.fields.validUntil')}
            </label>
            <input
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
            />
          </div>
        </div>

        {/* Plan Restrictions */}
        {plans.length > 0 && (
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
              تقييد بالخطط (اتركه فارغاً لكل الخطط)
            </label>
            <div className="flex flex-wrap gap-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlan(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors ${
                    selectedPlans.includes(p.id)
                      ? 'bg-gold/20 text-gold border border-gold/30'
                      : 'bg-white/5 text-white/60 border border-gold/10 hover:bg-white/10'
                  }`}
                >
                  {p.nameAr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Toggle */}
        <div className="flex items-center justify-between py-3 border-t border-gold/10">
          <p className="text-white font-[family-name:var(--font-display)] text-sm font-medium">
            كوبون نشط
          </p>
          <button
            onClick={() => setForm({ ...form, isActive: !form.isActive })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              form.isActive ? 'bg-gold' : 'bg-white/20'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                form.isActive ? 'right-1' : 'translate-x-0 right-7'
              }`}
            />
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gold text-ink rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-gold/90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 size={iconSizes.md} className="animate-spin" />
          ) : (
            <Save size={iconSizes.md} />
          )}
          {t('admin.promoCodes.create')}
        </button>
      </div>
    </div>
  );
}
