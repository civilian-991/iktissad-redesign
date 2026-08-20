'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageSquare, Building2, Loader2, AlertCircle } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';
import type { ContactInfo } from '@/lib/site-settings';

const contactCardIcons = [MapPin, Phone, Mail, Clock];

interface ContactPageClientProps {
  contactInfo?: ContactInfo | null;
}

export default function ContactPageClient({ contactInfo }: ContactPageClientProps) {
  const { t, locale } = useTranslation();
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formState, turnstileToken }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          // Rate limited — reuse the error message key
          setError(t('pages.contact.form.rateLimited'));
        } else {
          setError(t('pages.contact.form.errorMessage'));
        }
        return;
      }

      setIsSubmitted(true);
      setFormState({ name: '', email: '', subject: '', message: '' });
    } catch {
      setError(t('pages.contact.form.errorMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  const contactCards = contactCardIcons.map((icon, i) => ({
    icon,
    title: t(`pages.contact.cards.${i}.title`),
    value: t(`pages.contact.cards.${i}.value`),
    subtitle: t(`pages.contact.cards.${i}.subtitle`),
  }));

  // Country slug → localized display name. Keep in sync with the countries table.
  const countryNames: Record<string, { ar: string; en: string }> = {
    lebanon: { ar: 'لبنان', en: 'Lebanon' },
    uae: { ar: 'الإمارات', en: 'UAE' },
    'saudi-arabia': { ar: 'المملكة العربية السعودية', en: 'Saudi Arabia' },
    qatar: { ar: 'قطر', en: 'Qatar' },
    kuwait: { ar: 'الكويت', en: 'Kuwait' },
    egypt: { ar: 'مصر', en: 'Egypt' },
    tunisia: { ar: 'تونس', en: 'Tunisia' },
    turkey: { ar: 'تركيا', en: 'Turkey' },
  };
  const offices = (contactInfo?.offices ?? []).map((office) => ({
    city: locale === 'ar' ? office.city : (office.cityEn || office.city),
    country: office.country
      ? (locale === 'ar' ? countryNames[office.country]?.ar : countryNames[office.country]?.en) ?? office.country
      : '',
    phone: office.phone,
    email: office.email,
    headquarters: office.headquarters,
  }));

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy py-20 overflow-hidden">
          <div className="absolute inset-0 star-pattern opacity-20" />

          <div className="container-luxury relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-4xl lg:text-6xl font-[family-name:var(--font-display)] font-black text-white mb-4">
                {t('pages.contact.title')}
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                {t('pages.contact.subtitle')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-12 -mt-8">
          <div className="container-luxury">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {contactCards.map((info, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-lg text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                    <info.icon className="text-gold" size={24} />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-ink mb-1">
                    {info.title}
                  </h3>
                  <p className="text-charcoal font-semibold">{info.value}</p>
                  <p className="text-slate text-sm">{info.subtitle}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form & Map */}
        <section className="py-16">
          <div className="container-luxury">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="text-gold" size={28} />
                    <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-ink">
                      {t('pages.contact.form.send')}
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-[family-name:var(--font-display)] text-ink mb-2">
                          {t('pages.contact.form.name')}
                        </label>
                        <input
                          type="text"
                          value={formState.name}
                          onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-ivory border border-sand focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-[family-name:var(--font-display)] text-ink mb-2">
                          {t('pages.contact.form.email')}
                        </label>
                        <input
                          type="email"
                          value={formState.email}
                          onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-ivory border border-sand focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-[family-name:var(--font-display)] text-ink mb-2">
                        {t('pages.contact.form.subject')}
                      </label>
                      <select
                        value={formState.subject}
                        onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-ivory border border-sand focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                        required
                      >
                        <option value="">{t('pages.contact.form.subjectPlaceholder')}</option>
                        <option value="general">{t('pages.contact.form.subjectGeneral')}</option>
                        <option value="advertising">{t('pages.contact.form.subjectAdvertising')}</option>
                        <option value="partnership">{t('pages.contact.form.subjectPartnership')}</option>
                        <option value="press">{t('pages.contact.form.subjectPress')}</option>
                        <option value="technical">{t('pages.contact.form.subjectTechnical')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-[family-name:var(--font-display)] text-ink mb-2">
                        {t('pages.contact.form.message')}
                      </label>
                      <textarea
                        value={formState.message}
                        onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-3 rounded-lg bg-ivory border border-sand focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all resize-none"
                        required
                      />
                    </div>

                    {/* Cloudflare Turnstile */}
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                      onSuccess={setTurnstileToken}
                      onError={() => setTurnstileToken('')}
                      onExpire={() => setTurnstileToken('')}
                      options={{ theme: 'light', language: 'ar' }}
                    />

                    {/* Inline error */}
                    {error && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isSubmitted || isLoading || !turnstileToken}
                      className={`w-full py-4 rounded-lg font-[family-name:var(--font-display)] font-bold flex items-center justify-center gap-2 transition-all ${
                        isSubmitted
                          ? 'bg-green-500 text-white cursor-default'
                          : isLoading
                          ? 'bg-gold/70 text-white cursor-wait'
                          : 'bg-gold text-white hover:bg-gold-dark'
                      }`}
                    >
                      {isSubmitted ? (
                        <>
                          <CheckCircle size={20} />
                          {t('pages.contact.form.successMessage')}
                        </>
                      ) : isLoading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          {t('pages.contact.form.sending')}
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          {t('pages.contact.form.send')}
                        </>
                      )}
                    </motion.button>
                  </form>
                </div>
              </motion.div>

              {/* Offices */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="text-gold" size={28} />
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-ink">
                    {t('pages.group.offices')}
                  </h2>
                </div>

                <div className="space-y-4">
                  {offices.map((office, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-sand"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-[family-name:var(--font-display)] font-bold text-ink text-lg">
                            {office.headquarters
                              ? (locale === 'ar' ? 'المقر الرئيسي' : 'Headquarters')
                              : office.city}
                          </h3>
                          {!office.headquarters && (
                            <p className="text-gold text-sm font-semibold mb-2">{office.country}</p>
                          )}
                          {office.phone && (
                            <p className="text-charcoal text-sm font-semibold" dir="ltr">{office.phone}</p>
                          )}
                          {office.email && (
                            <a href={`mailto:${office.email}`} className="text-slate text-sm hover:text-gold transition-colors" dir="ltr">
                              {office.email}
                            </a>
                          )}
                        </div>
                        <MapPin className="text-gold flex-shrink-0" size={20} />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Map Placeholder */}
                <div className="mt-6 h-64 rounded-xl bg-navy/10 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="mx-auto text-gold mb-2" size={40} />
                    <p className="text-slate font-[family-name:var(--font-display)]">
                      {t('pages.contact.mapLabel')}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
