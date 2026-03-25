'use client';

/**
 * SourceFormModal — Phase 10.1 Source & Contact CRM
 * IKTISSAD Design System
 *
 * Create / edit a journalist source.
 * Fields: name, nameEn, title, titleEn, organization, organizationEn,
 *         phone, email, country, sector, tags, reliability rating,
 *         embargo date, private notes.
 */

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { X, Star, Lock, Loader2, Tag } from 'lucide-react';
import { iconSizes } from '@/lib/design-tokens';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse, Source } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  source: Source | null; // null = create mode
  onClose: () => void;
  onSave: () => void;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  nameEn: string;
  title: string;
  titleEn: string;
  organization: string;
  organizationEn: string;
  phone: string;
  email: string;
  countryId: string;
  sectorId: string;
  tagsInput: string; // comma-separated
  reliabilityRating: number; // 0 = unset
  embargoUntil: string; // datetime-local string
  privateNotes: string;
}

function toFormState(source: Source | null): FormState {
  if (!source) {
    return {
      name: '',
      nameEn: '',
      title: '',
      titleEn: '',
      organization: '',
      organizationEn: '',
      phone: '',
      email: '',
      countryId: '',
      sectorId: '',
      tagsInput: '',
      reliabilityRating: 0,
      embargoUntil: '',
      privateNotes: '',
    };
  }
  return {
    name: source.name,
    nameEn: source.nameEn ?? '',
    title: source.title ?? '',
    titleEn: source.titleEn ?? '',
    organization: source.organization ?? '',
    organizationEn: source.organizationEn ?? '',
    phone: source.phone ?? '',
    email: source.email ?? '',
    countryId: source.countryId ?? '',
    sectorId: source.sectorId ?? '',
    tagsInput: source.tags.join(', '),
    reliabilityRating: source.reliabilityRating ?? 0,
    embargoUntil: source.embargoUntil
      ? new Date(source.embargoUntil).toISOString().slice(0, 16)
      : '',
    privateNotes: source.privateNotes ?? '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SourceFormModal({ source, onClose, onSave }: Props) {
  const isEdit = source !== null;
  const [form, setForm] = useState<FormState>(() => toFormState(source));
  const [saving, setSaving] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset when source prop changes
  useEffect(() => {
    setForm(toFormState(source));
  }, [source]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch sectors & countries for dropdowns
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
  const sectors = sectorsData?.data ?? [];
  const countries = countriesData?.data ?? [];

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Parse tags from comma-separated input
  const parsedTags = form.tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('اسم المصدر مطلوب');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || undefined,
        title: form.title.trim() || undefined,
        titleEn: form.titleEn.trim() || undefined,
        organization: form.organization.trim() || undefined,
        organizationEn: form.organizationEn.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        countryId: form.countryId || undefined,
        sectorId: form.sectorId || undefined,
        tags: parsedTags,
        reliabilityRating: form.reliabilityRating > 0 ? form.reliabilityRating : undefined,
        embargoUntil: form.embargoUntil
          ? new Date(form.embargoUntil).toISOString()
          : undefined,
        privateNotes: form.privateNotes.trim() || undefined,
      };

      const url = isEdit ? `/api/sources/${source!.id}` : '/api/sources';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<Source> = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error ?? 'حدث خطأ');
      }

      toast.success(isEdit ? 'تم تحديث المصدر' : 'تم إضافة المصدر');
      onSave();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="bg-midnight border border-gold/15 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gold/10 sticky top-0 bg-midnight z-10">
          <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
            {isEdit ? 'تعديل المصدر' : 'مصدر جديد'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={iconSizes.md} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
                الاسم (عربي) <span className="text-loss">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="مثال: محمد العبدالله"
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
                الاسم (إنجليزي)
              </label>
              <input
                type="text"
                value={form.nameEn}
                onChange={set('nameEn')}
                placeholder="مثال: محمد عبدالله"
                dir="ltr"
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm"
              />
            </div>
          </div>

          {/* Title row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
                المنصب / المسمى الوظيفي
              </label>
              <input
                type="text"
                value={form.title}
                onChange={set('title')}
                placeholder="مثال: مدير تنفيذي"
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
                المنصب (إنجليزي)
              </label>
              <input
                type="text"
                value={form.titleEn}
                onChange={set('titleEn')}
                placeholder="مثال: الرئيس التنفيذي"
                dir="ltr"
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm"
              />
            </div>
          </div>

          {/* Organization row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
                المنظمة / الشركة
              </label>
              <input
                type="text"
                value={form.organization}
                onChange={set('organization')}
                placeholder="مثال: صندوق الاستثمارات العامة"
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
                المنظمة (إنجليزي)
              </label>
              <input
                type="text"
                value={form.organizationEn}
                onChange={set('organizationEn')}
                placeholder="مثال: صندوق الاستثمارات العامة"
                dir="ltr"
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm"
              />
            </div>
          </div>

          {/* Contact row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+966 5x xxx xxxx"
                dir="ltr"
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="example@domain.com"
                dir="ltr"
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm"
              />
            </div>
          </div>

          {/* Country & Sector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
                الدولة
              </label>
              <select
                value={form.countryId}
                onChange={set('countryId')}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
              >
                <option value="" className="bg-midnight">— اختر الدولة —</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id} className="bg-midnight">{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
                القطاع
              </label>
              <select
                value={form.sectorId}
                onChange={set('sectorId')}
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30"
              >
                <option value="" className="bg-midnight">— اختر القطاع —</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id} className="bg-midnight">{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
              الوسوم (مفصولة بفواصل)
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.tagsInput}
                onChange={set('tagsInput')}
                placeholder="مثال: نفط, طاقة, سياسة نقدية"
                className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 pr-10 pl-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm"
              />
              <Tag size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            </div>
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {parsedTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gold/10 border border-gold/15 rounded-full text-gold/80 text-xs font-[family-name:var(--font-display)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reliability rating */}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-2">
              تقييم الموثوقية
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      reliabilityRating: prev.reliabilityRating === star ? 0 : star,
                    }))
                  }
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    size={22}
                    className={
                      star <= (hoveredStar || form.reliabilityRating)
                        ? 'text-gold fill-gold'
                        : 'text-white/20'
                    }
                  />
                </button>
              ))}
              {form.reliabilityRating > 0 && (
                <span className="text-white/50 text-sm font-[family-name:var(--font-display)] mr-2">
                  {form.reliabilityRating}/5
                </span>
              )}
            </div>
          </div>

          {/* Embargo date */}
          <div>
            <label className="block text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
              تاريخ انتهاء الحظر (اختياري)
            </label>
            <input
              type="datetime-local"
              value={form.embargoUntil}
              onChange={set('embargoUntil')}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 transition-colors"
            />
            {form.embargoUntil && new Date(form.embargoUntil) > new Date() && (
              <p className="mt-1 text-loss text-xs font-[family-name:var(--font-display)]">
                سيكون هذا المصدر تحت الحظر حتى {new Date(form.embargoUntil).toLocaleString('ar-SA-u-ca-gregory')}
              </p>
            )}
          </div>

          {/* Private notes */}
          <div>
            <label className="flex items-center gap-1.5 text-white/60 text-xs font-[family-name:var(--font-display)] mb-1.5">
              <Lock size={12} />
              ملاحظات خاصة
              <span className="text-white/30">— مرئية لك فقط</span>
            </label>
            <textarea
              value={form.privateNotes}
              onChange={set('privateNotes')}
              placeholder="ملاحظات خاصة حول المصدر..."
              rows={4}
              className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/25 focus:outline-none focus:border-gold/30 transition-colors text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gold/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-white/60 hover:text-white font-[family-name:var(--font-display)] text-sm transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'حفظ التعديلات' : 'إضافة المصدر'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
