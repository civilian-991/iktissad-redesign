'use client';

/**
 * Admin Advertising — /admin/ads
 *
 * Everything on the 2026 rate card that is booked rather than written:
 *   Campaigns     who is buying, how it's billed (CPM or flat fee), dates, booked impressions
 *   Creatives     the banner files for each placement, with the rate card's size/weight specs
 *   Sections      Section Sponsorships — one sponsor per section per period
 *   Reports       end-of-campaign report per advertiser (opens a printable page)
 *
 * Sponsored articles are marked in the article editor; newsletter sponsors in
 * the newsletter builder. Both show up in the advertiser's report.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  X,
  BarChart2,
  MousePointerClick,
  TrendingUp,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  LayoutPanelTop,
  FileBarChart,
  AlertTriangle,
  Users,
  Copy,
  Globe2,
} from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import { csrfJsonHeaders } from '@/lib/csrf-client';
import ImageUploader from '@/components/admin/ImageUploader';
import SectionErrorBoundary from '@/components/admin/SectionErrorBoundary';
import {
  PLACEMENTS,
  PLACEMENT_KEYS,
  parseSize,
  type AdPlacement,
  type AdSize,
} from '@/lib/ads/placements';
import type { Ad, AdCampaign, Advertiser, SectionSponsorship } from '@/lib/ads/admin';
import type { ApiResponse, Section } from '@/types';
import type { AudienceSnapshot } from '@/lib/ads/audience';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AdCampaign['status'], string> = {
  draft: 'مسودة',
  active: 'نشطة',
  paused: 'موقوفة',
  completed: 'مكتملة',
};

const STATUS_COLORS: Record<AdCampaign['status'], string> = {
  draft: 'bg-white/10 text-white/60',
  active: 'bg-emerald-500/15 text-emerald-400',
  paused: 'bg-amber-500/15 text-amber-400',
  completed: 'bg-blue-500/15 text-blue-400',
};

const PRINT_TYPE_LABELS: Record<string, string> = {
  'full-page': 'صفحة كاملة (مجلة)',
  'half-page': 'نصف صفحة (مجلة)',
  banner: 'بانر (مجلة)',
  'sponsor-card': 'بطاقة راعي (مجلة)',
};

/** Rate-card launch prices, used to prefill a new campaign. */
const RATE_PRESETS: { key: AdPlacement; pricingModel: 'cpm' | 'flat'; rateUsd: number }[] = [
  { key: 'homepage_billboard', pricingModel: 'flat', rateUsd: 4500 },
  { key: 'article_leaderboard', pricingModel: 'cpm', rateUsd: 30 },
  { key: 'in_article_mpu', pricingModel: 'cpm', rateUsd: 25 },
  { key: 'sticky_mobile', pricingModel: 'cpm', rateUsd: 20 },
  { key: 'run_of_site', pricingModel: 'cpm', rateUsd: 15 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function send<T>(url: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: await csrfJsonHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'فشل الحفظ');
  return json.data as T;
}

const refresh = (prefix: string) =>
  globalMutate((key: unknown) => typeof key === 'string' && key.startsWith(prefix));

function usd(cents: number | null | undefined) {
  if (cents == null) return '—';
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const toCents = (v: string) => (v.trim() === '' ? null : Math.round(parseFloat(v) * 100));
const fromCents = (c: number | null) => (c == null ? '' : String(c / 100));

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
}

const num = (n: number) => n.toLocaleString('en-US');

function priceLabel(c: AdCampaign) {
  if (c.rateCents == null) return '—';
  return c.pricingModel === 'flat' ? `${usd(c.rateCents)} ثابت` : `${usd(c.rateCents)} CPM`;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-midnight border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm font-[family-name:var(--font-display)] placeholder:text-white/30 focus:outline-none focus:border-gold/60 transition-colors';
const btnPrimary =
  'flex items-center justify-center gap-2 bg-gold text-ink font-bold text-sm rounded-xl px-4 py-2.5 hover:bg-gold/90 disabled:opacity-50 transition-colors font-[family-name:var(--font-display)]';
const btnGhost =
  'px-5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-[family-name:var(--font-display)] transition-colors';

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-white/60 font-[family-name:var(--font-display)]">{label}</label>
      {children}
      {hint && <p className="text-xs text-white/40 font-[family-name:var(--font-display)] leading-relaxed">{hint}</p>}
    </div>
  );
}

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

