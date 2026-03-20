'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Lock } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import PaywallModal from '@/components/magazine/PaywallModal';
import type { MagazineIssue, MagazineSection } from '@/types';

interface MagazineTeaserClientProps {
  issue: MagazineIssue;
  sections: MagazineSection[];
  isLoggedIn: boolean;
}

export default function MagazineTeaserClient({
  issue,
  sections,
  isLoggedIn,
}: MagazineTeaserClientProps) {
  const { t } = useTranslation();
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Derive TOC items from sections, falling back to issue highlights
  const tocItems: string[] =
    sections.length > 0
      ? sections.map((s) => s.name)
      : issue.highlights ?? [];

  return (
    <>
      <Header />

      <main className="min-h-screen bg-cream" dir="rtl">
        {/* ── Hero: cover image ─────────────────────────────────────────── */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-16 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row items-center gap-12"
            >
              {/* Cover */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-lg scale-110" />
                  {issue.coverImage ? (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 }}
                      src={issue.coverImage}
                      alt={issue.title}
                      className="relative w-56 md:w-72 shadow-2xl rounded-sm"
                      style={{ aspectRatio: '3/4', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="relative w-56 md:w-72 bg-navy-light rounded-sm shadow-2xl flex items-center justify-center" style={{ aspectRatio: '3/4' }}>
                      <BookOpen className="text-gold" size={64} />
                    </div>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="text-center lg:text-right flex-1">
                <span className="inline-block text-gold font-[family-name:var(--font-display)] font-semibold mb-3 text-sm">
                  {issue.subtitle ||
                    new Date(issue.publishDate).toLocaleDateString('ar-SA-u-ca-gregory', {
                      year: 'numeric',
                      month: 'long',
                    })}
                </span>
                <h1 className="text-3xl lg:text-5xl font-[family-name:var(--font-display)] font-black text-white mb-4 leading-snug">
                  {issue.title}
                </h1>
                {issue.pages > 0 && (
                  <p className="text-white/50 text-sm mb-6">
                    <BookOpen size={14} className="inline ml-1" />
                    {issue.pages} صفحة
                  </p>
                )}

                {/* Subscribe CTA (prominent, in hero) */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mt-4">
                  <a
                    href="/subscribe"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gold text-white rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-gold-dark transition-colors text-sm"
                  >
                    {t('magazine.teaser_subscribe')}
                  </a>
                  {!isLoggedIn && (
                    <a
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-white/30 text-white rounded-xl font-[family-name:var(--font-display)] font-bold hover:border-white/60 transition-colors text-sm"
                    >
                      {t('magazine.teaser_login')}
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Table of contents ─────────────────────────────────────────── */}
        {tocItems.length > 0 && (
          <section className="py-12 bg-ivory">
            <div className="container-luxury max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-xl font-[family-name:var(--font-display)] font-black text-navy mb-6 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gold flex-shrink-0 inline-block" />
                  {t('magazine.teaser_toc_heading')}
                </h2>
                <ul className="space-y-3">
                  {tocItems.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-charcoal font-[family-name:var(--font-display)] text-base border-b border-sand/50 pb-3 last:border-b-0"
                    >
                      <span className="text-gold/60 font-mono text-xs w-6 flex-shrink-0 text-left">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </section>
        )}

        {/* ── Blurred / locked first spread preview ─────────────────────── */}
        <section className="py-10 bg-cream">
          <div className="container-luxury max-w-3xl">
            <p className="text-[11px] font-[family-name:var(--font-display)] font-black text-charcoal/30 uppercase tracking-widest mb-4">
              {t('magazine.teaser_preview_label')}
            </p>
            <div className="relative overflow-hidden rounded-xl shadow-lg">
              {/* Placeholder spread (two-tone navy card) */}
              <div
                className="w-full flex"
                style={{ minHeight: '260px', background: '#183B4E' }}
              >
                {/* Left page */}
                <div className="flex-1 flex items-center justify-center border-r border-white/10 p-8">
                  <BookOpen className="text-gold/30" size={56} />
                </div>
                {/* Right page */}
                <div className="flex-1 flex items-center justify-center p-8">
                  <BookOpen className="text-gold/30" size={56} />
                </div>
              </div>

              {/* Blur + lock overlay */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                style={{
                  backdropFilter: 'blur(6px)',
                  background: 'rgba(24,59,78,0.7)',
                }}
              >
                <Lock className="text-gold" size={32} />
                <p className="text-white font-[family-name:var(--font-display)] font-bold text-sm text-center px-4">
                  {t('magazine.teaser_heading')}
                </p>
                <button
                  onClick={() => setPaywallOpen(true)}
                  className="px-6 py-2.5 bg-gold text-white rounded-lg font-[family-name:var(--font-display)] font-bold text-sm hover:bg-gold-dark transition-colors"
                >
                  {t('magazine.teaser_subscribe')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Full CTA section ──────────────────────────────────────────── */}
        <section className="py-16 bg-navy">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <BookOpen className="mx-auto text-gold mb-4" size={48} />
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-white mb-3">
                {t('magazine.teaser_heading')}
              </h2>
              <p className="text-white/70 mb-8 font-[family-name:var(--font-display)]">
                {t('magazine.teaser_subheading')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/subscribe"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gold text-white rounded-xl font-[family-name:var(--font-display)] font-bold hover:bg-gold-dark transition-colors"
                >
                  {t('magazine.teaser_subscribe')}
                </a>
                {!isLoggedIn && (
                  <a
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white rounded-xl font-[family-name:var(--font-display)] font-bold hover:border-white/60 transition-colors"
                  >
                    {t('magazine.teaser_login')}
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      {/* PaywallModal on top */}
      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        reason="magazine_gate"
      />
    </>
  );
}
