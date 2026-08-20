'use client';

/**
 * Admin Advertisers Page — Full CRUD
 * IKTISSAD Design System
 *
 * Features: list with pagination, search, add/edit slide-over panel, delete confirmation.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { iconSizes } from '@/lib/design-tokens';
import {
  swrFetcher,
  createAdvertiser,
  updateAdvertiser,
  deleteAdvertiser,
} from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { Advertiser } from '@/app/api/advertisers/route';

// ─── Form initial state ───────────────────────────────────────────────────────

interface AdvertiserForm {
  name: string;
  nameEn: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}

const EMPTY_FORM: AdvertiserForm = {
  name: '',
  nameEn: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  notes: '',
};

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-gold/5">
      {[180, 140, 130, 160, 110, 80].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-3 bg-white/10 rounded animate-pulse"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Slide-over panel ─────────────────────────────────────────────────────────

interface PanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  form: AdvertiserForm;
  onChange: (field: keyof AdvertiserForm, value: string) => void;
  onSubmit: () => void;
  saving: boolean;
}

function SlidePanel({ open, onClose, title, form, onChange, onSubmit, saving }: PanelProps) {
  // Trap keyboard: close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const inputCls =
    'w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors text-sm';
  const labelCls =
    'block text-white/50 text-xs font-[family-name:var(--font-display)] mb-1.5';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-96 bg-midnight border-l border-gold/10 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gold/10 shrink-0">
          <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={iconSizes.md} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Name (AR) */}
          <div>
            <label className={labelCls}>الاسم بالعربية <span className="text-gold">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="اسم المعلن"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Name (EN) */}
          <div>
            <label className={labelCls}>الاسم بالإنجليزية</label>
            <input
              type="text"
              value={form.nameEn}
              onChange={(e) => onChange('nameEn', e.target.value)}
              placeholder="اسم المُعلن بالإنجليزية"
              className={inputCls}
              dir="ltr"
            />
          </div>

          {/* Contact name */}
          <div>
            <label className={labelCls}>اسم جهة الاتصال</label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => onChange('contactName', e.target.value)}
              placeholder="الشخص المسؤول"
              className={inputCls}
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>البريد الإلكتروني</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => onChange('contactEmail', e.target.value)}
              placeholder="email@example.com"
              className={inputCls}
              dir="ltr"
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelCls}>رقم الهاتف</label>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => onChange('contactPhone', e.target.value)}
              placeholder="+966 5x xxx xxxx"
              className={inputCls}
              dir="ltr"
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="أي معلومات إضافية..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gold/10 flex items-center gap-3 shrink-0">
          <button
            onClick={onSubmit}
            disabled={saving || !form.name.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-gold to-amber-400 text-ink font-[family-name:var(--font-display)] font-semibold text-sm transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 size={iconSizes.md} className="animate-spin" /> : null}
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-white/5 border border-gold/10 text-white/70 hover:text-white font-[family-name:var(--font-display)] text-sm transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdvertisersPage() {
  // ─── State ────────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Advertiser | null>(null);
  const [form, setForm] = useState<AdvertiserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // ─── Data ─────────────────────────────────────────────────────────────────
  const apiUrl = `/api/advertisers?page=${page}&pageSize=${pageSize}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`;
  const { data, isLoading, mutate } = useSWR<ApiResponse<Advertiser[]>>(apiUrl, swrFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const advertisers = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  // ─── Panel helpers ────────────────────────────────────────────────────────
  const openAdd = useCallback(() => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setPanelOpen(true);
  }, []);

  const openEdit = useCallback((adv: Advertiser) => {
    setEditTarget(adv);
    setForm({
      name: adv.name,
      nameEn: adv.nameEn ?? '',
      contactName: adv.contactName ?? '',
      contactEmail: adv.contactEmail ?? '',
      contactPhone: adv.contactPhone ?? '',
      notes: adv.notes ?? '',
    });
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setEditTarget(null);
  }, []);

  const handleFormChange = useCallback((field: keyof AdvertiserForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ─── Submit (create / update) ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editTarget) {
        await updateAdvertiser(editTarget.id, payload);
      } else {
        await createAdvertiser(payload);
      }

      toast.success(editTarget ? 'تم تحديث المعلن بنجاح' : 'تمت إضافة المعلن بنجاح');
      closePanel();
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  }, [form, editTarget, closePanel, mutate]);

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (adv: Advertiser) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف "${adv.name}"؟ لا يمكن التراجع عن هذا الإجراء.`);
    if (!confirmed) return;

    setDeletingId(adv.id);
    try {
      await deleteAdvertiser(adv.id);
      toast.success(`تم حذف "${adv.name}" بنجاح`);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء الحذف');
    } finally {
      setDeletingId(null);
    }
  }, [mutate]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            المعلنون
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            {isLoading ? 'جاري التحميل...' : `${total.toLocaleString('ar-SA-u-ca-gregory-nu-latn')} معلن مسجل`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold to-amber-400 text-ink font-[family-name:var(--font-display)] font-semibold text-sm transition-opacity hover:opacity-90"
        >
          <Plus size={iconSizes.md} />
          إضافة معلن
        </button>
      </div>

      {/* Stats card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
            <Building2 size={22} className="text-gold" />
          </div>
          <div>
            <p className="text-white/50 text-xs font-[family-name:var(--font-display)] mb-1">إجمالي المعلنين</p>
            <p className="text-white text-2xl font-[family-name:var(--font-display)] font-bold">
              {isLoading ? '—' : total.toLocaleString('ar-SA-u-ca-gregory-nu-latn')}
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="البحث عن معلن بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 pr-12 ps-4 text-white font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/30 transition-colors text-sm"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={iconSizes.md} />
        </div>
      </div>

      {/* Table card */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 700 }}>
            <thead className="bg-obsidian border-b border-gold/10">
              <tr>
                {['الاسم', 'الاسم الإنجليزي', 'جهة الاتصال', 'البريد الإلكتروني', 'الهاتف', 'الإجراءات'].map((col) => (
                  <th
                    key={col}
                    className="text-right px-4 py-3.5 text-white/50 text-xs font-[family-name:var(--font-display)] font-semibold uppercase tracking-wide"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/5">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : advertisers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center">
                        <Building2 size={32} className="text-gold/60" />
                      </div>
                      <div>
                        <p className="text-white font-[family-name:var(--font-display)] font-semibold mb-1">
                          {debouncedSearch ? 'لا توجد نتائج' : 'لا يوجد معلنون بعد'}
                        </p>
                        <p className="text-white/40 text-sm font-[family-name:var(--font-display)]">
                          {debouncedSearch
                            ? `لم يُعثر على معلن يطابق "${debouncedSearch}"`
                            : 'ابدأ بإضافة أول معلن باستخدام الزر أعلاه'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                advertisers.map((adv) => (
                  <tr
                    key={adv.id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    {/* Name (AR) */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                          <span className="text-gold text-xs font-bold font-[family-name:var(--font-display)]">
                            {adv.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-white text-sm font-[family-name:var(--font-display)] font-medium">
                          {adv.name}
                        </span>
                      </div>
                    </td>

                    {/* Name (EN) */}
                    <td className="px-4 py-3.5">
                      <span className="text-white/60 text-sm font-[family-name:var(--font-display)]" dir="ltr">
                        {adv.nameEn || '—'}
                      </span>
                    </td>

                    {/* Contact name */}
                    <td className="px-4 py-3.5">
                      <span className="text-white/70 text-sm font-[family-name:var(--font-display)]">
                        {adv.contactName || '—'}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3.5">
                      {adv.contactEmail ? (
                        <a
                          href={`mailto:${adv.contactEmail}`}
                          className="text-gold/70 hover:text-gold text-sm font-[family-name:var(--font-display)] transition-colors"
                          dir="ltr"
                        >
                          {adv.contactEmail}
                        </a>
                      ) : (
                        <span className="text-white/30 text-sm font-[family-name:var(--font-display)]">—</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5">
                      <span className="text-white/60 text-sm font-[family-name:var(--font-display)]" dir="ltr">
                        {adv.contactPhone || '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(adv)}
                          title="تعديل"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-gold hover:bg-gold/10 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(adv)}
                          disabled={deletingId === adv.id}
                          title="حذف"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                        >
                          {deletingId === adv.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: pagination + refresh */}
        {!isLoading && advertisers.length > 0 && (
          <div className="px-4 py-3 border-t border-gold/10 flex items-center justify-between">
            {/* Pagination */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gold/10 text-white/50 hover:text-white hover:border-gold/30 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={14} />
              </button>
              <span className="text-white/40 text-xs font-[family-name:var(--font-display)]">
                صفحة {page.toLocaleString('ar-SA-u-ca-gregory-nu-latn')} من {totalPages.toLocaleString('ar-SA-u-ca-gregory-nu-latn')}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gold/10 text-white/50 hover:text-white hover:border-gold/30 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            {/* Refresh */}
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

      {/* Slide-over panel */}
      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editTarget ? 'تعديل المعلن' : 'إضافة معلن جديد'}
        form={form}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        saving={saving}
      />
    </div>
  );
}
