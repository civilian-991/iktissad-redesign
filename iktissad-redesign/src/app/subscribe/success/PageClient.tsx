'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Newspaper,
  Archive,
  FileDown,
  Bell,
  Clock,
  Crown,
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';

// ── Sector options for the onboarding checklist ──────────────────────────────
const SECTOR_KEYS = [
  'energy',
  'banking',
  'realEstate',
  'technology',
  'industry',
  'trade',
] as const;

type SectorKey = (typeof SECTOR_KEYS)[number];

// ── Plan display names ────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  premium: { ar: 'مميز', en: 'Premium', color: 'text-gold' },
  digital: { ar: 'رقمي', en: 'Digital', color: 'text-brand' },
  free:    { ar: 'مجاني', en: 'Free',    color: 'text-pewter' },
};

export default function SuccessPageClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') ?? 'premium';

  const [selectedSectors, setSelectedSectors] = useState<Set<SectorKey>>(new Set());
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Pre-select all sectors on mount so user sees them and can deselect
  useEffect(() => {
    setSelectedSectors(new Set(SECTOR_KEYS));
  }, []);

  function toggleSector(key: SectorKey) {
    setSelectedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSavePreferences() {
    setSavingPrefs(true);
    try {
      // TODO: wire to a real user-preferences API route, e.g.:
      //   await fetch('/api/account/preferences', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ sectors: Array.from(selectedSectors) }),
      //   });
      // Simulated delay for UX feedback
      await new Promise((r) => setTimeout(r, 800));
      setPrefsSaved(true);
    } finally {
      setSavingPrefs(false);
    }
  }

  const planInfo = PLAN_LABELS[plan] ?? PLAN_LABELS['premium'];

  const benefits = [
    { icon: Newspaper, label: t('pages.subscribe.success.benefits.articles') },
    { icon: Archive,   label: t('pages.subscribe.success.benefits.magazine') },
    { icon: FileDown,  label: t('pages.subscribe.success.benefits.pdf') },
    { icon: Clock,     label: t('pages.subscribe.success.benefits.earlyAccess') },
    { icon: Bell,      label: t('pages.subscribe.success.benefits.alerts') },
  ];

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
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-profit/20 rounded-full mb-6 mx-auto"
            >
              <CheckCircle2 size={44} className="text-profit" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gold/20 rounded-full text-gold text-sm mb-4">
                <Crown size={16} />
                {t('pages.subscribe.success.planLabel')}:{' '}
                <span className={`font-bold ${planInfo.color}`}>
                  {planInfo.ar}
                </span>
              </span>

              <h1 className="text-3xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-4">
                {t('pages.subscribe.success.heading')}
              </h1>
              <p className="text-white/70 text-lg max-w-xl mx-auto">
                {t('pages.subscribe.success.subheading')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Benefits ────────────────────────────────────────────────── */}
        <section className="py-16 bg-ivory">
          <div className="container-luxury max-w-3xl">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl font-[family-name:var(--font-display)] font-bold text-obsidian text-center mb-8"
            >
              {t('pages.subscribe.success.benefits.title')}
            </motion.h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map(({ icon: Icon, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Icon size={20} className="text-gold" />
                  </div>
                  <p className="text-charcoal text-sm leading-relaxed mt-1">{label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Onboarding ──────────────────────────────────────────────── */}
        <section className="py-16">
          <div className="container-luxury max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-lg"
            >
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-obsidian mb-2">
                {t('pages.subscribe.success.onboarding.title')}
              </h2>
              <p className="text-pewter text-sm mb-6">
                {t('pages.subscribe.success.onboarding.subtitle')}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {SECTOR_KEYS.map((key) => {
                  const active = selectedSectors.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleSector(key)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-[family-name:var(--font-display)] font-semibold transition-all duration-200 ${
                        active
                          ? 'border-gold bg-gold/10 text-obsidian shadow-sm'
                          : 'border-sand bg-ivory text-pewter hover:border-gold/40'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                          active ? 'border-gold bg-gold' : 'border-pewter/40 bg-white'
                        }`}
                      >
                        {active && (
                          <svg
                            viewBox="0 0 12 10"
                            className="w-2.5 h-2 text-white"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="1 5 4.5 8.5 11 1" />
                          </svg>
                        )}
                      </span>
                      {t(`pages.subscribe.success.onboarding.sectors.${key}`)}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleSavePreferences}
                    disabled={savingPrefs || prefsSaved}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gold text-white font-[family-name:var(--font-display)] font-bold transition-all duration-200 hover:bg-gold-dark shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {prefsSaved
                      ? t('pages.subscribe.success.onboarding.saved')
                      : savingPrefs
                      ? t('pages.subscribe.success.onboarding.saving')
                      : t('pages.subscribe.success.onboarding.saveBtn')}
                  </button>

                  <Link
                    href="/"
                    className="px-4 py-3 rounded-xl text-pewter text-sm font-[family-name:var(--font-display)] hover:text-charcoal transition-colors"
                  >
                    {t('pages.subscribe.success.onboarding.skip')}
                  </Link>
                </div>

                {prefsSaved && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-profit text-sm flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={16} />
                    {t('pages.subscribe.success.onboarding.saved')}
                  </motion.span>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTAs ───────────────────────────────────────────────── */}
        <section className="py-12 bg-ivory">
          <div className="container-luxury flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="px-8 py-4 rounded-xl bg-obsidian text-white font-[family-name:var(--font-display)] font-bold text-lg hover:bg-navy-light transition-all duration-200 shadow-md"
            >
              {t('pages.subscribe.success.ctaStart')}
            </Link>
            <Link
              href="/account/subscription"
              className="px-8 py-4 rounded-xl border-2 border-obsidian/20 text-charcoal font-[family-name:var(--font-display)] font-semibold text-lg hover:border-obsidian/40 transition-all duration-200"
            >
              {t('pages.subscribe.success.ctaAccount')}
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
