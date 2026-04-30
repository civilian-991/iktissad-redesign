'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Check, X, Crown, Star, Zap, Shield, CreditCard, Tag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';

interface Plan {
  id: string;
  name: string;
  name_ar: string;
  price_monthly: number;
  price_annual: number | null;
  features: string[];
  features_ar: string[];
  sort_order: number;
}

interface Props {
  plans?: Plan[];
  redirectTo?: string;
}

// ─── Static tier definitions (shown when no DB plans are loaded) ───────────
const staticTiers = [
  {
    id: 'free',
    slug: 'free',
    nameAr: 'مجاني',
    nameEn: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    icon: Star,
    color: 'from-slate-400 to-slate-500',
    badgeClass: 'bg-slate-100 text-slate-700',
    popular: false,
    featuresAr: [
      '5 مقالات شهرياً',
      'تصفح المجلة فقط (preview)',
      'النشرة الإخبارية الأسبوعية',
    ],
    lockedAr: [
      'العدد الحالي كاملاً',
      'تحميل PDF',
      'كامل الأرشيف',
      'وصول مبكر',
      'إشعارات فورية',
    ],
  },
  {
    id: 'digital',
    slug: 'digital',
    nameAr: 'رقمي',
    nameEn: 'Digital',
    priceMonthly: 49,
    priceAnnual: 399,
    icon: Zap,
    color: 'from-brand to-brand-600',
    badgeClass: 'bg-brand-50 text-brand-800',
    popular: false,
    featuresAr: [
      '5 مقالات شهرياً',
      'العدد الحالي كاملاً',
      '12 شهراً أرشيف',
      'تحميل PDF',
      'النشرة الإخبارية الأسبوعية',
    ],
    lockedAr: [
      'كامل الأرشيف',
      'وصول مبكر',
      'إشعارات فورية',
    ],
  },
  {
    id: 'premium',
    slug: 'premium',
    nameAr: 'مميز',
    nameEn: 'Premium',
    priceMonthly: 99,
    priceAnnual: 799,
    icon: Crown,
    color: 'from-gold to-gold-dark',
    badgeClass: 'bg-gold-pale text-obsidian',
    popular: true,
    featuresAr: [
      '5 مقالات شهرياً',
      'العدد الحالي كاملاً',
      'كامل الأرشيف (65+ سنة)',
      'تحميل PDF',
      'وصول مبكر للأعداد الجديدة',
      'إشعارات فورية',
      'النشرة الإخبارية الأسبوعية',
    ],
    lockedAr: [],
  },
];

// ─── Comparison table rows ──────────────────────────────────────────────────
const comparisonRows = [
  { labelAr: 'مقالات شهرية', free: '5 فقط', digital: 'غير محدود', premium: 'غير محدود' },
  { labelAr: 'تصفح المجلة', free: true, digital: true, premium: true },
  { labelAr: 'العدد الحالي كاملاً', free: false, digital: true, premium: true },
  { labelAr: 'أرشيف المجلة (12 شهراً)', free: false, digital: true, premium: true },
  { labelAr: 'كامل الأرشيف (65+ سنة)', free: false, digital: false, premium: true },
  { labelAr: 'تحميل PDF', free: false, digital: true, premium: true },
  { labelAr: 'وصول مبكر', free: false, digital: false, premium: true },
  { labelAr: 'إشعارات فورية', free: false, digital: false, premium: true },
  { labelAr: 'النشرة الإخبارية', free: true, digital: true, premium: true },
];

function CellValue({ val }: { val: boolean | string }) {
  if (typeof val === 'boolean') {
    return val ? (
      <Check size={20} className="text-profit mx-auto" aria-label="متاح" />
    ) : (
      <X size={20} className="text-loss/40 mx-auto" aria-label="غير متاح" />
    );
  }
  return <span className="text-sm text-charcoal font-semibold">{val}</span>;
}

