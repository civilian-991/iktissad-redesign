'use client';

/**
 * Admin Ads & Campaigns CRUD Page
 * /admin/ads
 * RTL, dark theme, two tabs: Campaigns + Ads
 */

import { useState, useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  MousePointerClick,
  TrendingUp,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { AdCampaign } from '@/app/api/ad-campaigns/route';
import type { Ad } from '@/app/api/ads/route';
import type { Advertiser } from '@/app/api/advertisers/route';
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  active: 'نشطة',
  paused: 'موقوفة',
  completed: 'مكتملة',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-white/10 text-white/60',
  active: 'bg-emerald-500/15 text-emerald-400',
  paused: 'bg-amber-500/15 text-amber-400',
  completed: 'bg-blue-500/15 text-blue-400',
};

const AD_TYPE_LABELS: Record<string, string> = {
  'full-page': 'صفحة كاملة',
  'half-page': 'نصف صفحة',
  'banner': 'بانر',
  'sponsor-card': 'بطاقة راعي',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(cents: number | null) {
  if (cents == null) return '—';
  return '$' + (cents / 100).toLocaleString('en-US');
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatNum(n: number) {
  return n.toLocaleString('ar-SA-u-ca-gregory-nu-latn');
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="bg-midnight border border-gold/10 rounded-xl p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-gold" />
      </div>
      <div>
        <p className="text-white/50 text-xs font-[family-name:var(--font-display)] mb-0.5">{label}</p>
        <p className="text-white text-xl font-bold font-[family-name:var(--font-display)]">{value}</p>
      </div>
    </div>
  );
}

// ─── Slide-over Panel ─────────────────────────────────────────────────────────

function SlideOver({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="relative mr-auto w-full max-w-lg bg-obsidian border-r border-gold/10 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10 shrink-0">
          <h2 className="text-lg font-bold text-white font-[family-name:var(--font-display)]">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Field components ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-white/60 font-[family-name:var(--font-display)]">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-midnight border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/60 transition-colors';
const selectCls = inputCls + ' cursor-pointer';

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

function ConfirmDialog({ open, onClose, onConfirm, label }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  label: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-obsidian border border-gold/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <AlertCircle size={20} className="text-red-400" />
          </div>
          <h3 className="text-white font-bold font-[family-name:var(--font-display)]">تأكيد الحذف</h3>
        </div>
        <p className="text-white/60 text-sm font-[family-name:var(--font-display)] mb-6">
          هل أنت متأكد من حذف <span className="text-white font-medium">{label}</span>؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold font-[family-name:var(--font-display)] transition-colors"
          >
            حذف
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-lg py-2.5 text-sm font-[family-name:var(--font-display)] transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={16} />
      </button>
      <span className="text-white/50 text-sm font-[family-name:var(--font-display)] px-2">
        {page} / {totalPages}
      </span>
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}

// ─── Campaign Form ────────────────────────────────────────────────────────────

interface CampaignFormData {
  name: string;
  advertiser_id: string;
  start_date: string;
  end_date: string;
  budget_sar: string;
  status: string;
}

const EMPTY_CAMPAIGN: CampaignFormData = {
  name: '', advertiser_id: '', start_date: '', end_date: '', budget_sar: '', status: 'draft',
};

function CampaignForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: AdCampaign | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CampaignFormData>(() =>
    initial
      ? {
          name: initial.name,
          advertiser_id: initial.advertiserId ?? '',
          start_date: initial.startDate ?? '',
          end_date: initial.endDate ?? '',
          budget_sar: initial.budgetCents != null ? String(initial.budgetCents / 100) : '',
          status: initial.status,
        }
      : EMPTY_CAMPAIGN
  );
  const [saving, setSaving] = useState(false);

  const { data: advResp } = useSWR<ApiResponse<Advertiser[]>>(
    '/api/advertisers?pageSize=100',
    swrFetcher
  );
  const advertisers = advResp?.data ?? [];

  const set = (key: keyof CampaignFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('الاسم مطلوب'); return; }
    setSaving(true);
    try {
      const budgetCents = form.budget_sar ? Math.round(parseFloat(form.budget_sar) * 100) : null;
      const payload = {
        name: form.name.trim(),
        advertiser_id: form.advertiser_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget_cents: budgetCents,
        status: form.status,
      };
      const url = initial ? `/api/ad-campaigns/${initial.id}` : '/api/ad-campaigns';
      const method = initial ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'فشل الحفظ');
      }
      toast.success(initial ? 'تم تحديث الحملة' : 'تم إنشاء الحملة');
      await globalMutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/ad-campaigns'));
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="اسم الحملة *">
        <input className={inputCls} placeholder="مثال: حملة رمضان 2026" value={form.name} onChange={set('name')} required />
      </Field>
      <Field label="المعلن">
        <select className={selectCls} value={form.advertiser_id} onChange={set('advertiser_id')}>
          <option value="">— بدون معلن —</option>
          {advertisers.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="تاريخ البداية">
          <input type="date" className={inputCls} value={form.start_date} onChange={set('start_date')} />
        </Field>
        <Field label="تاريخ النهاية">
          <input type="date" className={inputCls} value={form.end_date} onChange={set('end_date')} />
        </Field>
      </div>
      <Field label="الميزانية (ر.س)">
        <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.budget_sar} onChange={set('budget_sar')} />
      </Field>
      <Field label="الحالة">
        <select className={selectCls} value={form.status} onChange={set('status')}>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-gold text-ink font-bold rounded-lg py-3 text-sm font-[family-name:var(--font-display)] hover:bg-gold/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {initial ? 'حفظ التعديلات' : 'إنشاء الحملة'}
        </button>
        <button type="button" onClick={onClose} className="px-5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors">
          إلغاء
        </button>
      </div>
    </form>
  );
}

