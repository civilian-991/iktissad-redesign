'use client';

/**
 * Social account onboarding for Phase 10.3 auto-posting.
 * Backs `social_accounts` table — Twitter, LinkedIn, Telegram tokens.
 */

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Twitter,
  Linkedin,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  X,
  Power,
  PowerOff,
  KeyRound,
} from 'lucide-react';
import { useFormatters } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import {
  swrFetcher,
  socialAccountsKey,
  createSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
} from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { SocialAccount } from '@/app/api/admin/social-accounts/route';

type Platform = 'twitter' | 'linkedin' | 'telegram';

const PLATFORM_META: Record<Platform, { label: string; icon: React.ElementType; color: string }> = {
  twitter:  { label: 'Twitter / X',   icon: Twitter,  color: 'text-sky-400' },
  linkedin: { label: 'LinkedIn',      icon: Linkedin, color: 'text-blue-400' },
  telegram: { label: 'Telegram',      icon: Send,     color: 'text-cyan-400' },
};

interface FormState {
  platform: Platform;
  accountName: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
}

const EMPTY_FORM: FormState = {
  platform: 'twitter',
  accountName: '',
  accessToken: '',
  refreshToken: '',
  tokenExpiresAt: '',
};

export default function SocialAccountsClient() {
  const { fmtDate } = useFormatters();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, mutate } = useSWR<ApiResponse<SocialAccount[]>>(
    socialAccountsKey(),
    swrFetcher,
    { revalidateOnFocus: false },
  );

  const accounts = data?.data ?? [];

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountName.trim() || !form.accessToken.trim()) {
      toast.error('الاسم والـ access token مطلوبان');
      return;
    }
    setSaving(true);
    try {
      await createSocialAccount({
        platform: form.platform,
        accountName: form.accountName.trim(),
        accessToken: form.accessToken.trim(),
        refreshToken: form.refreshToken.trim() || undefined,
        tokenExpiresAt: form.tokenExpiresAt || undefined,
      });
      toast.success('تم ربط الحساب');
      setForm(EMPTY_FORM);
      setModalOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الاتصال');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (acc: SocialAccount) => {
    try {
      await updateSocialAccount(acc.id, { active: !acc.active });
      toast.success(acc.active ? 'تم إيقاف الحساب' : 'تم تفعيل الحساب');
      mutate();
    } catch {
      toast.error('فشلت العملية');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا الحساب الاجتماعي؟ سيتوقف النشر التلقائي عليه فوراً.')) return;
    try {
      await deleteSocialAccount(id);
      toast.success('تم الحذف');
      mutate();
    } catch {
      toast.error('فشل الحذف');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
            الحسابات الاجتماعية
          </h1>
          <p className="text-white/50 text-sm font-[family-name:var(--font-display)]">
            إدارة tokens النشر التلقائي على Twitter / LinkedIn / Telegram
          </p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/90 transition-colors"
        >
          <Plus size={iconSizes.md} />
          ربط حساب جديد
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-gold animate-spin" size={32} />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-midnight/50 border border-gold/10 rounded-xl p-8 text-center">
          <KeyRound size={40} className="mx-auto text-white/20 mb-3" />
          <p className="text-white/60 font-[family-name:var(--font-display)] mb-1">
            لا توجد حسابات مربوطة
          </p>
          <p className="text-white/40 text-sm font-[family-name:var(--font-display)]">
            اربط أول حساب لتفعيل النشر التلقائي عند نشر المقالات
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const meta = PLATFORM_META[acc.platform];
            const Icon = meta.icon;
            const expired = acc.tokenExpiresAt && new Date(acc.tokenExpiresAt) < new Date();

            return (
              <div
                key={acc.id}
                className="bg-midnight/50 border border-gold/10 rounded-xl p-5 space-y-4 hover:border-gold/25 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${meta.color}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-white font-[family-name:var(--font-display)] font-semibold text-sm">
                        {meta.label}
                      </p>
                      <p className="text-white/50 text-xs" dir="ltr">{acc.accountName}</p>
                    </div>
                  </div>
                  {acc.active ? (
                    <span className="px-2 py-0.5 bg-gain/15 border border-gain/30 rounded-full text-gain text-[10px] font-[family-name:var(--font-display)]">
                      نشط
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-white/50 text-[10px] font-[family-name:var(--font-display)]">
                      موقوف
                    </span>
                  )}
                </div>

                <div className="text-xs text-white/40 font-[family-name:var(--font-display)] space-y-1">
                  <div className="flex justify-between">
                    <span>تاريخ الربط</span>
                    <span className="text-white/60">{fmtDate(acc.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>انتهاء الـ token</span>
                    <span className={expired ? 'text-loss' : 'text-white/60'}>
                      {acc.tokenExpiresAt
                        ? fmtDate(acc.tokenExpiresAt, { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gold/5">
                  <button
                    onClick={() => handleToggleActive(acc)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 border border-gold/10 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors text-xs font-[family-name:var(--font-display)]"
                  >
                    {acc.active ? <PowerOff size={12} /> : <Power size={12} />}
                    {acc.active ? 'إيقاف' : 'تفعيل'}
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="px-3 py-2 bg-loss/10 border border-loss/20 rounded-lg text-loss hover:bg-loss/20 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => mutate()}
        className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs font-[family-name:var(--font-display)] transition-colors"
      >
        <RefreshCw size={12} />
        تحديث
      </button>

      {/* Add modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !saving && setModalOpen(false)}
        >
          <form
            onSubmit={handleConnect}
            onClick={(e) => e.stopPropagation()}
            className="bg-midnight border border-gold/20 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-midnight/95 backdrop-blur-md border-b border-gold/10 p-4 flex items-center justify-between">
              <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
                ربط حساب جديد
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 font-[family-name:var(--font-display)]">
              <div>
                <label className="block text-white/60 text-xs mb-2">المنصة</label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as Platform }))}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-gold/30"
                >
                  <option value="twitter" className="bg-midnight">Twitter / X</option>
                  <option value="linkedin" className="bg-midnight">LinkedIn</option>
                  <option value="telegram" className="bg-midnight">Telegram</option>
                </select>
              </div>

              <div>
                <label className="block text-white/60 text-xs mb-2">
                  اسم الحساب / المعرّف
                </label>
                <input
                  type="text"
                  value={form.accountName}
                  onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                  placeholder={
                    form.platform === 'twitter' ? '@iktissadonline' :
                    form.platform === 'telegram' ? '@iktissad_channel' :
                    'IKTISSAD Online'
                  }
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/30"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-white/60 text-xs mb-2">
                  Access Token
                </label>
                <textarea
                  value={form.accessToken}
                  onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                  rows={3}
                  className="w-full bg-white/5 border border-gold/10 rounded-xl py-3 px-4 text-white text-xs font-mono placeholder:text-white/30 focus:outline-none focus:border-gold/30 resize-none"
                  dir="ltr"
                  placeholder="paste-token-here"
                />
                <p className="text-white/40 text-xs mt-1">
                  يُحفظ الـ token مشفّراً ويُستخدم خادمياً فقط. لا يظهر في الواجهة بعد الحفظ.
                </p>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-white/60 hover:text-white">
                  حقول اختيارية (refresh token / تاريخ الانتهاء)
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-white/60 text-xs mb-2">Refresh Token</label>
                    <input
                      type="text"
                      value={form.refreshToken}
                      onChange={(e) => setForm((f) => ({ ...f, refreshToken: e.target.value }))}
                      className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-xs font-mono focus:outline-none focus:border-gold/30"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs mb-2">تاريخ انتهاء الـ token</label>
                    <input
                      type="datetime-local"
                      value={form.tokenExpiresAt}
                      onChange={(e) => setForm((f) => ({ ...f, tokenExpiresAt: e.target.value }))}
                      className="w-full bg-white/5 border border-gold/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-gold/30"
                    />
                  </div>
                </div>
              </details>
            </div>

            <div className="sticky bottom-0 bg-midnight/95 backdrop-blur-md border-t border-gold/10 p-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 bg-white/5 border border-gold/10 text-white/70 rounded-lg font-[family-name:var(--font-display)] text-sm hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-gold text-obsidian rounded-lg font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-gold/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
