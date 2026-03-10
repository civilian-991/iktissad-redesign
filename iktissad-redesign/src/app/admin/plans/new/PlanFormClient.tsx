'use client';

/**
 * Plan Form Client — reusable for new + edit
 * IKTISSAD Design System
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import { createPlan, updatePlan } from '@/lib/api-client';
import type { SubscriptionPlan } from '@/lib/api-client';

interface Props {
  plan?: SubscriptionPlan;
}

export default function PlanFormClient({ plan }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const isEdit = !!plan;

  const [form, setForm] = useState({
    nameAr:       plan?.nameAr ?? '',
    name:         plan?.name ?? '',
    descriptionAr:plan?.descriptionAr ?? '',
    description:  plan?.description ?? '',
    priceMonthly: plan?.priceMonthly?.toString() ?? '',
    priceAnnual:  plan?.priceAnnual?.toString() ?? '',
    interval:     plan?.interval ?? 'monthly',
    sortOrder:    plan?.sortOrder?.toString() ?? '0',
    isActive:     plan?.isActive ?? true,
  });
  const [featuresAr, setFeaturesAr] = useState<string[]>(plan?.featuresAr ?? ['']);
  const [features, setFeatures] = useState<string[]>(plan?.features ?? ['']);
  const [saving, setSaving] = useState(false);

  const handleFeatureChange = (
    arr: string[],
    setArr: (a: string[]) => void,
    idx: number,
    value: string
  ) => {
    const updated = [...arr];
    updated[idx] = value;
    setArr(updated);
  };

  const addFeature = (arr: string[], setArr: (a: string[]) => void) => {
    setArr([...arr, '']);
  };

  const removeFeature = (arr: string[], setArr: (a: string[]) => void, idx: number) => {
    setArr(arr.filter((_, i) => i !== idx));
  };

  const handleSubmit = useCallback(async () => {
    if (!form.nameAr.trim()) {
      toast.error('الاسم العربي مطلوب');
      return;
    }
    if (!form.priceMonthly) {
      toast.error('السعر الشهري مطلوب');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        name: form.name.trim() || form.nameAr.trim(),
        descriptionAr: form.descriptionAr.trim(),
        description: form.description.trim(),
        priceMonthly: parseFloat(form.priceMonthly),
        priceAnnual: form.priceAnnual ? parseFloat(form.priceAnnual) : null,
        interval: form.interval,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
        isActive: form.isActive,
        featuresAr: featuresAr.filter((f) => f.trim()),
        features: features.filter((f) => f.trim()),
      };

      if (isEdit && plan) {
        await updatePlan(plan.id, payload);
        toast.success(t('admin.plans.saveSuccess'));
      } else {
        await createPlan(payload);
        toast.success(t('admin.plans.saveSuccess'));
      }
      router.push('/admin/plans');
    } catch (err: any) {
      toast.error(err.message ?? t('admin.common.error'));
    } finally {
      setSaving(false);
    }
  }, [form, featuresAr, features, isEdit, plan, t, router]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
          {isEdit ? t('admin.plans.edit') : t('admin.plans.add')}
        </h1>
      </div>

      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-2xl p-6 space-y-5">
        {/* Name AR */}
        <div>
          <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
            {t('admin.plans.fields.name')} *
          </label>
          <input
            type="text"
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
            placeholder="مثال: مميز"
          />
        </div>

        {/* Name EN */}
        <div>
          <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
            {t('admin.plans.fields.nameEn')}
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            dir="ltr"
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
            placeholder="e.g. Premium"
          />
        </div>

        {/* Description AR */}
        <div>
          <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
            الوصف بالعربية
          </label>
          <textarea
            value={form.descriptionAr}
            onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
            rows={2}
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30 resize-none"
          />
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
              {t('admin.plans.fields.priceMonthly')} *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.priceMonthly}
              onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
              {t('admin.plans.fields.priceAnnual')}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.priceAnnual}
              onChange={(e) => setForm({ ...form, priceAnnual: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Sort Order + Interval */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
              الفترة
            </label>
            <select
              value={form.interval}
              onChange={(e) => setForm({ ...form, interval: e.target.value as SubscriptionPlan['interval'] })}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
            >
              <option value="monthly" className="bg-midnight">شهري</option>
              <option value="annual" className="bg-midnight">سنوي</option>
              <option value="quarterly" className="bg-midnight">ربع سنوي</option>
            </select>
          </div>
          <div>
            <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
              الترتيب
            </label>
            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] focus:outline-none focus:border-gold/30"
            />
          </div>
        </div>

        {/* Features AR */}
        <div>
          <label className="block text-white/50 text-xs font-[family-name:var(--font-display)] mb-2">
            {t('admin.plans.fields.features')} (عربي)
          </label>
          <div className="space-y-2">
            {featuresAr.map((f, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={f}
                  onChange={(e) =>
                    handleFeatureChange(featuresAr, setFeaturesAr, idx, e.target.value)
                  }
                  className="flex-1 bg-white/5 border border-gold/10 rounded-lg py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
                  placeholder="ميزة..."
                />
                <button
                  onClick={() => removeFeature(featuresAr, setFeaturesAr, idx)}
                  className="p-2.5 text-white/40 hover:text-loss rounded-lg hover:bg-loss/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addFeature(featuresAr, setFeaturesAr)}
              className="flex items-center gap-2 text-gold/70 hover:text-gold text-sm font-[family-name:var(--font-display)] transition-colors"
            >
              <Plus size={14} />
              إضافة ميزة
            </button>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between py-3 border-t border-gold/10">
          <div>
            <p className="text-white font-[family-name:var(--font-display)] text-sm font-medium">
              {t('admin.plans.toggle')}
            </p>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)]">
              الخطط غير النشطة لا تظهر للمستخدمين
            </p>
          </div>
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
          className="w-full flex items-center justify-center gap-2 py-3 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-gold/90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 size={iconSizes.md} className="animate-spin" />
          ) : (
            <Save size={iconSizes.md} />
          )}
          {t('admin.plans.save')}
        </button>
      </div>
    </div>
  );
}
