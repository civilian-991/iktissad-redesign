'use client';

/**
 * Subscriber Profile — Admin
 * IKTISSAD Design System
 *
 * Full profile with subscription details, admin actions,
 * payment history, and reading activity.
 */

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowRight,
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  CreditCard,
  Loader2,
  AlertTriangle,
  BookOpen,
  BarChart2,
  CheckCircle,
  Trash2,
  Save,
  Key,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { iconSizes } from '@/lib/design-tokens';
import {
  swrFetcher,
  subscriberKey,
  updateSubscriber,
  deleteSubscriber,
  subscriptionPlansKey,
} from '@/lib/api-client';
import type { Subscriber, Payment, SubscriptionPlan, ApiResponse } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function maskId(id: string | null): string {
  if (!id) return '—';
  if (id.length <= 8) return id;
  return id.slice(0, 4) + '••••' + id.slice(-4);
}

const STATUS_CLS: Record<string, string> = {
  active:    'bg-profit/15 text-profit',
  trialing:  'bg-yellow-500/15 text-yellow-400',
  past_due:  'bg-orange-500/15 text-orange-400',
  canceled:  'bg-loss/15 text-loss',
  paused:    'bg-white/10 text-white/50',
  incomplete:'bg-white/10 text-white/40',
};

const PAYMENT_STATUS: Record<string, string> = {
  paid:    'bg-profit/15 text-profit',
  failed:  'bg-loss/15 text-loss',
  pending: 'bg-yellow-500/15 text-yellow-400',
  refunded:'bg-white/10 text-white/50',
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

interface Props {
  id: string;
}

export default function SubscriberProfileClient({ id }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  const { data, isLoading, error, mutate } = useSWR<
    ApiResponse<{ subscriber: Subscriber; payments: Payment[] }>
  >(subscriberKey(id), swrFetcher, { revalidateOnFocus: false });

  const { data: plansData } = useSWR<ApiResponse<SubscriptionPlan[]>>(
    subscriptionPlansKey(),
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const plans = plansData?.data ?? [];

  const subscriber = data?.data?.subscriber;
  const payments = data?.data?.payments ?? [];

  // ─── Admin action state ───────────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Sync notes once loaded
  if (subscriber && notes === '' && subscriber.notes) {
    setNotes(subscriber.notes);
  }

  const handleSave = useCallback(
    async (field: string, data: Record<string, unknown>) => {
      setSaving(field);
      try {
        await updateSubscriber(id, data);
        toast.success(t('admin.subscribers.profile.saveSuccess'));
        mutate();
      } catch {
        toast.error(t('admin.subscribers.profile.saveError'));
      } finally {
        setSaving(null);
      }
    },
    [id, mutate]
  );

  const handleGrantFreeAccess = useCallback(async () => {
    await handleSave('grant', { status: 'active', currentPeriodEnd: null });
  }, [handleSave]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteSubscriber(id);
      toast.success(t('admin.subscribers.profile.deleteSuccess'));
      router.push('/admin/subscribers');
    } catch {
      toast.error(t('admin.subscribers.profile.deleteError'));
    }
  }, [id, router]);

  // ─── Loading / Error ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-gold/50 animate-spin" />
      </div>
    );
  }

  if (error || !subscriber) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={40} className="mx-auto text-loss mb-4" />
        <p className="text-white/50 font-[family-name:var(--font-display)]">
          {t('admin.subscribers.notFound')}
        </p>
        <Link href="/admin/subscribers" className="text-gold text-sm mt-4 inline-block hover:underline">
          {t('admin.subscribers.profile.backToList')}
        </Link>
      </div>
    );
  }

  const statusCls = STATUS_CLS[subscriber.status] ?? STATUS_CLS.incomplete;
  const statusLabel = t(`admin.subscribers.statuses.${subscriber.status}` as Parameters<typeof t>[0]) || subscriber.status;
  const currentPlan = plans.find((p) => p.id === subscriber.planId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back nav */}
      <Link
        href="/admin/subscribers"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors font-[family-name:var(--font-display)] text-sm"
      >
        <ArrowRight size={iconSizes.sm} />
        {t('admin.subscribers.profile.breadcrumb')}
      </Link>

      {/* Profile Header */}
      <div className="bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
            <span className="text-gold text-2xl font-bold font-[family-name:var(--font-display)]">
              {getInitials(subscriber.name, subscriber.email)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold text-white mb-1">
              {subscriber.name ?? subscriber.email}
            </h1>
            <p className="text-white/50 text-sm mb-3">{subscriber.email}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-sm font-[family-name:var(--font-display)] ${statusCls}`}>
                {statusLabel}
              </span>
              {currentPlan && (
                <span className="px-3 py-1 rounded-lg text-sm font-[family-name:var(--font-display)] bg-gold/20 text-gold">
                  {currentPlan.nameAr}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gold/10">
          {[
            { icon: Phone, label: t('admin.subscribers.profile.phone'), value: subscriber.phone ?? '—' },
            { icon: Globe, label: t('admin.subscribers.profile.country'), value: subscriber.countryCode ?? '—' },
            { icon: Calendar, label: t('admin.subscribers.profile.joinDate'), value: new Date(subscriber.createdAt).toLocaleDateString('ar-SA') },
            { icon: Key, label: t('admin.subscribers.profile.gatewayId'), value: maskId(subscriber.gatewayCustomerId) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={12} className="text-white/40" />
                <span className="text-white/40 text-xs font-[family-name:var(--font-display)]">{label}</span>
              </div>
              <p className="text-white/80 text-sm font-[family-name:var(--font-display)]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left col: Subscription + Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Card */}
          <div className="bg-midnight/50 border border-gold/10 rounded-2xl p-6">
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-4">
              {t('admin.subscribers.profile.subscriptionDetails')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: t('admin.subscribers.profile.plan'), value: currentPlan?.nameAr ?? '—' },
                { label: t('admin.subscribers.profile.status'), value: statusLabel },
                {
                  label: t('admin.subscribers.profile.periodStart'),
                  value: subscriber.currentPeriodStart
                    ? new Date(subscriber.currentPeriodStart).toLocaleDateString('ar-SA')
                    : '—',
                },
                {
                  label: t('admin.subscribers.profile.periodEnd'),
                  value: subscriber.currentPeriodEnd
                    ? new Date(subscriber.currentPeriodEnd).toLocaleDateString('ar-SA')
                    : '—',
                },
                {
                  label: t('admin.subscribers.profile.cancelDate'),
                  value: subscriber.canceledAt
                    ? new Date(subscriber.canceledAt).toLocaleDateString('ar-SA')
                    : '—',
                },
                {
                  label: t('admin.subscribers.profile.trialEnd'),
                  value: subscriber.trialEndsAt
                    ? new Date(subscriber.trialEndsAt).toLocaleDateString('ar-SA')
                    : '—',
                },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-1">{label}</p>
                  <p className="text-white text-sm font-[family-name:var(--font-display)]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-midnight/50 border border-gold/10 rounded-2xl p-6">
            <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard size={iconSizes.md} className="text-gold" />
              {t('admin.subscribers.profile.paymentHistory')}
            </h2>
            {payments.length === 0 ? (
              <p className="text-white/40 text-sm font-[family-name:var(--font-display)]">{t('admin.subscribers.profile.noPayments')}</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-3 border-b border-gold/5 last:border-0"
                  >
                    <div>
                      <p className="text-white text-sm font-[family-name:var(--font-display)]">
                        {p.description ?? t('admin.subscribers.profile.subscriptionPayment')}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleDateString('ar-SA')
                          : new Date(p.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-[family-name:var(--font-display)] ${
                          PAYMENT_STATUS[p.status] ?? 'bg-white/10 text-white/50'
                        }`}
                      >
                        {p.status === 'paid' ? t('admin.subscribers.profile.paid') : p.status === 'failed' ? t('admin.subscribers.profile.failed') : p.status}
                      </span>
                      <span className="text-gold font-[family-name:var(--font-display)] text-sm font-bold">
                        {p.amount.toLocaleString('ar-SA')} {t('admin.subscribers.profile.currency')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col: Admin Actions */}
        <div className="space-y-6">
          {/* Change Plan */}
          <div className="bg-midnight/50 border border-gold/10 rounded-2xl p-5">
            <h3 className="text-sm font-[family-name:var(--font-display)] font-bold text-white mb-3">
              {t('admin.subscribers.profile.changePlan')}
            </h3>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-3 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 mb-3"
            >
              <option value="" className="bg-midnight">{t('admin.subscribers.profile.selectPlan')}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id} className="bg-midnight">{p.nameAr}</option>
              ))}
            </select>
            <button
              onClick={() => handleSave('plan', { planId: selectedPlan })}
              disabled={!selectedPlan || saving === 'plan'}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold/20 hover:bg-gold/30 disabled:opacity-50 rounded-lg text-gold text-sm font-[family-name:var(--font-display)] transition-colors"
            >
              {saving === 'plan' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {t('admin.subscribers.profile.save')}
            </button>
          </div>

          {/* Extend Period */}
          <div className="bg-midnight/50 border border-gold/10 rounded-2xl p-5">
            <h3 className="text-sm font-[family-name:var(--font-display)] font-bold text-white mb-3">
              {t('admin.subscribers.profile.extendPeriod')}
            </h3>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-3 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 mb-3"
            />
            <button
              onClick={() => handleSave('period', { currentPeriodEnd: periodEnd })}
              disabled={!periodEnd || saving === 'period'}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold/20 hover:bg-gold/30 disabled:opacity-50 rounded-lg text-gold text-sm font-[family-name:var(--font-display)] transition-colors"
            >
              {saving === 'period' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {t('admin.subscribers.profile.save')}
            </button>
          </div>

          {/* Change Status */}
          <div className="bg-midnight/50 border border-gold/10 rounded-2xl p-5">
            <h3 className="text-sm font-[family-name:var(--font-display)] font-bold text-white mb-3">
              {t('admin.subscribers.profile.changeStatus')}
            </h3>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-3 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 mb-3"
            >
              <option value="" className="bg-midnight">{t('admin.subscribers.profile.selectStatus')}</option>
              <option value="active" className="bg-midnight">{t('admin.subscribers.statuses.active')}</option>
              <option value="paused" className="bg-midnight">{t('admin.subscribers.statuses.paused')}</option>
              <option value="canceled" className="bg-midnight">{t('admin.subscribers.statuses.canceled')}</option>
            </select>
            <button
              onClick={() => handleSave('status', { status: newStatus })}
              disabled={!newStatus || saving === 'status'}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold/20 hover:bg-gold/30 disabled:opacity-50 rounded-lg text-gold text-sm font-[family-name:var(--font-display)] transition-colors"
            >
              {saving === 'status' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {t('admin.subscribers.profile.save')}
            </button>
          </div>

          {/* Grant Free Access */}
          <div className="bg-midnight/50 border border-gold/10 rounded-2xl p-5">
            <h3 className="text-sm font-[family-name:var(--font-display)] font-bold text-white mb-1">
              {t('admin.subscribers.profile.grantFreeAccess')}
            </h3>
            <p className="text-white/40 text-xs font-[family-name:var(--font-display)] mb-3">
              {t('admin.subscribers.profile.grantFreeAccessDesc')}
            </p>
            <button
              onClick={handleGrantFreeAccess}
              disabled={saving === 'grant'}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-profit/20 hover:bg-profit/30 disabled:opacity-50 rounded-lg text-profit text-sm font-[family-name:var(--font-display)] transition-colors"
            >
              {saving === 'grant' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {t('admin.subscribers.profile.activate')}
            </button>
          </div>

          {/* Add Note */}
          <div className="bg-midnight/50 border border-gold/10 rounded-2xl p-5">
            <h3 className="text-sm font-[family-name:var(--font-display)] font-bold text-white mb-3">
              {t('admin.subscribers.profile.adminNotes')}
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t('admin.subscribers.profile.notesPlaceholder')}
              className="w-full bg-white/5 border border-gold/10 rounded-lg py-2.5 px-3 text-white font-[family-name:var(--font-display)] text-sm focus:outline-none focus:border-gold/30 resize-none mb-3 placeholder:text-white/30"
            />
            <button
              onClick={() => handleSave('notes', { notes })}
              disabled={saving === 'notes'}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold/20 hover:bg-gold/30 disabled:opacity-50 rounded-lg text-gold text-sm font-[family-name:var(--font-display)] transition-colors"
            >
              {saving === 'notes' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {t('admin.subscribers.profile.saveNote')}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-loss/5 border border-loss/20 rounded-2xl p-5">
            <h3 className="text-sm font-[family-name:var(--font-display)] font-bold text-loss mb-3">
              {t('admin.subscribers.profile.dangerZone')}
            </h3>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-loss/10 hover:bg-loss/20 rounded-lg text-loss text-sm font-[family-name:var(--font-display)] transition-colors"
              >
                <Trash2 size={14} />
                {t('admin.subscribers.delete')}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-white/60 text-xs font-[family-name:var(--font-display)]">
                  {t('admin.subscribers.profile.deleteConfirm')}
                </p>
                <button
                  onClick={handleDelete}
                  className="w-full py-2.5 bg-loss/20 hover:bg-loss/30 rounded-lg text-loss text-sm font-[family-name:var(--font-display)] transition-colors"
                >
                  {t('admin.subscribers.profile.confirmDelete')}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="w-full py-2 text-white/50 hover:text-white text-sm font-[family-name:var(--font-display)] transition-colors"
                >
                  {t('common.actions.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