/** Portaled to <body>: admin cards use backdrop-blur, which would clip a fixed panel. */
function SlideOver({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative me-auto w-full max-w-lg bg-obsidian border-e border-gold/10 h-full flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10 shrink-0">
          <h2 className="text-lg font-bold text-white font-[family-name:var(--font-display)]">{title}</h2>
          <button onClick={onClose} aria-label="إغلاق" className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function ConfirmDialog({ open, onClose, onConfirm, label }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  label: string;
}) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
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
          <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold font-[family-name:var(--font-display)]">
            حذف
          </button>
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-lg py-2.5 text-sm font-[family-name:var(--font-display)]">
            إلغاء
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gold/10">
      <table className="w-full text-sm font-[family-name:var(--font-display)]">
        <thead>
          <tr className="border-b border-gold/10 bg-midnight/50">
            {headers.map((h) => (
              <th key={h} className="text-start text-white/40 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center">
        <Icon size={28} className="text-gold" />
      </div>
      <p className="text-white/40 font-[family-name:var(--font-display)] text-sm">{text}</p>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="text-gold animate-spin" />
    </div>
  );
}

function LoadError() {
  return (
    <div className="flex items-center gap-3 text-red-400 py-12 justify-center">
      <AlertCircle size={20} />
      <span className="font-[family-name:var(--font-display)] text-sm">تعذّر تحميل البيانات</span>
    </div>
  );
}

function RowActions({ onEdit, onDelete, extra }: { onEdit: () => void; onDelete: () => void; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {extra}
      <button onClick={onEdit} title="تعديل" aria-label="تعديل" className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5">
        <Pencil size={15} />
      </button>
      <button onClick={onDelete} title="حذف" aria-label="حذف" className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ─── Shared data ──────────────────────────────────────────────────────────────

function useAdvertisers() {
  const { data } = useSWR<ApiResponse<Advertiser[]>>('/api/advertisers?pageSize=200', swrFetcher);
  return data?.data ?? [];
}

function useCampaigns() {
  return useSWR<ApiResponse<AdCampaign[]>>('/api/ad-campaigns?pageSize=200', swrFetcher);
}

function useWebAds() {
  return useSWR<ApiResponse<Ad[]>>('/api/ads?pageSize=200', swrFetcher);
}

function useSections() {
  const { data } = useSWR<ApiResponse<Section[]>>('/api/sections', swrFetcher, { revalidateOnFocus: false });
  return data?.data ?? [];
}

// ─── Campaign form ────────────────────────────────────────────────────────────

function CampaignForm({ initial, onDone }: { initial: AdCampaign | null; onDone: () => void }) {
  const advertisers = useAdvertisers();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    advertiserId: initial?.advertiserId ?? '',
    startDate: initial?.startDate ?? '',
    endDate: initial?.endDate ?? '',
    status: initial?.status ?? 'draft',
    pricingModel: initial?.pricingModel ?? 'cpm',
    rateUsd: fromCents(initial?.rateCents ?? null),
    impressionGoal: initial?.impressionGoal != null ? String(initial.impressionGoal) : '',
    budgetUsd: fromCents(initial?.budgetCents ?? null),
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyPreset = (key: string) => {
    const p = RATE_PRESETS.find((r) => r.key === key);
    if (p) setForm((f) => ({ ...f, pricingModel: p.pricingModel, rateUsd: String(p.rateUsd) }));
  };

  // Booked value — what the booking is worth at the rate entered.
  const rate = parseFloat(form.rateUsd);
  const goal = parseInt(form.impressionGoal, 10);
  const bookedValue =
    Number.isFinite(rate) && form.pricingModel === 'flat'
      ? rate
      : Number.isFinite(rate) && Number.isFinite(goal)
        ? (rate * goal) / 1000
        : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('الاسم مطلوب');
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        advertiserId: form.advertiserId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
        pricingModel: form.pricingModel,
        rateCents: toCents(form.rateUsd),
        impressionGoal: form.pricingModel === 'cpm' && form.impressionGoal ? parseInt(form.impressionGoal, 10) : null,
        budgetCents: toCents(form.budgetUsd),
      };
      await send(initial ? `/api/ad-campaigns/${initial.id}` : '/api/ad-campaigns', initial ? 'PUT' : 'POST', body);
      toast.success(initial ? 'تم تحديث الحملة' : 'تم إنشاء الحملة');
      await refresh('/api/ad-campaigns');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="اسم الحملة *">
        <input className={inputCls} value={form.name} onChange={set('name')} placeholder="مثال: بنك X — بيلبورد أكتوبر" required />
      </Field>
      <Field label="المعلن">
        <select className={inputCls} value={form.advertiserId} onChange={set('advertiserId')}>
          <option value="">— بدون معلن —</option>
          {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      {!initial && (
        <Field label="سعر من قائمة الأسعار" hint="يملأ طريقة التسعير والسعر؛ يمكن تعديلهما بعد ذلك.">
          <select className={inputCls} defaultValue="" onChange={(e) => applyPreset(e.target.value)}>
            <option value="">— اختر المنتج —</option>
            {RATE_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>{PLACEMENTS[p.key].label} — {PLACEMENTS[p.key].rateHint}</option>
            ))}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="طريقة التسعير">
          <select className={inputCls} value={form.pricingModel} onChange={set('pricingModel')}>
            <option value="cpm">CPM — لكل 1,000 ظهور</option>
            <option value="flat">مبلغ ثابت (حصري)</option>
          </select>
        </Field>
        <Field label={form.pricingModel === 'flat' ? 'المبلغ ($)' : 'سعر CPM ($)'}>
          <input type="number" min="0" step="0.01" className={inputCls} value={form.rateUsd} onChange={set('rateUsd')} placeholder="0" />
        </Field>
      </div>
      {form.pricingModel === 'cpm' && (
        <Field label="الظهورات المحجوزة" hint="تتوقف الحملة عن الظهور تلقائياً عند بلوغ هذا العدد. اتركه فارغاً لعدم التحديد.">
          <input type="number" min="0" step="1000" className={inputCls} value={form.impressionGoal} onChange={set('impressionGoal')} placeholder="مثال: 200000" />
        </Field>
      )}
      {bookedValue != null && (
        <p className="text-xs text-gold/80 font-[family-name:var(--font-display)] -mt-2">
          قيمة الحجز: ${bookedValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="تاريخ البداية">
          <input type="date" className={inputCls} value={form.startDate} onChange={set('startDate')} />
        </Field>
        <Field label="تاريخ النهاية">
          <input type="date" className={inputCls} value={form.endDate} onChange={set('endDate')} />
        </Field>
      </div>
      <Field label="الميزانية ($)" hint="اختياري — للمتابعة الداخلية.">
        <input type="number" min="0" step="0.01" className={inputCls} value={form.budgetUsd} onChange={set('budgetUsd')} />
      </Field>
      <Field label="الحالة" hint="لا تظهر إعلانات الحملة على الموقع إلا وهي «نشطة» وضمن تواريخها.">
        <select className={inputCls} value={form.status} onChange={set('status')}>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className={`${btnPrimary} flex-1 py-3`}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          {initial ? 'حفظ التعديلات' : 'إنشاء الحملة'}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>إلغاء</button>
      </div>
    </form>
  );
}

// ─── Campaigns tab ────────────────────────────────────────────────────────────

function CampaignsTab() {
  const { data: resp, isLoading, error } = useCampaigns();
  const { data: adsResp } = useWebAds();
  const campaigns = resp?.data ?? [];
  const [panel, setPanel] = useState<{ open: boolean; editing: AdCampaign | null }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<AdCampaign | null>(null);

  const delivered = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of adsResp?.data ?? []) m.set(a.campaignId, (m.get(a.campaignId) ?? 0) + a.impressions);
    return m;
  }, [adsResp]);

  const close = () => setPanel({ open: false, editing: null });

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await send(`/api/ad-campaigns/${deleting.id}`, 'DELETE');
      toast.success('تم حذف الحملة وإعلاناتها');
      await Promise.all([refresh('/api/ad-campaigns'), refresh('/api/ads')]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل حذف الحملة');
    } finally {
      setDeleting(null);
    }
  }, [deleting]);

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">{campaigns.length} حملة</p>
        <button onClick={() => setPanel({ open: true, editing: null })} className={btnPrimary}>
          <Plus size={16} /> حملة جديدة
        </button>
      </div>

      {isLoading ? <Loading /> : error ? <LoadError /> : campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} text="لا توجد حملات بعد" />
      ) : (
        <TableShell headers={['الحملة', 'المعلن', 'الفترة', 'السعر', 'التسليم', 'الحالة', '']}>
          {campaigns.map((c) => {
            const done = delivered.get(c.id) ?? 0;
            const pct = c.impressionGoal ? Math.min(100, (done / c.impressionGoal) * 100) : null;
            return (
              <tr key={c.id} className="border-b border-gold/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                <td className="px-4 py-3 text-white/60">{c.advertiserName ?? '—'}</td>
                <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                  {formatDate(c.startDate)}{c.endDate ? <> — {formatDate(c.endDate)}</> : null}
                </td>
                <td className="px-4 py-3 text-white/70 whitespace-nowrap">{priceLabel(c)}</td>
                <td className="px-4 py-3 text-white/70 min-w-[140px]">
                  <span dir="ltr">{num(done)}{c.impressionGoal ? ` / ${num(c.impressionGoal)}` : ''}</span>
                  {pct != null && (
                    <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => setPanel({ open: true, editing: c })}
                    onDelete={() => setDeleting(c)}
                    extra={c.advertiserId ? (
                      <Link
                        href={`/admin/ads/report?advertiser=${c.advertiserId}${c.startDate ? `&from=${c.startDate}` : ''}${c.endDate ? `&to=${c.endDate}` : ''}`}
                        title="التقرير"
                        aria-label="التقرير"
                        className="p-1.5 rounded-lg text-white/40 hover:text-gold hover:bg-white/5"
                      >
                        <FileBarChart size={15} />
                      </Link>
                    ) : null}
                  />
                </td>
              </tr>
            );
          })}
        </TableShell>
      )}

      <SlideOver open={panel.open} onClose={close} title={panel.editing ? 'تعديل الحملة' : 'حملة جديدة'}>
        <CampaignForm key={panel.editing?.id ?? 'new'} initial={panel.editing} onDone={close} />
      </SlideOver>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} label={deleting?.name ?? ''} />
    </>
  );
}