export default function SubscribePageClient({ plans = [], redirectTo }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [selectedTier, setSelectedTier] = useState('premium');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [promoMessage, setPromoMessage] = useState('');
  const promoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate annual discount % for a tier
  function discountPercent(monthly: number, annual: number | null): number {
    if (!annual || monthly === 0) return 0;
    const annualMonthly = annual / 12;
    return Math.round((1 - annualMonthly / monthly) * 100);
  }

  // Map DB plans to static tiers (if available), or use static defaults
  function getPlanId(tierSlug: string): string | null {
    const dbPlan = plans.find(
      (p) => p.name.toLowerCase() === tierSlug || p.name_ar === tierSlug
    );
    return dbPlan?.id ?? null;
  }

  async function validatePromoCode(code: string) {
    if (!code.trim()) {
      setPromoStatus('idle');
      setPromoMessage('');
      return;
    }
    setPromoStatus('checking');
    try {
      const res = await fetch(
        `/api/promo-codes/validate?code=${encodeURIComponent(code.trim())}`
      );
      const json = await res.json();
      const result = json?.data;
      if (result?.valid) {
        setPromoStatus('valid');
        setPromoMessage(result.message ?? t('pages.subscribe.checkout.promoValid'));
      } else {
        setPromoStatus('invalid');
        setPromoMessage(result?.message ?? t('pages.subscribe.checkout.promoInvalid'));
      }
    } catch {
      setPromoStatus('invalid');
      setPromoMessage(t('pages.subscribe.checkout.promoInvalid'));
    }
  }

  function handlePromoChange(value: string) {
    setPromoCode(value);
    setPromoStatus('idle');
    setPromoMessage('');
    if (promoDebounceRef.current) clearTimeout(promoDebounceRef.current);
    if (value.trim().length >= 3) {
      promoDebounceRef.current = setTimeout(() => validatePromoCode(value), 600);
    }
  }

  async function handleChoose(tierSlug: string) {
    if (tierSlug === 'free') {
      router.push('/');
      return;
    }

    setLoadingTier(tierSlug);
    setCheckoutError(null);

    const planId = getPlanId(tierSlug) ?? tierSlug;

    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          interval: billing,
          promoCode: promoStatus === 'valid' ? promoCode.trim() : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setCheckoutError(json.error ?? t('pages.subscribe.checkout.errorGeneral'));
        setLoadingTier(null);
        return;
      }

      const { sessionId, payUrl } = json.data ?? {};

      if (sessionId && payUrl) {
        // MPGS Hosted Checkout: redirect to the gateway pay page with the session
        const gatewayUrl = `${payUrl}?sessionId=${encodeURIComponent(sessionId)}`;
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = gatewayUrl;
      } else {
        // Fallback (e.g. test / mock mode): use any paymentUrl returned
        const fallback = json.data?.paymentUrl;
        if (fallback) {
          // eslint-disable-next-line react-hooks/immutability
          window.location.href = fallback;
        } else {
          setCheckoutError(t('pages.subscribe.checkout.errorGeneral'));
          setLoadingTier(null);
        }
      }
    } catch {
      setCheckoutError(t('pages.subscribe.checkout.errorGeneral'));
      setLoadingTier(null);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-paper" dir="rtl">

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative bg-gradient-to-br from-obsidian via-navy-light to-brand py-24 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 start-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 end-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gold/20 rounded-full text-gold text-sm mb-6">
                <Crown size={16} />
                {t('pages.subscribe.title')}
              </span>
              <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-4">
                اشترك الآن في إقتصاد
              </h1>
              <p className="text-white/70 text-lg max-w-xl mx-auto">
                {t('pages.subscribe.subtitle')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Billing Toggle ───────────────────────────────────────────── */}
        <section className="py-8 bg-ivory">
          <div className="container-luxury flex items-center justify-center gap-4">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-full font-[family-name:var(--font-display)] font-semibold transition-all ${
                billing === 'monthly'
                  ? 'bg-obsidian text-white shadow-md'
                  : 'text-charcoal hover:text-navy'
              }`}
            >
              {t('pages.subscribe.monthly')}
            </button>

            {/* Toggle pill */}
            <button
              onClick={() => setBilling(billing === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-14 h-7 bg-gold rounded-full focus:outline-none"
              aria-label="تبديل دورة الفوترة"
            >
              <motion.div
                animate={{ x: billing === 'annual' ? -28 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute top-0.5 end-0.5 w-6 h-6 bg-white rounded-full shadow"
              />
            </button>

            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-full font-[family-name:var(--font-display)] font-semibold transition-all ${
                billing === 'annual'
                  ? 'bg-obsidian text-white shadow-md'
                  : 'text-charcoal hover:text-navy'
              }`}
            >
              {t('pages.subscribe.annual')}
              <span className="text-gold text-xs me-1">
                {' '}({t('pages.subscribe.save')})
              </span>
            </button>
          </div>
        </section>

        {/* ── Promo Code ───────────────────────────────────────────────── */}
        <section className="py-6 bg-paper">
          <div className="container-luxury max-w-sm mx-auto">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Tag size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-pewter pointer-events-none" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => handlePromoChange(e.target.value)}
                  onBlur={() => promoCode.trim() && validatePromoCode(promoCode)}
                  placeholder={t('pages.subscribe.checkout.promoPlaceholder')}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-sand text-sm bg-white text-charcoal placeholder-pewter focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                  dir="ltr"
                />
              </div>
              <button
                onClick={() => validatePromoCode(promoCode)}
                disabled={promoStatus === 'checking' || !promoCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-obsidian text-white text-sm font-[family-name:var(--font-display)] font-semibold disabled:opacity-50 hover:bg-navy-light transition-colors"
              >
                {promoStatus === 'checking'
                  ? t('pages.subscribe.checkout.promoChecking')
                  : t('pages.subscribe.checkout.promoApply')}
              </button>
            </div>
            {promoMessage && (
              <p
                className={`mt-2 text-xs text-center ${
                  promoStatus === 'valid' ? 'text-profit' : 'text-loss'
                }`}
              >
                {promoMessage}
              </p>
            )}
          </div>
        </section>

        {/* ── Checkout error ────────────────────────────────────────────── */}
        {checkoutError && (
          <div className="container-luxury max-w-lg mx-auto -mb-6">
            <p className="text-center text-sm text-loss bg-loss/10 rounded-xl py-3 px-4">
              {checkoutError}
            </p>
          </div>
        )}

        {/* ── Pricing Cards ────────────────────────────────────────────── */}
        <section className="py-14">
          <div className="container-luxury">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
              {staticTiers.map((tier, i) => {
                const price =
                  billing === 'annual' && tier.priceAnnual
                    ? tier.priceAnnual
                    : tier.priceMonthly;
                const discount = discountPercent(
                  tier.priceMonthly,
                  tier.priceAnnual
                );
                const isSelected = selectedTier === tier.id;

                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`relative flex flex-col bg-white rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? 'ring-2 ring-gold shadow-xl scale-[1.03]'
                        : 'shadow-md hover:shadow-xl'
                    } ${tier.popular ? 'md:-mt-4 md:mb-4' : ''}`}
                  >
                    {/* Popular badge */}
                    {tier.popular && (
                      <div className="absolute -top-3 start-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-white text-xs font-[family-name:var(--font-display)] font-bold rounded-full whitespace-nowrap">
                        الأكثر شعبية
                      </div>
                    )}

                    {/* Icon */}
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4`}
                    >
                      <tier.icon className="text-white" size={26} />
                    </div>

                    <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-obsidian mb-1">
                      {tier.nameAr}
                    </h3>
                    <p className="text-pewter text-sm mb-4">
                      {tier.nameEn}
                    </p>

                    {/* Price */}
                    <div className="mb-6">
                      {tier.priceMonthly === 0 ? (
                        <span className="text-4xl font-[family-name:var(--font-display)] font-black text-obsidian">
                          مجاني
                        </span>
                      ) : (
                        <>
                          <span className="text-pewter text-sm ms-1">$</span>
                          <span className="text-4xl font-[family-name:var(--font-display)] font-black text-obsidian">
                            {price.toLocaleString('en-US')}
                          </span>
                          <span className="text-pewter text-xs">
                            /{billing === 'annual' ? 'سنوياً' : 'شهرياً'}
                          </span>
                          {billing === 'annual' && discount > 0 && (
                            <span className="inline-block ms-2 text-xs px-2 py-0.5 bg-profit/10 text-profit rounded-full font-semibold">
                              وفر {discount}%
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-6 flex-1">
                      {tier.featuresAr.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-charcoal">
                          <Check size={16} className="text-profit flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                      {tier.lockedAr.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-pewter/50 line-through">
                          <X size={16} className="text-loss/30 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChoose(tier.id);
                      }}
                      disabled={loadingTier !== null}
                      className={`w-full py-3 rounded-xl font-[family-name:var(--font-display)] font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                        tier.id === 'free'
                          ? 'bg-ivory text-obsidian hover:bg-sand'
                          : isSelected
                          ? 'bg-gold text-white hover:bg-gold-dark shadow-md'
                          : 'bg-obsidian text-white hover:bg-navy-light'
                      }`}
                    >
                      {loadingTier === tier.id && (
                        <Loader2 size={16} className="animate-spin" />
                      )}
                      {loadingTier === tier.id
                        ? t('pages.subscribe.checkout.processing')
                        : tier.id === 'free'
                        ? t('pages.subscribe.choose')
                        : t('pages.subscribe.startTrial')}
                    </button>

                    {tier.id !== 'free' && (
                      <p className="text-center text-xs text-pewter mt-3">
                        7 أيام تجريبية مجانية — {t('pages.subscribe.paymentNote')}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Feature Comparison Table ─────────────────────────────────── */}
        <section className="py-16 bg-ivory">
          <div className="container-luxury">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl font-[family-name:var(--font-display)] font-bold text-obsidian text-center mb-10"
            >
              {t('pages.subscribe.comparison.title')}
            </motion.h2>

            <div className="max-w-4xl mx-auto overflow-x-auto rounded-2xl shadow-lg">
              <table className="w-full bg-white text-center" dir="rtl">
                <thead>
                  <tr className="bg-obsidian text-white">
                    <th className="p-4 text-start font-[family-name:var(--font-display)] font-semibold">
                      {t('pages.subscribe.comparison.feature')}
                    </th>
                    <th className="p-4 font-[family-name:var(--font-display)] font-semibold">مجاني</th>
                    <th className="p-4 font-[family-name:var(--font-display)] font-semibold text-gold">رقمي</th>
                    <th className="p-4 font-[family-name:var(--font-display)] font-semibold text-gold">مميز ✦</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr
                      key={row.labelAr}
                      className={`border-b border-ivory transition-colors ${
                        i % 2 === 0 ? 'bg-white' : 'bg-paper'
                      }`}
                    >
                      <td className="p-4 text-start text-sm font-medium text-charcoal">
                        {row.labelAr}
                      </td>
                      <td className="p-4">
                        <CellValue val={row.free} />
                      </td>
                      <td className="p-4">
                        <CellValue val={row.digital} />
                      </td>
                      <td className="p-4">
                        <CellValue val={row.premium} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Trust Badges ─────────────────────────────────────────────── */}
        <section className="py-14">
          <div className="container-luxury">
            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
              {[
                { icon: Shield, titleAr: 'دفع آمن', descAr: 'بوابة دفع مشفرة ومعتمدة' },
                { icon: CreditCard, titleAr: 'إلغاء مجاني', descAr: 'ألغِ اشتراكك في أي وقت' },
                { icon: Star, titleAr: '7 أيام مجانية', descAr: 'جرّب قبل أن تشترك' },
              ].map(({ icon: Icon, titleAr, descAr }) => (
                <div key={titleAr} className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
                    <Icon className="text-gold" size={24} />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian">{titleAr}</h3>
                  <p className="text-pewter text-sm">{descAr}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="py-14 bg-ivory">
          <div className="container-luxury max-w-3xl">
            <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-obsidian text-center mb-8">
              {t('pages.subscribe.faq')}
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: 'هل يمكنني إلغاء اشتراكي في أي وقت؟',
                  a: 'نعم، يمكنك إلغاء اشتراكك في أي وقت دون أي رسوم إضافية. سيستمر وصولك حتى نهاية الفترة المدفوعة.',
                },
                {
                  q: 'كيف تعمل فترة التجربة المجانية؟',
                  a: 'تحصل على 7 أيام مجانية كاملة عند اشتراكك في أي باقة مدفوعة. لن يُقتطع منك أي مبلغ إلا بعد انتهاء الفترة التجريبية.',
                },
                {
                  q: 'ما هي طرق الدفع المتاحة؟',
                  a: t('pages.subscribe.paymentNote'),
                },
                {
                  q: 'هل يمكنني ترقية أو تخفيض باقتي؟',
                  a: 'نعم، يمكنك تغيير باقتك في أي وقت من صفحة إدارة الاشتراك.',
                },
              ].map((faq, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-obsidian mb-2">
                    {faq.q}
                  </h3>
                  <p className="text-pewter text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
