'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Crown,
  Star,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Calendar,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  name_ar: string;
  price_monthly: number;
  price_annual: number | null;
}

interface Subscriber {
  id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'incomplete';
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  plan_id: string | null;
  subscription_plans: Plan | null;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  description: string | null;
}

interface Props {
  subscriber: Subscriber | null;
  payments: Payment[];
  userEmail: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function StatusBadge({ status }: { status: Subscriber['status'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'نشط', cls: 'bg-profit/10 text-profit' },
    trialing: { label: 'تجريبي', cls: 'bg-brand-50 text-brand' },
    past_due: { label: 'متأخر السداد', cls: 'bg-loss/10 text-loss' },
    canceled: { label: 'ملغى', cls: 'bg-slate-200 text-charcoal' },
    paused: { label: 'موقوف', cls: 'bg-gold/10 text-gold-dark' },
    incomplete: { label: 'غير مكتمل', cls: 'bg-slate-200 text-pewter' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-200 text-pewter' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: 'مدفوع', cls: 'bg-profit/10 text-profit' },
    succeeded: { label: 'ناجح', cls: 'bg-profit/10 text-profit' },
    pending: { label: 'قيد المعالجة', cls: 'bg-gold/10 text-gold-dark' },
    failed: { label: 'فشل', cls: 'bg-loss/10 text-loss' },
    refunded: { label: 'مُسترد', cls: 'bg-slate-200 text-charcoal' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-200 text-pewter' };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function PlanIcon({ planName }: { planName: string }) {
  const lower = planName.toLowerCase();
  if (lower.includes('premium') || lower.includes('مميز')) {
    return <Crown className="text-gold" size={24} />;
  }
  if (lower.includes('digital') || lower.includes('رقمي')) {
    return <Zap className="text-brand" size={24} />;
  }
  return <Star className="text-pewter" size={24} />;
}

// ─── Cancel Confirmation Dialog ──────────────────────────────────────────────
function CancelDialog({
  onConfirm,
  onClose,
  isLoading,
}: {
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center"
        dir="rtl"
      >
        <XCircle className="text-loss mx-auto mb-4" size={48} />
        <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-obsidian mb-3">
          {t('pages.account.subscription.cancel')}
        </h3>
        <p className="text-pewter text-sm mb-6 leading-relaxed">
          {t('pages.account.subscription.cancelConfirm')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-ivory text-charcoal font-[family-name:var(--font-display)] font-semibold hover:bg-ivory transition-colors"
          >
            {t('common.actions.back')}

          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl bg-loss text-white font-[family-name:var(--font-display)] font-semibold hover:bg-loss/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            تأكيد الإلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SubscriptionPageClient({ subscriber, payments, userEmail }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  async function handleCancel() {
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscriber!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'canceled', canceled_at: new Date().toISOString() }),
      });
      if (res.ok) {
        setShowCancelDialog(false);
        router.refresh();
      }
    } finally {
      setIsCanceling(false);
    }
  }

  const isActive =
    subscriber?.status === 'active' || subscriber?.status === 'trialing';
  const plan = subscriber?.subscription_plans;

  return (
    <>
      <Header />
      {showCancelDialog && (
        <CancelDialog
          onConfirm={handleCancel}
          onClose={() => setShowCancelDialog(false)}
          isLoading={isCanceling}
        />
      )}

      <main className="min-h-screen bg-paper" dir="rtl">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-obsidian to-navy-light py-16">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-[family-name:var(--font-display)] font-black text-white mb-2">
                {t('pages.account.subscription.title')}
              </h1>
              <p className="text-white/60 text-sm">{userEmail}</p>
            </motion.div>
          </div>
        </section>

        <div className="container-luxury py-12 space-y-8 max-w-4xl">

          {/* ── No Subscription ─────────────────────────────────────── */}
          {!isActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-10 shadow-md text-center"
            >
              <AlertCircle className="text-gold mx-auto mb-4" size={48} />
              <h2 className="text-xl font-[family-name:var(--font-display)] font-bold text-obsidian mb-3">
                {t('pages.account.subscription.noSubscription')}
              </h2>
              <p className="text-pewter text-sm mb-6">
                اشترك الآن واحصل على وصول كامل للمجلة الرقمية والأرشيف الشامل
              </p>
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-white rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-gold-dark transition-colors"
              >
                <Crown size={18} />
                {t('common.actions.subscribe')}
              </Link>
            </motion.div>
          )}

          {/* ── Current Plan Card ────────────────────────────────────── */}
          {isActive && plan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md overflow-hidden"
            >
              {/* Plan header */}
              <div className="bg-gradient-to-r from-obsidian to-navy-light p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center">
                    <PlanIcon planName={plan.name} />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs mb-0.5">
                      {t('pages.account.subscription.currentPlan')}
                    </p>
                    <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-xl">
                      {plan.name_ar}
                    </h2>
                  </div>
                </div>
                <StatusBadge status={subscriber!.status} />
              </div>

              {/* Plan details grid */}
              <div className="p-6 grid sm:grid-cols-2 gap-6">
                {/* Period start */}
                {subscriber?.current_period_start && (
                  <div className="flex items-start gap-3">
                    <Calendar className="text-gold flex-shrink-0 mt-1" size={18} />
                    <div>
                      <p className="text-xs text-pewter mb-0.5">بدء الفترة الحالية</p>
                      <p className="font-semibold text-charcoal">
                        {formatDate(subscriber.current_period_start)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Next billing */}
                {subscriber?.current_period_end && (
                  <div className="flex items-start gap-3">
                    <Clock className="text-gold flex-shrink-0 mt-1" size={18} />
                    <div>
                      <p className="text-xs text-pewter mb-0.5">
                        {t('pages.account.subscription.nextBilling')}
                      </p>
                      <p className="font-semibold text-charcoal">
                        {formatDate(subscriber.current_period_end)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Trial end */}
                {subscriber?.status === 'trialing' && subscriber.trial_ends_at && (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-brand flex-shrink-0 mt-1" size={18} />
                    <div>
                      <p className="text-xs text-pewter mb-0.5">تنتهي الفترة التجريبية</p>
                      <p className="font-semibold text-charcoal">
                        {formatDate(subscriber.trial_ends_at)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Canceled at */}
                {subscriber?.canceled_at && (
                  <div className="flex items-start gap-3">
                    <XCircle className="text-loss flex-shrink-0 mt-1" size={18} />
                    <div>
                      <p className="text-xs text-pewter mb-0.5">تاريخ الإلغاء</p>
                      <p className="font-semibold text-charcoal">
                        {formatDate(subscriber.canceled_at)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex flex-wrap gap-3">
                <Link
                  href="/subscribe"
                  className="flex items-center gap-2 px-5 py-2.5 bg-obsidian text-white rounded-xl text-sm font-[family-name:var(--font-display)] font-semibold hover:bg-navy-light transition-colors"
                >
                  <ArrowUpRight size={16} />
                  {t('pages.account.subscription.upgrade')}
                </Link>
                <Link
                  href="/checkout/portal"
                  className="flex items-center gap-2 px-5 py-2.5 border-2 border-obsidian text-obsidian rounded-xl text-sm font-[family-name:var(--font-display)] font-semibold hover:bg-obsidian hover:text-white transition-colors"
                >
                  <CreditCard size={16} />
                  {t('pages.account.subscription.managePayment')}
                </Link>
                {subscriber?.status !== 'canceled' && (
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="flex items-center gap-2 px-5 py-2.5 border-2 border-loss/40 text-loss rounded-xl text-sm font-[family-name:var(--font-display)] font-semibold hover:bg-loss/5 transition-colors"
                  >
                    <XCircle size={16} />
                    {t('pages.account.subscription.cancel')}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Payment History ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-md overflow-hidden"
          >
            <div className="p-6 border-b border-ivory">
              <h2 className="text-lg font-[family-name:var(--font-display)] font-bold text-obsidian flex items-center gap-2">
                <CreditCard className="text-gold" size={20} />
                {t('pages.account.subscription.paymentHistory')}
              </h2>
            </div>

            {payments.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-pewter text-sm">لا توجد مدفوعات مسجلة بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" dir="rtl">
                  <thead>
                    <tr className="bg-ivory text-charcoal text-xs">
                      <th className="px-6 py-3 text-start font-semibold">التاريخ</th>
                      <th className="px-6 py-3 text-start font-semibold">الوصف</th>
                      <th className="px-6 py-3 text-start font-semibold">المبلغ</th>
                      <th className="px-6 py-3 text-start font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, i) => (
                      <tr
                        key={payment.id}
                        className={`border-b border-ivory ${i % 2 === 0 ? '' : 'bg-paper/50'}`}
                      >
                        <td className="px-6 py-4 text-charcoal">
                          {formatDate(payment.paid_at)}
                        </td>
                        <td className="px-6 py-4 text-charcoal">
                          {payment.description ?? 'اشتراك'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-obsidian">
                          {payment.amount.toLocaleString('ar-SA-u-ca-gregory-nu-latn')} {payment.currency}
                        </td>
                        <td className="px-6 py-4">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

        </div>
      </main>
      <Footer />
    </>
  );
}
