'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Crown, Star, Zap, Mail, CreditCard, Shield, Gift } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const plans = [
  {
    id: 'free',
    name: 'مجاني',
    price: '0',
    period: 'دائماً',
    description: 'للقراء العاديين',
    icon: Star,
    features: [
      'الوصول للأخبار اليومية',
      'النشرة الإخبارية الأسبوعية',
      '5 مقالات مميزة شهرياً',
      'تطبيق الهاتف المحمول'
    ],
    color: 'from-slate-400 to-slate-600',
    popular: false
  },
  {
    id: 'premium',
    name: 'بريميوم',
    price: '9.99',
    period: 'شهرياً',
    description: 'للمستثمرين والمهتمين',
    icon: Crown,
    features: [
      'جميع مميزات الباقة المجانية',
      'وصول غير محدود للمقالات',
      'تحليلات حصرية يومية',
      'تنبيهات الأخبار العاجلة',
      'بدون إعلانات',
      'تقارير قطاعية شهرية'
    ],
    color: 'from-gold to-gold-dark',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'المؤسسات',
    price: '49.99',
    period: 'شهرياً',
    description: 'للشركات والمؤسسات',
    icon: Zap,
    features: [
      'جميع مميزات بريميوم',
      '10 حسابات للموظفين',
      'واجهة برمجة التطبيقات API',
      'تقارير مخصصة',
      'مدير حساب مخصص',
      'تدريب وورش عمل',
      'أولوية الدعم الفني'
    ],
    color: 'from-navy to-navy-light',
    popular: false
  }
];

const benefits = [
  { icon: Mail, title: 'نشرات حصرية', desc: 'تحليلات يومية في بريدك' },
  { icon: CreditCard, title: 'دفع آمن', desc: 'تشفير كامل للمعاملات' },
  { icon: Shield, title: 'إلغاء مجاني', desc: 'ألغِ اشتراكك في أي وقت' },
  { icon: Gift, title: 'عروض خاصة', desc: 'خصومات حصرية للمشتركين' },
];

export default function SubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-20 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gold/20 rounded-full text-gold text-sm font-[family-name:var(--font-display)] mb-6">
                <Crown size={16} />
                اشتراك مميز
              </span>
              <h1 className="text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-6">
                احصل على تجربة قراءة استثنائية
              </h1>
              <p className="text-white/70 text-lg">
                اشترك الآن واحصل على وصول غير محدود للتحليلات والتقارير الحصرية
              </p>
            </motion.div>
          </div>
        </section>

        {/* Billing Toggle */}
        <section className="py-8">
          <div className="container-luxury">
            <div className="flex items-center justify-center gap-4">
              <span className={`font-[family-name:var(--font-display)] ${billingPeriod === 'monthly' ? 'text-navy' : 'text-slate'}`}>
                شهري
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                className="relative w-16 h-8 bg-navy rounded-full"
              >
                <motion.div
                  animate={{ x: billingPeriod === 'yearly' ? -24 : 0 }}
                  className="absolute top-1 right-1 w-6 h-6 bg-gold rounded-full"
                />
              </button>
              <span className={`font-[family-name:var(--font-display)] ${billingPeriod === 'yearly' ? 'text-navy' : 'text-slate'}`}>
                سنوي
                <span className="text-gold text-xs mr-1">(وفر 20%)</span>
              </span>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="py-12">
          <div className="container-luxury">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative bg-white rounded-2xl p-6 cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? 'ring-2 ring-gold shadow-xl scale-105'
                      : 'shadow-lg hover:shadow-xl'
                  } ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 right-4 px-4 py-1 bg-gold text-white text-xs font-[family-name:var(--font-display)] font-bold rounded-full">
                      الأكثر شعبية
                    </div>
                  )}

                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                    <plan.icon className="text-white" size={28} />
                  </div>

                  <h3 className="text-xl font-[family-name:var(--font-display)] font-bold text-navy mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-slate text-sm mb-4">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-[family-name:var(--font-display)] font-black text-navy">
                      ${billingPeriod === 'yearly' ? (parseFloat(plan.price) * 0.8 * 12).toFixed(0) : plan.price}
                    </span>
                    <span className="text-slate text-sm mr-1">
                      /{billingPeriod === 'yearly' ? 'سنوياً' : plan.period}
                    </span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-charcoal">
                        <Check size={18} className="text-gold flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-3 rounded-lg font-[family-name:var(--font-display)] font-bold transition-colors ${
                      selectedPlan === plan.id
                        ? 'bg-gold text-white'
                        : 'bg-ivory text-navy hover:bg-gold hover:text-white'
                    }`}
                  >
                    {plan.id === 'free' ? 'ابدأ مجاناً' : 'اشترك الآن'}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-ivory">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                لماذا تشترك معنا؟
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="text-gold" size={28} />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-slate text-sm">{benefit.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container-luxury max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-navy mb-4">
                أسئلة شائعة
              </h2>
            </motion.div>

            <div className="space-y-4">
              {[
                { q: 'هل يمكنني إلغاء اشتراكي في أي وقت؟', a: 'نعم، يمكنك إلغاء اشتراكك في أي وقت دون أي رسوم إضافية.' },
                { q: 'ما هي طرق الدفع المتاحة؟', a: 'نقبل بطاقات فيزا وماستركارد وأمريكان إكسبريس، بالإضافة إلى PayPal.' },
                { q: 'هل هناك فترة تجريبية؟', a: 'نعم، نقدم فترة تجريبية مجانية لمدة 7 أيام لباقة بريميوم.' },
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-sm"
                >
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy mb-2">
                    {faq.q}
                  </h3>
                  <p className="text-slate">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
