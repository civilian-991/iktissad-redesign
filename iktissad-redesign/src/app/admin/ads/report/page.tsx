'use client';

/**
 * Advertiser report — /admin/ads/report?advertiser=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * The end-of-campaign report the rate card promises (§9), in one page the
 * sales team can print or save as PDF for the client: display delivery,
 * sponsored-content performance, newsletter sponsorships and section
 * sponsorships for the period.
 */

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Printer, AlertCircle, Plus, Trash2, ExternalLink } from 'lucide-react';
import { swrFetcher } from '@/lib/api-client';
import { csrfJsonHeaders } from '@/lib/csrf-client';
import { SOCIAL_PLATFORMS, type SocialPost } from '@/lib/ads/social';
import { PLACEMENTS, type AdPlacement } from '@/lib/ads/placements';
import type { AdvertiserReport, CampaignReport } from '@/lib/ads/report-types';
import type { ApiResponse } from '@/types';

const num = (n: number) => n.toLocaleString('en-US');
const pct = (r: number | null) => (r == null ? '—' : `${(r * 100).toFixed(2)}%`);
const usd = (c: number | null) =>
  c == null ? '—' : '$' + (c / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const date = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
const duration = (s: number | null) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

const placementLabel = (p: string) => PLACEMENTS[p as AdPlacement]?.label ?? p;

const SOURCE_LABELS: Record<string, string> = {
  direct: 'مباشر',
  google: 'Google',
  facebook: 'Facebook',
  x: 'X',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  internal: 'داخل الموقع',
  other: 'أخرى',
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-200 rounded-lg p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900" dir="ltr" style={{ textAlign: 'right' }}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 break-inside-avoid-page">
      <h2 className="mb-4 border-b-2 border-[#DDA853] pb-2 text-lg font-bold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-neutral-500">
            {headers.map((h) => <th key={h} className="px-2 py-2 text-start font-medium whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="text-neutral-800">{children}</tbody>
      </table>
    </div>
  );
}

const td = 'px-2 py-2 border-b border-neutral-100 align-top';
const tdNum = `${td} whitespace-nowrap tabular-nums`;

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-neutral-500">{text}</p>;
}

/** Daily delivery as bars inside the table — reads cleanly when printed. */
function DailyDelivery({ daily }: { daily: CampaignReport['daily'] }) {
  if (daily.length === 0) return null;
  const max = Math.max(...daily.map((d) => d.impressions), 1);
  return (
    <div className="mt-4">
      <p className="mb-1 text-sm text-neutral-600">التسليم اليومي</p>
      <Table headers={['اليوم', 'الظهور', '', 'النقرات']}>
        {daily.map((d) => (
          <tr key={d.day}>
            <td className={tdNum}>{d.day}</td>
            <td className={tdNum}>{num(d.impressions)}</td>
            <td className={`${td} w-1/2`}>
              <div className="h-2.5 rounded-sm bg-[#183B4E]" style={{ width: `${(d.impressions / max) * 100}%` }} aria-hidden />
            </td>
            <td className={tdNum}>{num(d.clicks)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function Report({ report }: { report: AdvertiserReport }) {
  const { advertiser, period, totals, campaigns, content, newsletters, sections } = report;

  return (
    <div className="ad-report bg-white text-neutral-900 rounded-xl p-8 sm:p-10 shadow-xl" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6">
        <div>
          <p className="text-sm font-bold text-[#C49240]">الإقتصاد والأعمال — تقرير المعلن</p>
          <h1 className="mt-1 text-2xl font-black">{advertiser.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            الفترة: {date(period.from)} — {date(period.to)}
          </p>
        </div>
        {advertiser.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={advertiser.logoUrl} alt={advertiser.name} className="h-14 w-auto max-w-[180px] object-contain" />
        )}
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="الظهورات" value={num(totals.impressions)} />
        <Stat label="النقرات" value={num(totals.clicks)} />
        <Stat label="نسبة النقر" value={pct(totals.ctr)} />
        <Stat label="قراءات المحتوى المدفوع" value={num(totals.contentViews)} />
        <Stat label="نقرات رعاية النشرة" value={num(totals.newsletterSponsorClicks)} />
      </div>
      {totals.socialReach != null && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="وصول منشورات التواصل" value={num(totals.socialReach)} />
        </div>
      )}

      <Section title="الإعلانات (العرض)">
        {campaigns.length === 0 ? <Empty text="لا توجد حملات عرض لهذا المعلن." /> : campaigns.map((c) => (
          <div key={c.campaign.id} className="mb-8 last:mb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-bold">{c.campaign.name}</h3>
              <p className="text-xs text-neutral-500">
                {date(c.campaign.startDate)} — {date(c.campaign.endDate)} ·{' '}
                {c.campaign.pricingModel === 'flat' ? `مبلغ ثابت ${usd(c.campaign.rateCents)}` : `${usd(c.campaign.rateCents)} CPM`}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat
                label={c.campaign.impressionGoal ? `الظهور / المحجوز (${num(c.campaign.impressionGoal)})` : 'الظهور'}
                value={num(c.impressions)}
              />
              <Stat label="النقرات" value={num(c.clicks)} />
              <Stat label="نسبة النقر" value={pct(c.ctr)} />
              <Stat label="القيمة المسلَّمة" value={usd(c.valueCents)} />
            </div>
            {c.byPlacement.length > 0 && (
              <div className="mt-4">
                <Table headers={['الموضع', 'الظهور', 'النقرات', 'نسبة النقر']}>
                  {c.byPlacement.map((p) => (
                    <tr key={p.placement}>
                      <td className={td}>{placementLabel(p.placement)}</td>
                      <td className={tdNum}>{num(p.impressions)}</td>
                      <td className={tdNum}>{num(p.clicks)}</td>
                      <td className={tdNum}>{pct(p.impressions ? p.clicks / p.impressions : null)}</td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
            <DailyDelivery daily={c.daily} />
          </div>
        ))}
        <p className="mt-4 text-xs text-neutral-400">
          الظهور = عرض نصف الإعلان على الأقل لمدة ثانية متواصلة (معيار IAB للمشاهدة). تُستبعد زيارات برامج الزحف.
        </p>
      </Section>

      <Section title="المحتوى المدفوع">
        {content.length === 0 ? <Empty text="لا توجد مقالات مدفوعة لهذا المعلن." /> : (
          <Table headers={['المقال', 'النشر', 'قراءات الفترة', 'الإجمالي', 'متوسط القراءة', 'أكملوا القراءة', 'مصادر الزيارات', 'المشاركات']}>
            {content.map((a) => (
              <tr key={a.id}>
                <td className={`${td} min-w-[220px]`}>
                  <a href={`/${a.slug}`} target="_blank" rel="noopener" className="font-medium hover:underline">{a.title}</a>
                  <span className="block text-xs text-neutral-500">
                    {a.sponsorship === 'partner' ? 'محتوى شريك' : 'محتوى مدفوع'}
                    {a.status !== 'published' ? ' · غير منشور' : ''}
                  </span>
                </td>
                <td className={`${td} whitespace-nowrap`}>{date(a.publishedAt)}</td>
                <td className={tdNum}>{num(a.views)}</td>
                <td className={tdNum}>{num(a.lifetimeViews)}</td>
                <td className={tdNum}>{duration(a.avgReadSeconds)}</td>
                <td className={tdNum}>{pct(a.readThroughRate)}</td>
                <td className={td}>
                  {a.topReferrers.length === 0 ? '—' : a.topReferrers.map((r) => (
                    <span key={r.source} className="block whitespace-nowrap">{SOURCE_LABELS[r.source] ?? r.source}: {num(r.count)}</span>
                  ))}
                </td>
                <td className={td}>
                  {a.shares.length === 0 ? '—' : a.shares.map((s) => (
                    <span key={s.platform} className="block whitespace-nowrap">{s.platform}: {num(s.count)}</span>
                  ))}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {content.length > 0 && (
        <Section title="منشورات التواصل الاجتماعي">
          <p className="mb-4 text-xs text-neutral-500">
            المنشور الترويجي المشمول مع كل محتوى مدفوع. الوصول والتفاعل منقولان من لوحة إحصاءات كل منصة.
          </p>
          {content.map((a) => (
            <SocialPosts key={a.id} articleId={a.id} title={a.title} posts={a.socialPosts} />
          ))}
        </Section>
      )}

      <Section title="رعاية النشرة البريدية">
        {newsletters.length === 0 ? <Empty text="لا توجد رعايات نشرة في هذه الفترة." /> : (
          <Table headers={['العدد', 'الإرسال', 'التسليم', 'نسبة الفتح', 'نسبة النقر', 'نقرات الراعي']}>
            {newsletters.map((n) => (
              <tr key={n.id}>
                <td className={td}>{n.title}</td>
                <td className={`${td} whitespace-nowrap`}>{n.sentAt ? date(n.sentAt) : 'لم يُرسل بعد'}</td>
                <td className={tdNum}>{num(n.delivered)}</td>
                <td className={tdNum}>{pct(n.openRate)}</td>
                <td className={tdNum}>{pct(n.clickRate)}</td>
                <td className={tdNum}>{num(n.sponsorClicks)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="رعاية الأقسام">
        {sections.length === 0 ? <Empty text="لا توجد رعايات أقسام في هذه الفترة." /> : (
          <Table headers={['القسم', 'من', 'إلى', 'السعر']}>
            {sections.map((s) => (
              <tr key={s.id}>
                <td className={td}>{s.sectionName}</td>
                <td className={`${td} whitespace-nowrap`}>{date(s.startDate)}</td>
                <td className={`${td} whitespace-nowrap`}>{date(s.endDate)}</td>
                <td className={tdNum}>{usd(s.priceCents)}</td>
              </tr>
            ))}
          </Table>
        )}
        {sections.length > 0 && (
          <p className="mt-3 text-xs text-neutral-500">
            أداء المستطيل المحجوز للراعي داخل مقالات القسم مدرج في جدول الإعلانات أعلاه تحت «مستطيل داخل المقال».
          </p>
        )}
      </Section>

      <footer className="mt-12 border-t border-neutral-200 pt-4 text-xs text-neutral-400">
        أُعدّ في {date(new Date().toISOString())} · iktissad.com
      </footer>
    </div>
  );
}

const PLATFORM_LABELS: Record<SocialPost['platform'], string> = {
  twitter: 'X',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  tiktok: 'TikTok',
};

const refreshReport = () =>
  globalMutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/ad-reports'));

async function sendJson(url: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: await csrfJsonHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'فشل الحفظ');
}

const intOrNull = (v: string) => (v.trim() === '' ? null : Math.max(0, parseInt(v.replace(/[^\d]/g, ''), 10) || 0));
const fieldCls = 'rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900';

/** Reach/engagement is typed in from each platform's dashboard; editable on screen, plain text in print. */
function MetricCell({ post, field }: { post: SocialPost; field: 'reach' | 'engagements' }) {
  const [value, setValue] = useState(post[field] == null ? '' : String(post[field]));
  const save = async () => {
    const next = intOrNull(value);
    if (next === post[field]) return;
    try {
      await sendJson(`/api/admin/social-posts/${post.id}`, 'PUT', { [field]: next });
      await refreshReport();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  };
  return (
    <>
      <input
        inputMode="numeric"
        dir="ltr"
        aria-label={field === 'reach' ? 'الوصول' : 'التفاعل'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="—"
        className={`${fieldCls} no-print w-28`}
      />
      <span className="print-only">{post[field] == null ? '—' : num(post[field]!)}</span>
    </>
  );
}

function SocialPosts({ articleId, title, posts }: { articleId: string; title: string; posts: SocialPost[] }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ platform: 'linkedin' as SocialPost['platform'], postUrl: '', postedAt: '', reach: '', engagements: '' });
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await sendJson('/api/admin/social-posts', 'POST', {
        articleId,
        platform: form.platform,
        postUrl: form.postUrl.trim() || null,
        postedAt: form.postedAt || null,
        reach: intOrNull(form.reach),
        engagements: intOrNull(form.engagements),
      });
      toast.success('تم تسجيل المنشور');
      setAdding(false);
      setForm({ platform: 'linkedin', postUrl: '', postedAt: '', reach: '', engagements: '' });
      await refreshReport();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await sendJson(`/api/admin/social-posts/${id}`, 'DELETE');
      await refreshReport();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  return (
    <div className="mb-6 last:mb-0">
      <p className="mb-2 text-sm font-medium">{title}</p>
      {posts.length === 0 ? (
        <p className="text-sm text-neutral-500">لم يُسجَّل منشور بعد.</p>
      ) : (
        <Table headers={['المنصة', 'التاريخ', 'الرابط', 'الوصول', 'التفاعل', '']}>
          {posts.map((p) => (
            <tr key={p.id}>
              <td className={td}>{PLATFORM_LABELS[p.platform] ?? p.platform}</td>
              <td className={`${td} whitespace-nowrap`}>{date(p.postedAt)}</td>
              <td className={td}>
                {p.postUrl ? (
                  <a href={p.postUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 hover:underline" dir="ltr">
                    <ExternalLink size={12} /> {new URL(p.postUrl).hostname.replace(/^www\./, '')}
                  </a>
                ) : '—'}
              </td>
              <td className={tdNum}><MetricCell post={p} field="reach" /></td>
              <td className={tdNum}><MetricCell post={p} field="engagements" /></td>
              <td className={`${td} no-print`}>
                {p.manual && (
                  <button onClick={() => remove(p.id)} aria-label="حذف المنشور" title="حذف" className="text-neutral-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {adding ? (
        <form onSubmit={add} className="no-print mt-3 flex flex-wrap items-end gap-2 rounded border border-neutral-200 bg-neutral-50 p-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            المنصة
            <select className={fieldCls} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as SocialPost['platform'] })}>
              {SOCIAL_PLATFORMS.map((pl) => <option key={pl} value={pl}>{PLATFORM_LABELS[pl]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            رابط المنشور
            <input type="url" dir="ltr" className={`${fieldCls} w-64`} value={form.postUrl} onChange={(e) => setForm({ ...form, postUrl: e.target.value })} placeholder="https://" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            التاريخ
            <input type="date" className={fieldCls} value={form.postedAt} onChange={(e) => setForm({ ...form, postedAt: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            الوصول
            <input inputMode="numeric" dir="ltr" className={`${fieldCls} w-28`} value={form.reach} onChange={(e) => setForm({ ...form, reach: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            التفاعل
            <input inputMode="numeric" dir="ltr" className={`${fieldCls} w-28`} value={form.engagements} onChange={(e) => setForm({ ...form, engagements: e.target.value })} />
          </label>
          <button type="submit" disabled={saving} className="rounded bg-[#183B4E] px-3 py-1.5 text-sm text-white disabled:opacity-50">
            {saving ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
          <button type="button" onClick={() => setAdding(false)} className="px-2 py-1.5 text-sm text-neutral-500">إلغاء</button>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="no-print mt-2 inline-flex items-center gap-1 text-sm text-[#C49240] hover:underline">
          <Plus size={14} /> تسجيل منشور
        </button>
      )}
    </div>
  );
}

function ReportPage() {
  const router = useRouter();
  const params = useSearchParams();
  const advertiser = params.get('advertiser') ?? '';
  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');

  const qs = new URLSearchParams({ advertiserId: advertiser });
  if (params.get('from')) qs.set('from', params.get('from')!);
  if (params.get('to')) qs.set('to', params.get('to')!);

  const { data, error, isLoading } = useSWR<ApiResponse<AdvertiserReport>>(
    advertiser ? `/api/admin/ad-reports?${qs}` : null,
    swrFetcher
  );

  const apply = () => {
    const next = new URLSearchParams({ advertiser });
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    router.replace(`/admin/ads/report?${next}`);
  };

  const inputCls = 'bg-midnight border border-gold/20 rounded-lg px-3 py-2 text-white text-sm';

  return (
    <div dir="rtl" className="max-w-5xl mx-auto">
      <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
        <Link href="/admin/ads" className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowRight size={16} /> الإعلانات والرعايات
        </Link>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-white/50">
            من
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/50">
            إلى
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button onClick={apply} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15">تحديث</button>
          <button
            onClick={() => window.print()}
            disabled={!data?.data}
            className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-ink hover:bg-gold/90 disabled:opacity-50"
          >
            <Printer size={15} /> طباعة / PDF
          </button>
        </div>
      </div>

      {!advertiser ? (
        <p className="text-white/60">اختر معلناً من صفحة الإعلانات.</p>
      ) : isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="text-gold animate-spin" size={32} /></div>
      ) : error || !data?.data ? (
        <div className="flex items-center gap-2 text-red-400"><AlertCircle size={18} /> تعذّر تحميل التقرير</div>
      ) : (
        <Report report={data.data} />
      )}

      {/* Print only the report, not the admin chrome. */}
      <style>{`
        .ad-report .print-only { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          .ad-report, .ad-report * { visibility: visible !important; }
          .ad-report { position: absolute; inset: 0; box-shadow: none; border-radius: 0; padding: 0; }
          .ad-report .no-print { display: none !important; }
          .ad-report .print-only { display: inline !important; }
          @page { margin: 16mm; }
        }
      `}</style>
    </div>
  );
}

export default function AdvertiserReportPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="text-gold animate-spin" size={32} /></div>}>
      <ReportPage />
    </Suspense>
  );
}
