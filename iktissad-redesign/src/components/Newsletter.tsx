'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Send, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const COOKIE_NAME = 'newsletter_subscribed';

function getNewsletterCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
}

function setNewsletterCookie() {
  document.cookie = `${COOKIE_NAME}=1; max-age=31536000; path=/; SameSite=Lax`;
}

export default function Newsletter() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  // Hide form on mount if already subscribed (cookie check)
  useEffect(() => {
    if (getNewsletterCookie()) {
      setHidden(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        // 409 = duplicate / already subscribed
        if (res.status === 409) {
          setError(t('newsletter.alreadySubscribed'));
        } else if (res.status === 400) {
          setError(t('newsletter.invalidEmail'));
        } else {
          setError(t('newsletter.error'));
        }
        return;
      }

      // Success
      setIsSubmitted(true);
      setNewsletterCookie();
      // After 4 s, hide the form entirely since the cookie is now set
      setTimeout(() => {
        setHidden(true);
      }, 4000);
    } catch {
      setError(t('newsletter.error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (hidden) return null;

  return (
    <section className="py-20 bg-obsidian relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />

      {/* Pattern Overlay */}
      <div className="absolute inset-0 pattern-grid opacity-30" />

      <div className="container-luxury relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 mx-auto mb-6 bg-gold/10 border border-gold/20 flex items-center justify-center"
          >
            <Mail size={36} className="text-gold" />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-black text-gold mb-4"
          >
            {t('newsletter.title')}
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/80 text-lg mb-8 max-w-2xl mx-auto"
          >
            {t('newsletter.subtitle')}
          </motion.p>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="max-w-xl mx-auto"
          >
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="relative flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={t('newsletter.placeholder')}
                  className={`w-full px-6 py-4 pr-14 bg-white/5 border text-white font-[family-name:var(--font-display)] placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold/30 transition-colors ${
                    error ? 'border-red-400/60' : 'border-gold/20 focus:border-gold/50'
                  }`}
                  required
                  disabled={isLoading || isSubmitted}
                />
                <Mail className="absolute right-5 top-1/2 -translate-y-1/2 text-gold/50" size={20} />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitted || isLoading}
                className={`px-8 py-4 font-[family-name:var(--font-display)] font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                  isSubmitted
                    ? 'bg-profit text-white cursor-default'
                    : isLoading
                    ? 'bg-gold/70 text-obsidian cursor-wait'
                    : 'bg-gold text-obsidian hover:bg-gold-light'
                }`}
              >
                {isSubmitted ? (
                  <>
                    <CheckCircle size={20} />
                    {t('newsletter.success')}
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {t('newsletter.loading')}
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    {t('newsletter.button')}
                  </>
                )}
              </motion.button>
            </form>

            {/* Inline error */}
            {error && (
              <p className="mt-3 text-sm text-red-400 text-center" role="alert">
                {error}
              </p>
            )}
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6 mt-8 text-white/50 text-sm"
          >
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold/60" />
              {t('newsletter.features.exclusive')}
            </span>
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold/60" />
              {t('newsletter.features.weekly')}
            </span>
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold/60" />
              {t('newsletter.features.noSpam')}
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