// ─── Creative form ────────────────────────────────────────────────────────────

/**
 * Warns when an uploaded creative doesn't match the placement's size. 2x files
 * are fine (the rate card asks for them); anything else will be scaled.
 */
function useSizeCheck(url: string, expected: AdSize | null) {
  const key = `${url}|${expected}`;
  const [result, setResult] = useState<{ key: string; warning: string | null } | null>(null);
  useEffect(() => {
    const exp = parseSize(expected);
    if (!url || !exp) return;
    const img = new window.Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const ok = (w === exp.width && h === exp.height) || (w === exp.width * 2 && h === exp.height * 2);
      setResult({
        key: `${url}|${expected}`,
        warning: ok ? null : `مقاس الملف ${w}×${h}، والمطلوب ${exp.width}×${exp.height} (أو ضعفه للشاشات عالية الدقة).`,
      });
    };
    img.src = url;
    return () => {
      img.onload = null;
    };
  }, [url, expected]);
  // A result for a previous file never applies to the current one.
  return result?.key === key ? result.warning : null;
}

type Channel = 'web' | 'print';

function CreativeForm({ initial, campaigns, onDone }: { initial: Ad | null; campaigns: AdCampaign[]; onDone: () => void }) {
  const sections = useSections();
  const [channel, setChannel] = useState<Channel>(initial && !initial.placement ? 'print' : 'web');
  const [form, setForm] = useState({
    campaignId: initial?.campaignId ?? '',
    placement: (initial?.placement ?? 'article_leaderboard') as AdPlacement,
    printType: initial?.type ?? 'full-page',
    format: initial?.format ?? 'image',
    imageUrl: initial?.imageUrl ?? '',
    mobileImageUrl: initial?.mobileImageUrl ?? '',
    size: (initial?.size ?? '') as AdSize | '',
    sectionId: initial?.sectionId ?? '',
    weight: String(initial?.weight ?? 1),
    targetUrl: initial?.targetUrl ?? '',
    altText: initial?.altText ?? '',
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const spec = PLACEMENTS[form.placement];
  const isRos = form.placement === 'run_of_site';
  const desktopSize: AdSize | null = isRos ? (form.size || null) : spec.desktopSizes[0] ?? null;
  const mobileSize: AdSize | null = spec.mobileSizes[0] ?? null;
  const mainSize = desktopSize ?? mobileSize;
  const sizeWarning = useSizeCheck(channel === 'web' && form.format === 'image' ? form.imageUrl : '', mainSize);
  const mobileWarning = useSizeCheck(
    channel === 'web' && form.format === 'image' && !isRos ? form.mobileImageUrl : '',
    spec.desktopSizes.length ? mobileSize : null
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.campaignId) return toast.error('اختر الحملة');
    if (!form.imageUrl.trim()) return toast.error(form.format === 'html5' ? 'رابط HTML5 مطلوب' : 'ارفع التصميم');
    if (channel === 'web' && isRos && !form.size) return toast.error('اختر مقاس التصميم');
    setSaving(true);
    try {
      const body =
        channel === 'web'
          ? {
              campaignId: form.campaignId,
              placement: form.placement,
              format: form.format,
              imageUrl: form.imageUrl.trim(),
              mobileImageUrl: form.mobileImageUrl.trim() || null,
              size: desktopSize,
              sectionId: form.sectionId || null,
              weight: Math.max(1, Math.min(100, parseInt(form.weight, 10) || 1)),
              targetUrl: form.targetUrl.trim() || null,
              altText: form.altText.trim() || null,
              active: form.active,
            }
          : {
              campaignId: form.campaignId,
              placement: null,
              type: form.printType,
              imageUrl: form.imageUrl.trim(),
              targetUrl: form.targetUrl.trim() || null,
              altText: form.altText.trim() || null,
              active: form.active,
            };
      await send(initial ? `/api/ads/${initial.id}` : '/api/ads', initial ? 'PUT' : 'POST', body);
      toast.success(initial ? 'تم تحديث الإعلان' : 'تم إنشاء الإعلان');
      await refresh('/api/ads');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  const sizeHint = (
    <>
      سطح المكتب: {spec.desktopSizes.length ? spec.desktopSizes.join('، ') : 'لا يظهر'} · الجوال: {spec.mobileSizes.join('، ')} ·
      الحد الأقصى {spec.maxKb}KB · JPG أو PNG أو GIF أو HTML5 · يُفضَّل ملف بضعف المقاس وتصميم عربي من اليمين لليسار.
    </>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="الحملة *">
        <select className={inputCls} value={form.campaignId} onChange={set('campaignId')} required>
          <option value="">— اختر حملة —</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      <div className="flex gap-1 p-1 bg-midnight rounded-xl border border-gold/10 w-fit">
        {(['web', 'print'] as Channel[]).map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => setChannel(ch)}
            className={`px-4 py-2 rounded-lg text-sm font-bold font-[family-name:var(--font-display)] ${channel === ch ? 'bg-gold text-ink' : 'text-white/50 hover:text-white'}`}
          >
            {ch === 'web' ? 'الموقع' : 'المجلة المطبوعة'}
          </button>
        ))}
      </div>

      {channel === 'web' ? (
        <>
          <Field label="الموضع" hint={sizeHint}>
            <select className={inputCls} value={form.placement} onChange={set('placement')}>
              {PLACEMENT_KEYS.map((k) => (
                <option key={k} value={k}>{PLACEMENTS[k].label} — {PLACEMENTS[k].rateHint}</option>
              ))}
            </select>
          </Field>
          {isRos && (
            <Field label="مقاس التصميم *" hint="يظهر التصميم فقط في المواضع التي تقبل هذا المقاس.">
              <select className={inputCls} value={form.size} onChange={set('size')}>
                <option value="">— اختر —</option>
                {PLACEMENTS.run_of_site.desktopSizes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          )}
          <Field label="نوع التصميم">
            <select className={inputCls} value={form.format} onChange={set('format')}>
              <option value="image">صورة (JPG / PNG / GIF)</option>
              <option value="html5">HTML5 (رابط من خادم المعلن)</option>
            </select>
          </Field>
        </>
      ) : (
        <Field label="نوع إعلان المجلة">
          <select className={inputCls} value={form.printType} onChange={set('printType')}>
            {Object.entries(PRINT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      )}

      {channel === 'web' && form.format === 'html5' ? (
        <Field label="رابط تصميم HTML5 *" hint="يُعرض داخل إطار معزول. يُمرَّر رابط تتبّع النقرات للتصميم كمعامل clickTag.">
          <input className={inputCls} dir="ltr" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://..." />
        </Field>
      ) : (
        <Field label={channel === 'web' ? `التصميم${mainSize ? ` (${mainSize})` : ''} *` : 'التصميم *'}>
          <ImageUploader
            folder="ads"
            currentImage={form.imageUrl || null}
            onUpload={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
            onRemove={() => setForm((f) => ({ ...f, imageUrl: '' }))}
            maxSizeMB={channel === 'web' ? spec.maxKb / 1024 : 10}
            accept="image/jpeg,image/png,image/gif"
            formatHint={channel === 'web' ? `JPG, PNG, GIF حتى ${spec.maxKb}KB` : 'JPG, PNG, GIF'}
            aspectClass="aspect-[3/1]"
            enableEditor={false}
          />
          {sizeWarning && (
            <p className="flex items-start gap-1.5 text-xs text-amber-400 mt-1"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{sizeWarning}</p>
          )}
        </Field>
      )}

      {channel === 'web' && form.format === 'image' && !isRos && spec.desktopSizes.length > 0 && (
        <Field label={`تصميم الجوال (${mobileSize}) — اختياري`} hint="إن لم يُرفع، يُصغَّر تصميم سطح المكتب على الجوال.">
          <ImageUploader
            folder="ads"
            currentImage={form.mobileImageUrl || null}
            onUpload={(url) => setForm((f) => ({ ...f, mobileImageUrl: url }))}
            onRemove={() => setForm((f) => ({ ...f, mobileImageUrl: '' }))}
            maxSizeMB={spec.maxKb / 1024}
            accept="image/jpeg,image/png,image/gif"
            formatHint={`JPG, PNG, GIF حتى ${spec.maxKb}KB`}
            aspectClass="aspect-[3/1]"
            enableEditor={false}
          />
          {mobileWarning && (
            <p className="flex items-start gap-1.5 text-xs text-amber-400 mt-1"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{mobileWarning}</p>
          )}
        </Field>
      )}

      <Field label="الرابط عند النقر">
        <input className={inputCls} dir="ltr" value={form.targetUrl} onChange={set('targetUrl')} placeholder="https://" />
      </Field>
      <Field label="النص البديل">
        <input className={inputCls} value={form.altText} onChange={set('altText')} placeholder="وصف الإعلان لقارئات الشاشة" />
      </Field>

      {channel === 'web' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="استهداف قسم" hint="فارغ = كل الموقع.">
            <select className={inputCls} value={form.sectionId} onChange={set('sectionId')}>
              <option value="">كل الأقسام</option>
              {sections.map((s) => <option key={s.slug} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="وزن التدوير" hint="1–100؛ الأعلى يظهر أكثر.">
            <input type="number" min="1" max="100" className={inputCls} value={form.weight} onChange={set('weight')} />
          </Field>
        </div>
      )}

      <Field label="الحالة">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-[family-name:var(--font-display)] w-fit ${
            form.active ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/50'
          }`}
        >
          {form.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {form.active ? 'نشط' : 'غير نشط'}
        </button>
      </Field>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className={`${btnPrimary} flex-1 py-3`}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          {initial ? 'حفظ التعديلات' : 'إنشاء الإعلان'}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>إلغاء</button>
      </div>
    </form>
  );
}

// ─── Creatives tab ────────────────────────────────────────────────────────────

function CreativesTab() {
  const { data: resp, isLoading, error } = useWebAds();
  const { data: campResp } = useCampaigns();
  const ads = resp?.data ?? [];
  const campaigns = useMemo(() => campResp?.data ?? [], [campResp]);
  const campaignName = useMemo(() => new Map(campaigns.map((c) => [c.id, c.name])), [campaigns]);
  const [panel, setPanel] = useState<{ open: boolean; editing: Ad | null }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<Ad | null>(null);
  const close = () => setPanel({ open: false, editing: null });

  const toggle = async (ad: Ad) => {
    try {
      await send(`/api/ads/${ad.id}`, 'PUT', { active: !ad.active });
      await refresh('/api/ads');
      toast.success(ad.active ? 'تم إيقاف الإعلان' : 'تم تفعيل الإعلان');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل تحديث الحالة');
    }
  };

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await send(`/api/ads/${deleting.id}`, 'DELETE');
      toast.success('تم حذف الإعلان');
      await refresh('/api/ads');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل حذف الإعلان');
    } finally {
      setDeleting(null);
    }
  }, [deleting]);

  const where = (ad: Ad) =>
    ad.placement
      ? `${PLACEMENTS[ad.placement].label}${ad.placement === 'run_of_site' && ad.size ? ` · ${ad.size}` : ''}`
      : PRINT_TYPE_LABELS[ad.type] ?? ad.type;

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">{ads.length} إعلان</p>
        <button onClick={() => setPanel({ open: true, editing: null })} disabled={campaigns.length === 0} className={btnPrimary} title={campaigns.length === 0 ? 'أنشئ حملة أولاً' : undefined}>
          <Plus size={16} /> إعلان جديد
        </button>
      </div>

      {isLoading ? <Loading /> : error ? <LoadError /> : ads.length === 0 ? (
        <EmptyState icon={ImageIcon} text={campaigns.length === 0 ? 'أنشئ حملة أولاً، ثم أضف تصاميمها هنا' : 'لا توجد إعلانات بعد'} />
      ) : (
        <TableShell headers={['التصميم', 'الموضع', 'الحملة', 'الظهور', 'النقرات', 'CTR', 'الحالة', '']}>
          {ads.map((ad) => (
            <tr key={ad.id} className="border-b border-gold/5 hover:bg-white/[0.02]">
              <td className="px-4 py-3">
                {ad.format === 'html5' ? (
                  <span className="text-xs text-white/50 bg-white/5 rounded px-2 py-1">HTML5</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ad.imageUrl} alt="" className="h-10 max-w-[120px] object-contain bg-white/5 rounded" />
                )}
              </td>
              <td className="px-4 py-3 text-white/80 whitespace-nowrap">{where(ad)}</td>
              <td className="px-4 py-3 text-white/60">{campaignName.get(ad.campaignId) ?? '—'}</td>
              <td className="px-4 py-3 text-white/70" dir="ltr">{num(ad.impressions)}</td>
              <td className="px-4 py-3 text-white/70" dir="ltr">{num(ad.clicks)}</td>
              <td className="px-4 py-3 text-white/60" dir="ltr">{ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(2) + '%' : '—'}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => toggle(ad)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                    ad.active ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {ad.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                  {ad.active ? 'نشط' : 'موقوف'}
                </button>
              </td>
              <td className="px-4 py-3">
                <RowActions onEdit={() => setPanel({ open: true, editing: ad })} onDelete={() => setDeleting(ad)} />
              </td>
            </tr>
          ))}
        </TableShell>
      )}

      <SlideOver open={panel.open} onClose={close} title={panel.editing ? 'تعديل الإعلان' : 'إعلان جديد'}>
        <CreativeForm key={panel.editing?.id ?? 'new'} initial={panel.editing} campaigns={campaigns} onDone={close} />
      </SlideOver>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} label="هذا الإعلان" />
    </>
  );
}

// ─── Section sponsorships ─────────────────────────────────────────────────────

function SponsorshipForm({ initial, onDone }: { initial: SectionSponsorship | null; onDone: () => void }) {
  const advertisers = useAdvertisers();
  const sections = useSections();
  const { data: campResp } = useCampaigns();
  const [form, setForm] = useState({
    sectionId: initial?.sectionId ?? '',
    advertiserId: initial?.advertiserId ?? '',
    campaignId: initial?.campaignId ?? '',
    logoUrl: initial?.logoUrl ?? '',
    startDate: initial?.startDate ?? '',
    endDate: initial?.endDate ?? '',
    priceUsd: fromCents(initial?.priceCents ?? null),
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const campaigns = (campResp?.data ?? []).filter((c) => !form.advertiserId || c.advertiserId === form.advertiserId);
  const logoWarning = useSizeCheck(form.logoUrl, '300x100' as AdSize);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sectionId || !form.advertiserId) return toast.error('اختر القسم والمعلن');
    if (!form.startDate || !form.endDate) return toast.error('حدّد الفترة');
    setSaving(true);
    try {
      const body = {
        sectionId: form.sectionId,
        advertiserId: form.advertiserId,
        campaignId: form.campaignId || null,
        logoUrl: form.logoUrl || null,
        startDate: form.startDate,
        endDate: form.endDate,
        priceCents: toCents(form.priceUsd),
        active: form.active,
      };
      await send(initial ? `/api/admin/section-sponsorships/${initial.id}` : '/api/admin/section-sponsorships', initial ? 'PUT' : 'POST', body);
      toast.success(initial ? 'تم تحديث الرعاية' : 'تم حجز القسم');
      await refresh('/api/admin/section-sponsorships');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <p className="text-xs text-white/50 leading-relaxed font-[family-name:var(--font-display)] bg-gold/5 border border-gold/15 rounded-lg p-3">
        يحصل الراعي على: شعاره في رأس صفحة القسم مع عبارة «برعاية»، وأول مستطيل إعلاني (300×250) داخل كل مقال في القسم.
        راعٍ واحد لكل قسم في الفترة نفسها. السعر في قائمة الأسعار: $15,000–$25,000 للربع.
      </p>
      <Field label="القسم *">
        <select className={inputCls} value={form.sectionId} onChange={set('sectionId')}>
          <option value="">— اختر القسم —</option>
          {sections.map((s) => <option key={s.slug} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="المعلن *">
        <select className={inputCls} value={form.advertiserId} onChange={(e) => setForm((f) => ({ ...f, advertiserId: e.target.value, campaignId: '' }))}>
          <option value="">— اختر المعلن —</option>
          {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="حملة تصاميم المستطيل" hint="تصاميم «مستطيل داخل المقال» في هذه الحملة تشغل أول مستطيل في مقالات القسم.">
        <select className={inputCls} value={form.campaignId} onChange={set('campaignId')}>
          <option value="">— بدون —</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="شعار رأس القسم (300×100)" hint="إن تُرك فارغاً يُستخدم شعار المعلن من ملفه.">
        <ImageUploader
          folder="ads"
          currentImage={form.logoUrl || null}
          onUpload={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
          onRemove={() => setForm((f) => ({ ...f, logoUrl: '' }))}
          maxSizeMB={0.5}
          accept="image/png,image/jpeg,image/svg+xml"
          formatHint="PNG شفاف مفضّل"
          aspectClass="aspect-[3/1]"
          enableEditor={false}
        />
        {logoWarning && <p className="flex items-start gap-1.5 text-xs text-amber-400 mt-1"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{logoWarning}</p>}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="من *"><input type="date" className={inputCls} value={form.startDate} onChange={set('startDate')} /></Field>
        <Field label="إلى *"><input type="date" className={inputCls} value={form.endDate} onChange={set('endDate')} /></Field>
      </div>
      <Field label="السعر ($)">
        <input type="number" min="0" step="0.01" className={inputCls} value={form.priceUsd} onChange={set('priceUsd')} placeholder="15000" />
      </Field>
      <Field label="الحالة">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm w-fit ${
            form.active ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/50'
          }`}
        >
          {form.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {form.active ? 'مفعّلة' : 'ملغاة'}
        </button>
      </Field>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className={`${btnPrimary} flex-1 py-3`}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          {initial ? 'حفظ التعديلات' : 'حجز القسم'}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>إلغاء</button>
      </div>
    </form>
  );
}

function SponsorshipsTab() {
  const { data: resp, isLoading, error } = useSWR<ApiResponse<SectionSponsorship[]>>('/api/admin/section-sponsorships', swrFetcher);
  const rows = resp?.data ?? [];
  const [panel, setPanel] = useState<{ open: boolean; editing: SectionSponsorship | null }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<SectionSponsorship | null>(null);
  const close = () => setPanel({ open: false, editing: null });
  const today = new Date().toISOString().slice(0, 10);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await send(`/api/admin/section-sponsorships/${deleting.id}`, 'DELETE');
      toast.success('تم حذف الرعاية');
      await refresh('/api/admin/section-sponsorships');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    } finally {
      setDeleting(null);
    }
  }, [deleting]);

  const state = (r: SectionSponsorship) =>
    !r.active ? ['ملغاة', 'bg-white/10 text-white/50']
      : r.endDate < today ? ['منتهية', 'bg-blue-500/15 text-blue-400']
      : r.startDate > today ? ['محجوزة', 'bg-amber-500/15 text-amber-400']
      : ['جارية', 'bg-emerald-500/15 text-emerald-400'];

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">{rows.length} رعاية</p>
        <button onClick={() => setPanel({ open: true, editing: null })} className={btnPrimary}>
          <Plus size={16} /> رعاية قسم
        </button>
      </div>
      {isLoading ? <Loading /> : error ? <LoadError /> : rows.length === 0 ? (
        <EmptyState icon={LayoutPanelTop} text="لا توجد رعايات أقسام بعد" />
      ) : (
        <TableShell headers={['القسم', 'الراعي', 'الفترة', 'السعر', 'الحالة', '']}>
          {rows.map((r) => {
            const [label, cls] = state(r);
            return (
              <tr key={r.id} className="border-b border-gold/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-white font-medium">{r.sectionName ?? '—'}</td>
                <td className="px-4 py-3 text-white/70">{r.advertiserName ?? '—'}</td>
                <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{formatDate(r.startDate)} — {formatDate(r.endDate)}</td>
                <td className="px-4 py-3 text-white/70">{usd(r.priceCents)}</td>
                <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span></td>
                <td className="px-4 py-3">
                  <RowActions onEdit={() => setPanel({ open: true, editing: r })} onDelete={() => setDeleting(r)} />
                </td>
              </tr>
            );
          })}
        </TableShell>
      )}
      <SlideOver open={panel.open} onClose={close} title={panel.editing ? 'تعديل رعاية القسم' : 'رعاية قسم'}>
        <SponsorshipForm key={panel.editing?.id ?? 'new'} initial={panel.editing} onDone={close} />
      </SlideOver>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} label={`رعاية ${deleting?.sectionName ?? ''}`} />
    </>
  );
}

