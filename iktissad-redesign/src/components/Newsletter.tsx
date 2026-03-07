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
                className="w-full px-6 py-4 pr-14 bg-white/5 border border-gold/20 text-white font-[family-name:var(--font-display)] placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-colors"
                required
              />
              <Mail className="absolute right-5 top-1/2 -translate-y-1/2 text-gold/50" size={20} />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitted}
              className={`px-8 py-4 font-[family-name:var(--font-display)] font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                isSubmitted
                  ? 'bg-profit text-white'
                  : 'bg-gold text-obsidian hover:bg-gold-light'
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