// ─── Ad Form ──────────────────────────────────────────────────────────────────

interface AdFormData {
  campaign_id: string;
  type: string;
  image_url: string;
  target_url: string;
  alt_text: string;
  active: boolean;
}

const EMPTY_AD: AdFormData = {
  campaign_id: '', type: 'banner', image_url: '', target_url: '', alt_text: '', active: true,
};

function AdForm({
  initial,
  campaigns,
  onSave,
  onClose,
}: {
  initial?: Ad | null;
  campaigns: AdCampaign[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AdFormData>(() =>
    initial
      ? {
          campaign_id: initial.campaignId,
          type: initial.type,
          image_url: initial.imageUrl,
          target_url: initial.targetUrl ?? '',
          alt_text: initial.altText ?? '',
          active: initial.active,
        }
      : EMPTY_AD
  );
  const [saving, setSaving] = useState(false);

  const set = (key: keyof AdFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.campaign_id) { toast.error('اختر الحملة'); return; }
    if (!form.image_url.trim()) { toast.error('رابط الصورة مطلوب'); return; }
    setSaving(true);
    try {
      const payload = {
        campaign_id: form.campaign_id,
        type: form.type,
        image_url: form.image_url.trim(),
        target_url: form.target_url.trim() || null,
        alt_text: form.alt_text.trim() || null,
        active: form.active,
      };
      const url = initial ? `/api/ads/${initial.id}` : '/api/ads';
      const method = initial ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'فشل الحفظ');
      }
      toast.success(initial ? 'تم تحديث الإعلان' : 'تم إنشاء الإعلان');
      await globalMutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/ads'));
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="الحملة *">
        <select className={selectCls} value={form.campaign_id} onChange={set('campaign_id')} required>
          <option value="">— اختر حملة —</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="نوع الإعلان">
        <select className={selectCls} value={form.type} onChange={set('type')}>
          {Object.entries(AD_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="رابط الصورة *">
        <input className={inputCls} placeholder="https://..." value={form.image_url} onChange={set('image_url')} required />
      </Field>
      <Field label="الرابط المستهدف">
        <input className={inputCls} placeholder="https://..." value={form.target_url} onChange={set('target_url')} />
      </Field>
      <Field label="النص البديل">
        <input className={inputCls} placeholder="وصف الإعلان للقراء" value={form.alt_text} onChange={set('alt_text')} />
      </Field>
      <Field label="الحالة">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-[family-name:var(--font-display)] transition-colors w-fit ${
            form.active
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-white/5 border-white/10 text-white/50'
          }`}
        >
          {form.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {form.active ? 'نشط' : 'غير نشط'}
        </button>
      </Field>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-gold text-ink font-bold rounded-lg py-3 text-sm font-[family-name:var(--font-display)] hover:bg-gold/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {initial ? 'حفظ التعديلات' : 'إنشاء الإعلان'}
        </button>
        <button type="button" onClick={onClose} className="px-5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors">
          إلغاء
        </button>
      </div>
    </form>
  );
}

// ─── Campaigns Tab ────────────────────────────────────────────────────────────

function CampaignsTab() {
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<AdCampaign | null>(null);
  const [deleting, setDeleting] = useState<AdCampaign | null>(null);

  const swrKey = `/api/ad-campaigns?page=${page}&pageSize=10`;
  const { data: resp, isLoading, error } = useSWR<ApiResponse<AdCampaign[]>>(swrKey, swrFetcher);
  const campaigns = resp?.data ?? [];
  const totalPages = resp?.pagination?.totalPages ?? 1;

  const openNew = () => { setEditing(null); setPanelOpen(true); };
  const openEdit = (c: AdCampaign) => { setEditing(c); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setEditing(null); };

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/ad-campaigns/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل الحذف');
      toast.success('تم حذف الحملة');
      await globalMutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/ad-campaigns'));
    } catch {
      toast.error('فشل حذف الحملة');
    } finally {
      setDeleting(null);
    }
  }, [deleting]);

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
          {resp?.pagination?.total ?? 0} حملة
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-gold text-ink font-bold text-sm rounded-xl px-4 py-2.5 hover:bg-gold/90 transition-colors font-[family-name:var(--font-display)]"
        >
          <Plus size={16} />
          حملة جديدة
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-gold animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 text-red-400 py-12 justify-center">
          <AlertCircle size={20} />
          <span className="font-[family-name:var(--font-display)] text-sm">تعذّر تحميل البيانات</span>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center">
            <Megaphone size={28} className="text-gold" />
          </div>
          <p className="text-white/40 font-[family-name:var(--font-display)] text-sm">لا توجد حملات بعد</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gold/10">
          <table className="w-full text-sm font-[family-name:var(--font-display)]">
            <thead>
              <tr className="border-b border-gold/10 bg-midnight/50">
                {['الاسم', 'المعلن', 'التاريخ', 'الميزانية', 'الحالة', 'الإجراءات'].map((h) => (
                  <th key={h} className="text-right text-white/40 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-gold/5 hover:bg-white/2 transition-colors ${i % 2 === 0 ? '' : 'bg-midnight/20'}`}
                >
                  <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-white/60">{c.advertiserName ?? '—'}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">
                    {formatDate(c.startDate)}
                    {c.endDate ? <> — {formatDate(c.endDate)}</> : null}
                  </td>
                  <td className="px-4 py-3 text-white/70">{formatUSD(c.budgetCents)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] ?? STATUS_COLORS.draft}`}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                        title="تعديل"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleting(c)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      <SlideOver
        open={panelOpen}
        onClose={closePanel}
        title={editing ? 'تعديل الحملة' : 'حملة جديدة'}
      >
        <CampaignForm
          initial={editing}
          onSave={closePanel}
          onClose={closePanel}
        />
      </SlideOver>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        label={deleting?.name ?? ''}
      />
    </>
  );
}

// ─── Ads Tab ──────────────────────────────────────────────────────────────────

function AdsTab() {
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [deleting, setDeleting] = useState<Ad | null>(null);

  const swrKey = `/api/ads?page=${page}&pageSize=10`;
  const { data: resp, isLoading, error } = useSWR<ApiResponse<Ad[]>>(swrKey, swrFetcher);
  const ads = resp?.data ?? [];
  const totalPages = resp?.pagination?.totalPages ?? 1;

  // Fetch all campaigns for the form selector (up to 100)
  const { data: campResp } = useSWR<ApiResponse<AdCampaign[]>>(
    '/api/ad-campaigns?pageSize=100',
    swrFetcher
  );
  const allCampaigns = campResp?.data ?? [];

  // Build campaign name map for table display
  const campaignNameMap = Object.fromEntries(allCampaigns.map((c) => [c.id, c.name]));

  const openNew = () => { setEditing(null); setPanelOpen(true); };
  const openEdit = (a: Ad) => { setEditing(a); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setEditing(null); };

  const handleToggleActive = async (ad: Ad) => {
    try {
      const res = await fetch(`/api/ads/${ad.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !ad.active }),
      });
      if (!res.ok) throw new Error('فشل التحديث');
      await globalMutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/ads'));
      toast.success(ad.active ? 'تم إيقاف الإعلان' : 'تم تفعيل الإعلان');
    } catch {
      toast.error('فشل تحديث الحالة');
    }
  };

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/ads/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل الحذف');
      toast.success('تم حذف الإعلان');
      await globalMutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/ads'));
    } catch {
      toast.error('فشل حذف الإعلان');
    } finally {
      setDeleting(null);
    }
  }, [deleting]);

  const ctr = (ad: Ad) => {
    if (!ad.impressions) return '0.0%';
    return ((ad.clicks / ad.impressions) * 100).toFixed(1) + '%';
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
          {resp?.pagination?.total ?? 0} إعلان
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-gold text-ink font-bold text-sm rounded-xl px-4 py-2.5 hover:bg-gold/90 transition-colors font-[family-name:var(--font-display)]"
        >
          <Plus size={16} />
          إعلان جديد
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-gold animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 text-red-400 py-12 justify-center">
          <AlertCircle size={20} />
          <span className="font-[family-name:var(--font-display)] text-sm">تعذّر تحميل البيانات</span>
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center">
            <Megaphone size={28} className="text-gold" />
          </div>
          <p className="text-white/40 font-[family-name:var(--font-display)] text-sm">لا توجد إعلانات بعد</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gold/10">
          <table className="w-full text-sm font-[family-name:var(--font-display)]">
            <thead>
              <tr className="border-b border-gold/10 bg-midnight/50">
                {['النوع', 'الحملة', 'الرابط', 'الانطباعات', 'النقرات', 'CTR', 'الحالة', 'الإجراءات'].map((h) => (
                  <th key={h} className="text-right text-white/40 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ads.map((ad, i) => (
                <tr
                  key={ad.id}
                  className={`border-b border-gold/5 hover:bg-white/2 transition-colors ${i % 2 === 0 ? '' : 'bg-midnight/20'}`}
                >
                  <td className="px-4 py-3">
                    <span className="bg-gold/10 text-gold text-xs px-2 py-1 rounded-lg">
                      {AD_TYPE_LABELS[ad.type] ?? ad.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70">{campaignNameMap[ad.campaignId] ?? '—'}</td>
                  <td className="px-4 py-3 text-white/50 max-w-[160px] truncate">
                    {ad.targetUrl
                      ? <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">{ad.targetUrl}</a>
                      : '—'
                    }
                  </td>
                  <td className="px-4 py-3 text-white/70">{formatNum(ad.impressions)}</td>
                  <td className="px-4 py-3 text-white/70">{formatNum(ad.clicks)}</td>
                  <td className="px-4 py-3 text-white/60">{ctr(ad)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(ad)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        ad.active
                          ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {ad.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      {ad.active ? 'نشط' : 'موقوف'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(ad)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                        title="تعديل"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleting(ad)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      <SlideOver
        open={panelOpen}
        onClose={closePanel}
        title={editing ? 'تعديل الإعلان' : 'إعلان جديد'}
      >
        <AdForm
          initial={editing}
          campaigns={allCampaigns}
          onSave={closePanel}
          onClose={closePanel}
        />
      </SlideOver>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        label={AD_TYPE_LABELS[deleting?.type ?? ''] ?? 'الإعلان'}
      />
    </>
  );
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

function SummaryStats() {
  const { data: campResp } = useSWR<ApiResponse<AdCampaign[]>>(
    '/api/ad-campaigns?pageSize=100',
    swrFetcher
  );
  const { data: adsResp } = useSWR<ApiResponse<Ad[]>>(
    '/api/ads?pageSize=200',
    swrFetcher
  );

  const campaigns = campResp?.data ?? [];
  const ads = adsResp?.data ?? [];

  const totalCampaigns = campResp?.pagination?.total ?? campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard label="إجمالي الحملات" value={totalCampaigns} icon={Megaphone} />
      <StatCard label="الحملات النشطة" value={activeCampaigns} icon={TrendingUp} />
      <StatCard label="الانطباعات" value={formatNum(totalImpressions)} icon={BarChart2} />
      <StatCard label="النقرات" value={formatNum(totalClicks)} icon={MousePointerClick} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'campaigns' | 'ads';

export default function AdsPage() {
  const [tab, setTab] = useState<Tab>('campaigns');

  return (
    <div dir="rtl" className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">
          الإعلانات والحملات
        </h1>
        <p className="text-white/50 mt-1 text-sm font-[family-name:var(--font-display)]">
          إدارة الحملات الإعلانية والإعلانات وتتبع الأداء
        </p>
      </div>

      {/* Summary stats */}
      <SummaryStats />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-midnight rounded-xl border border-gold/10 w-fit mb-6">
        {([
          { key: 'campaigns', label: 'الحملات', icon: Megaphone },
          { key: 'ads', label: 'الإعلانات', icon: BarChart2 },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold font-[family-name:var(--font-display)] transition-all ${
              tab === key
                ? 'bg-gold text-ink shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-midnight/50 border border-gold/10 rounded-2xl p-6">
        <SectionErrorBoundary section="ads-campaigns-table">
          {tab === 'campaigns' ? <CampaignsTab /> : <AdsTab />}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