// ─── Reports tab ──────────────────────────────────────────────────────────────

function ReportsTab() {
  const advertisers = useAdvertisers();
  const today = new Date();
  const [advertiserId, setAdvertiserId] = useState('');
  const [from, setFrom] = useState(new Date(today.getTime() - 29 * 86_400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  return (
    <div className="max-w-xl flex flex-col gap-5">
      <p className="text-white/50 text-sm leading-relaxed font-[family-name:var(--font-display)]">
        تقرير موحّد للمعلن عن فترة: إعلانات العرض (الظهور، النقرات، نسبة النقر، حسب الموضع واليوم)، المحتوى المدفوع
        (المشاهدات، متوسط وقت القراءة، مصادر الزيارات، المشاركات)، رعايات النشرة (التسليم، الفتح، النقر) ورعايات الأقسام.
        يُفتح في صفحة قابلة للطباعة أو الحفظ PDF لإرسالها للعميل.
      </p>
      <Field label="المعلن">
        <select className={inputCls} value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)}>
          <option value="">— اختر المعلن —</option>
          {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="من"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="إلى"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {advertiserId ? (
        <Link href={`/admin/ads/report?advertiser=${advertiserId}&from=${from}&to=${to}`} className={`${btnPrimary} w-fit`}>
          <FileBarChart size={16} /> عرض التقرير
        </Link>
      ) : (
        <span className={`${btnPrimary} w-fit opacity-50 cursor-not-allowed`}><FileBarChart size={16} /> عرض التقرير</span>
      )}
    </div>
  );
}

// ─── Audience tab ─────────────────────────────────────────────────────────────

const countryName = (() => {
  let dn: Intl.DisplayNames | null = null;
  try { dn = new Intl.DisplayNames(['ar'], { type: 'region' }); } catch { /* old browser */ }
  return (code: string) => (code === '??' || !code ? 'غير معروف' : dn?.of(code) ?? code);
})();

const pct0 = (r: number | null) => (r == null ? '—' : `${Math.round(r * 100)}%`);

/**
 * The rate card's "Audience snapshot", measured: page views and visitors
 * (every public page), article reads, country and device split, newsletter
 * subscribers. Can be copied into the rate card or published to /advertise.
 */
function AudienceTab() {
  const dayBefore = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(dayBefore(30));
  const [to, setTo] = useState(dayBefore(1));
  const { data, isLoading, error } = useSWR<ApiResponse<AudienceSnapshot>>(`/api/admin/audience?from=${from}&to=${to}`, swrFetcher);
  const a = data?.data;
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const partial = a && a.daysWithData < a.period.days;
  const topCountries = a?.countries.slice(0, 5) ?? [];
  const otherShare = a ? a.countries.slice(5).reduce((s, c) => s + c.share, 0) : 0;

  const rateCardText = a
    ? [
        `Monthly page views: ${num(a.pageViews)}`,
        `Monthly unique users: ${num(a.visitors)}`,
        `Audience by country: ${topCountries.map((c) => `${c.country} ${pct0(c.share)}`).join(' / ')}${otherShare > 0 ? ` / Other ${pct0(otherShare)}` : ''}`,
        `Mobile share of traffic: ${pct0(a.mobileShare)}`,
        `Newsletter subscribers: ${num(a.newsletter.confirmed)} confirmed (+${num(a.newsletter.unconfirmed)} unconfirmed from the legacy list)`,
        `Period: ${a.period.from} to ${a.period.to}${partial ? ` (tracking covers ${a.daysWithData} of ${a.period.days} days)` : ''}`,
      ].join('\n')
    : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rateCardText);
      toast.success('نُسخت الأرقام');
    } catch {
      toast.error('تعذّر النسخ');
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await send('/api/admin/audience/publish', 'POST');
      toast.success('تم تحديث أرقام صفحة «أعلن معنا»');
      setConfirming(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل النشر');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-white/50 text-sm max-w-2xl leading-relaxed font-[family-name:var(--font-display)]">
          أرقام «لمحة عن الجمهور» في قائمة الأسعار، من قياس الموقع نفسه: كل صفحة عامة تُعدّ مرة لكل زيارة، والزائر الفريد
          معرّف مجهول الهوية لمدة 30 يوماً، والدولة من موقع الشبكة، وتُستبعد برامج الزحف.
        </p>
        <div className="flex items-end gap-3">
          <Field label="من"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="إلى"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </div>

      {isLoading ? <Loading /> : error || !a ? <LoadError /> : (
        <>
          {partial && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300 font-[family-name:var(--font-display)]">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              القياس يغطي {a.daysWithData} يوماً فقط من أصل {a.period.days} في هذه الفترة، فالأرقام الشهرية أقل من الحقيقية حتى يكتمل شهر من القياس.
            </p>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="مشاهدات الصفحات" value={num(a.pageViews)} icon={BarChart2} />
            <StatCard label="زوار فريدون" value={num(a.visitors)} icon={Users} />
            <StatCard label="قراءات المقالات" value={num(a.articleReads)} icon={FileBarChart} />
            <StatCard label="من الجوال" value={pct0(a.mobileShare)} icon={MousePointerClick} />
            <StatCard label="مشتركو النشرة (مؤكَّد)" value={num(a.newsletter.confirmed)} icon={Megaphone} />
          </div>
          <p className="-mt-3 text-xs text-white/40 font-[family-name:var(--font-display)]">
            إضافةً إلى {num(a.newsletter.unconfirmed)} عنوان من القائمة القديمة لم يؤكَّد اشتراكه — لا تُحتسب ضمن الجمهور المُعلَن.
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white font-[family-name:var(--font-display)]"><Globe2 size={15} className="text-gold" /> الجمهور حسب الدولة</h3>
              {a.countries.length === 0 ? <p className="text-sm text-white/40">لا بيانات بعد.</p> : (
                <TableShell headers={['الدولة', 'الزوار', 'النسبة']}>
                  {a.countries.slice(0, 10).map((c) => (
                    <tr key={c.country} className="border-b border-gold/5">
                      <td className="px-4 py-2 text-white/80">{countryName(c.country)}</td>
                      <td className="px-4 py-2 text-white/70" dir="ltr">{num(c.visitors)}</td>
                      <td className="px-4 py-2 text-white/70 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gold" style={{ width: `${c.share * 100}%` }} /></div>
                          <span dir="ltr" className="w-10 text-end">{pct0(c.share)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </TableShell>
              )}
            </div>
            <div>
              <h3 className="mb-3 text-sm font-bold text-white font-[family-name:var(--font-display)]">الأجهزة (حسب المشاهدات)</h3>
              <TableShell headers={['الجهاز', 'المشاهدات', 'النسبة']}>
                {(['mobile', 'desktop', 'tablet'] as const).map((d) => {
                  const row = a.devices.find((x) => x.device === d);
                  return (
                    <tr key={d} className="border-b border-gold/5">
                      <td className="px-4 py-2 text-white/80">{{ mobile: 'جوال', desktop: 'كمبيوتر', tablet: 'جهاز لوحي' }[d]}</td>
                      <td className="px-4 py-2 text-white/70" dir="ltr">{num(row?.views ?? 0)}</td>
                      <td className="px-4 py-2 text-white/70" dir="ltr">{pct0(row?.share ?? 0)}</td>
                    </tr>
                  );
                })}
              </TableShell>
            </div>
          </div>

          <div className="rounded-xl border border-gold/10 bg-midnight p-5">
            <h3 className="mb-2 text-sm font-bold text-white font-[family-name:var(--font-display)]">لقائمة الأسعار</h3>
            <pre dir="ltr" className="whitespace-pre-wrap text-xs text-white/70 leading-relaxed">{rateCardText}</pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={copy} className={btnPrimary}><Copy size={15} /> نسخ</button>
              {confirming ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  ستستبدل الأرقام الأربعة المعروضة للعموم في صفحة «أعلن معنا» بأرقام آخر 30 يوماً المقاسة (الزوار، المشاهدات، مشتركو النشرة، نسبة الجوال).
                  <button onClick={publish} disabled={publishing} className="rounded bg-amber-500 px-3 py-1 font-bold text-ink disabled:opacity-50">
                    {publishing ? '…' : 'تأكيد النشر'}
                  </button>
                  <button onClick={() => setConfirming(false)} className="px-2 text-amber-200/70">إلغاء</button>
                </div>
              ) : (
                <button onClick={() => setConfirming(true)} className={`${btnGhost} py-2.5`}>نشر في صفحة «أعلن معنا»</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function SummaryStats() {
  const { data: campResp } = useCampaigns();
  const { data: adsResp } = useWebAds();
  const campaigns = campResp?.data ?? [];
  const ads = (adsResp?.data ?? []).filter((a) => a.placement);
  const impressions = ads.reduce((s, a) => s + a.impressions, 0);
  const clicks = ads.reduce((s, a) => s + a.clicks, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard label="الحملات النشطة" value={campaigns.filter((c) => c.status === 'active').length} icon={TrendingUp} />
      <StatCard label="إعلانات الموقع النشطة" value={ads.filter((a) => a.active).length} icon={Megaphone} />
      <StatCard label="الظهورات (الكل)" value={num(impressions)} icon={BarChart2} />
      <StatCard label="النقرات (الكل)" value={num(clicks)} icon={MousePointerClick} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'campaigns' | 'creatives' | 'sections' | 'reports' | 'audience';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'campaigns', label: 'الحملات', icon: Megaphone },
  { key: 'creatives', label: 'الإعلانات', icon: ImageIcon },
  { key: 'sections', label: 'رعاية الأقسام', icon: LayoutPanelTop },
  { key: 'reports', label: 'التقارير', icon: FileBarChart },
  { key: 'audience', label: 'الجمهور', icon: Users },
];

export default function AdsPage() {
  const [tab, setTab] = useState<Tab>('campaigns');

  return (
    <div dir="rtl" className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white">الإعلانات والرعايات</h1>
        <p className="text-white/50 mt-1 text-sm font-[family-name:var(--font-display)]">
          الحملات وتصاميم الإعلانات ورعاية الأقسام وتقارير المعلنين. المقالات المدفوعة تُحدَّد من محرر المقال، ورعاية النشرة من محرر النشرة.
        </p>
      </div>

      <SummaryStats />

      <div role="tablist" className="flex flex-wrap gap-1 p-1 bg-midnight rounded-xl border border-gold/10 w-fit mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold font-[family-name:var(--font-display)] transition-all ${
              tab === key ? 'bg-gold text-ink shadow-sm' : 'text-white/50 hover:text-white'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-midnight/50 border border-gold/10 rounded-2xl p-6">
        <SectionErrorBoundary section={`ads-${tab}`}>
          {tab === 'campaigns' && <CampaignsTab />}
          {tab === 'creatives' && <CreativesTab />}
          {tab === 'sections' && <SponsorshipsTab />}
          {tab === 'reports' && <ReportsTab />}
          {tab === 'audience' && <AudienceTab />}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
