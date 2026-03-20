'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageSquare, Building2, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/i18n';

const contactCardIcons = [MapPin, Phone, Mail, Clock];
const officePhones = ['+961 1 000 000', '+971 4 000 0000', '+966 11 000 0000', '+20 2 0000 0000'];

export default function ContactPageClient() {
  const { t } = useTranslation();
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
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

  const contactInfo = contactCardIcons.map((icon, i) => ({
    icon,
    title: t(`pages.contact.cards.${i}.title`),
    value: t(`pages.contact.cards.${i}.value`),
    subtitle: t(`pages.contact.cards.${i}.subtitle`),
  }));

  const offices = officePhones.map((phone, i) => ({
    city: t(`pages.contact.offices.${i}.city`),
    country: t(`pages.contact.offices.${i}.country`),
    address: t(`pages.contact.offices.${i}.address`),
    phone,
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
              {contactInfo.map((info, index) => (
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
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-navy mb-1">
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
                    <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy">
                      {t('pages.contact.form.send')}
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-[family-name:var(--font-display)] text-navy mb-2">
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
                        <label className="block text-sm font-[family-name:var(--font-display)] text-navy mb-2">
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
                      <label className="block text-sm font-[family-name:var(--font-display)] text-navy mb-2">
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
                      <label className="block text-sm font-[family-name:var(--font-display)] text-navy mb-2">
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
                      disabled={isSubmitted || isLoading}
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
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-navy">
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
                      className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border-r-4 border-gold"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-[family-name:var(--font-display)] font-bold text-navy text-lg">
                            {office.city}
                          </h3>
                          <p className="text-gold text-sm font-semibold mb-2">{office.country}</p>
                          <p className="text-slate text-sm mb-1">{office.address}</p>
                          <p className="text-charcoal text-sm font-semibold">{office.phone}</p>
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
