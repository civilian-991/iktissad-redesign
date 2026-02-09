'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Send, CheckCircle, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function Newsletter() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setEmail('');
      }, 3000);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gold via-gold-dark to-gold relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

      {/* Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="container-luxury relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 mx-auto mb-6 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center"
          >
            <Mail size={36} className="text-white" />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-black text-white mb-4"
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
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto"
          >
            <div className="relative flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletter.placeholder')}
                className="w-full px-6 py-4 pr-14 rounded-xl bg-white text-navy font-[family-name:var(--font-display)] placeholder:text-slate focus:outline-none focus:ring-4 focus:ring-white/30"
                required
              />
              <Mail className="absolute right-5 top-1/2 -translate-y-1/2 text-gold" size={20} />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitted}
              className={`px-8 py-4 rounded-xl font-[family-name:var(--font-display)] font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                isSubmitted
                  ? 'bg-green-500 text-white'
                  : 'bg-navy text-white hover:bg-navy-light'
              }`}
            >
              {isSubmitted ? (
                <>
                  <CheckCircle size={20} />
                  {t('newsletter.success')}
                </>
              ) : (
                <>
                  <Send size={20} />
                  {t('newsletter.button')}
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6 mt-8 text-white/70 text-sm"
          >
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-white" />
              {t('newsletter.features.exclusive')}
            </span>
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-white" />
              {t('newsletter.features.weekly')}
            </span>
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-white" />
              {t('newsletter.features.noSpam')}
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
